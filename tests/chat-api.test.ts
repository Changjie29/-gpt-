import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, test } from 'node:test';

// Keep this suite local even when the developer has configured model credentials.
process.env.NODE_ENV = 'test';
process.env.GEMINI_API_KEY = '';
process.env.DEEPSEEK_API_KEY = '';

const { default: app } = await import('../server/index');
let server: http.Server;
let port: number;

interface ChatResponse {
  code?: string;
  provider?: string;
  knowledgeChunks?: number;
  choices?: { message: { role: string; content: string } }[];
}

const identity = { machineType: '拖拉机', brand: '纽荷兰', model: 'WORKMASTER25' };
const messages = [{ role: 'user', content: '钥匙在 START，启动电机不转' }];

before(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  port = address.port;
});

after(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});

function chat(body: unknown): Promise<{ status: number; body: ChatResponse }> {
  const payload = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const request = http.request({
      hostname: '127.0.0.1',
      port,
      path: '/api/chat',
      method: 'POST',
      agent: false,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (response) => {
      let output = '';
      response.setEncoding('utf8');
      response.on('data', (chunk: string) => { output += chunk; });
      response.on('error', reject);
      response.on('end', () => {
        try {
          resolve({ status: response.statusCode ?? 0, body: JSON.parse(output) as ChatResponse });
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on('error', reject);
    request.end(payload);
  });
}

test('rejects malformed optional machine identity fields as bad requests', async () => {
  for (const field of ['machineType', 'brand', 'model']) {
    for (const value of [123, null, {}, 'x'.repeat(101)]) {
      const response = await chat({ messages, ...identity, [field]: value });
      assert.equal(response.status, 400, `${field}: ${JSON.stringify(value)}`);
      assert.equal(response.body.code, 'bad_request');
    }
  }
});

test('rejects non-object JSON bodies with a JSON bad-request response', async () => {
  for (const body of [null, [], 123, 'request']) {
    const response = await chat(body);
    assert.equal(response.status, 400);
    assert.equal(response.body.code, 'bad_request');
  }
});

test('the chat API returns archived facts with source IDs, page references and applicability limits', async () => {
  const response = await chat({ messages, ...identity });
  assert.equal(response.status, 200);
  assert.equal(response.body.provider, 'knowledge-base');
  assert.ok(response.body.knowledgeChunks && response.body.knowledgeChunks > 0);
  const reply = response.body.choices?.[0]?.message.content;
  assert.ok(reply);
  assert.match(reply, /NH-WM25-003/);
  assert.match(reply, /SRC-NH-WM25-92157408/);
  assert.match(reply, /PDF 第 175 页/);
  assert.match(reply, /不适用于.*25S/);
  assert.match(reply, /启动联锁条件未满足/);
});

test('source-rich local replies remain usable as assistant history in the next turn', async () => {
  const query = '已记录日常工况。'.repeat(150) + '请查看保养周期';
  assert.ok(query.length < 2000);
  const first = await chat({ ...identity, messages: [{ role: 'user', content: query }] });
  assert.equal(first.status, 200);
  const reply = first.body.choices?.[0]?.message.content;
  assert.ok(reply && reply.length > 2000 && reply.length <= 16_000);

  const next = await chat({
    ...identity,
    messages: [
      { role: 'user', content: query },
      { role: 'assistant', content: reply },
      ...messages,
    ],
  });
  assert.equal(next.status, 200);
  assert.match(next.body.choices?.[0]?.message.content ?? '', /NH-WM25-003/);
});

test('user and system messages keep their 2000-character limit and assistant history remains bounded', async () => {
  for (const role of ['user', 'system']) {
    const response = await chat({ messages: [{ role, content: 'x'.repeat(2001) }] });
    assert.equal(response.status, 400);
    assert.equal(response.body.code, 'too_long');
  }
  const response = await chat({ messages: [{ role: 'assistant', content: 'x'.repeat(16_001) }, ...messages] });
  assert.equal(response.status, 400);
  assert.equal(response.body.code, 'too_long');
});
