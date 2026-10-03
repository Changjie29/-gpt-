import assert from 'node:assert/strict';
import fs from 'node:fs';
import { before, test } from 'node:test';
import {
  formatForPrompt,
  loadKnowledgeBase,
  retrieve,
  stats,
  type KnowledgeChunk,
} from '../server/knowledge/retriever';
import { buildSystemPrompt } from '../server/knowledge/systemPrompt';
import { generateLocalKnowledgeReply } from '../server/knowledge/fallbackDiagnosis';

const tractor = { machineType: '拖拉机' };
const workmaster = { ...tractor, brand: '纽荷兰', model: 'WORKMASTER25' };
const startQuery = '钥匙在 START，启动电机不转';

function archived(chunks: KnowledgeChunk[]) {
  return chunks.filter((chunk) => chunk.entryId);
}

function expectEntry(chunks: KnowledgeChunk[], entryId: string): KnowledgeChunk {
  const chunk = chunks.find((item) => item.entryId === entryId);
  assert.ok(chunk, `Expected archived entry ${entryId}; received ${chunks.map((item) => item.entryId ?? item.heading).join(', ')}`);
  return chunk;
}

before(() => {
  loadKnowledgeBase();
});

test('indexes each archived entry exactly once and preserves the 9 existing chunks', () => {
  const indexed = fs.readFileSync('知识库/整理后的知识库/农用拖拉机知识库/entries.jsonl', 'utf8')
    .trim().split(/\r?\n/).map((line) => JSON.parse(line) as {
      entry_id: string; source_id: string; title: string; brand: string; model: string;
    });
  const sources = JSON.parse(fs.readFileSync('知识库/整理后的知识库/农用拖拉机知识库/sources.json', 'utf8')) as {
    source_id: string; models?: string[];
  }[];
  const sourceModels = new Map(sources.map((source) => [source.source_id, source.models]));
  assert.equal(stats().archivedEntries, indexed.length);
  assert.equal(stats().chunks, indexed.length + 9);
  const entries = indexed.map(({ entry_id, source_id, title, brand, model }) => {
    const exactModel = sourceModels.get(source_id)?.[0] ?? model;
    const found = retrieve(title, indexed.length, { ...tractor, brand, model: exactModel });
    const chunk = expectEntry(found, entry_id);
    assert.ok(chunk.sourceId);
    assert.ok(chunk.sourceUrl);
    assert.ok(chunk.originalPath);
    assert.ok(chunk.locator);
    assert.ok(chunk.version);
    assert.ok(chunk.scopeBoundary);
    assert.ok(chunk.status);
    return chunk.entryId;
  });
  assert.equal(new Set(entries).size, indexed.length);
});

test('source model lists select only an exact documented John Deere configuration', () => {
  const entryId = 'KB-JD-6E-G4-OMTR115296-004';
  for (const brand of ['约翰迪尔', 'John Deere']) {
    const context = { ...tractor, brand, model: '6E-1204(G4)' };
    const found = retrieve('不能起动应先区分起动机是否转动', 100, context);
    const chunk = expectEntry(found, entryId);
    assert.equal(chunk.sourceId, 'SRC-JD-6E-G4-OMTR115296');
    assert.equal(chunk.applicability, 'matched');
    expectEntry(retrieve(`${brand} 6E-1204(G4) 不能起动`), entryId);
  }
  for (const model of ['6E-1204', '6E-1204(G3)', '6E-1204(G5)', '6E-1204-X(G4)', '6E-1604(G4)']) {
    assert.equal(retrieve('不能起动', 100, { ...tractor, brand: '约翰迪尔', model }).length, 0, model);
    assert.equal(retrieve(`John Deere ${model} 不能起动`, 100).length, 0, model);
  }
  assert.equal(retrieve('John Deere 6E-1204(G4) 量子纠缠').length, 0);
});

test('new brand aliases and source-declared model families remain distinct', () => {
  expectEntry(retrieve('原件与适用范围', 100, { ...tractor, brand: 'YTO', model: 'LF804S' }), 'KB-YTO-LF-MANUAL-001');
  expectEntry(retrieve('YTO LF804S 原件与适用范围', 100), 'KB-YTO-LF-MANUAL-001');
  expectEntry(retrieve('原件与适用范围', 100, { ...tractor, brand: 'Weitai', model: 'TT804(G4)' }), 'KB-WT-TRACTOR-MANUAL-001');
  assert.equal(retrieve('原件与适用范围', 100, { ...tractor, brand: 'Weitai', model: 'TT804(G5)' }).length, 0);
  assert.equal(retrieve('原件与适用范围', 100, { ...tractor, brand: '久保田', model: 'LF804S' }).length, 0);
  expectEntry(retrieve('原件与适用范围', 100, { ...tractor, brand: 'Lovol', model: 'TX平台' }), 'KB-LV-TX-TRAINING-001');
});

test('navigation-system aliases do not establish equivalence to conflicting model fields or whole tractors', () => {
  const entryId = 'KB-QX-QY210PRO-V01-003';
  for (const brand of ['千寻位置', '千耘']) {
    expectEntry(retrieve('未定位与交接垄不准', 100, { ...tractor, brand, model: 'QY210Pro' }), entryId);
    expectEntry(retrieve(`${brand} QY210 Pro 未定位与交接垄不准`, 100), entryId);
  }
  assert.equal(retrieve('未定位与交接垄不准', 100, { ...tractor, brand: '千耘', model: 'QYBD-2.5GD' }).length, 0);
  assert.equal(retrieve('千耘 QYBD-2.5GD 未定位与交接垄不准', 100).length, 0);
  assert.equal(retrieve('未定位与交接垄不准', 100, { ...tractor, brand: '鸿鹄', model: 'QY210Pro' }).length, 0);
});

test('researched domestic brands without applicable entries return insufficient knowledge', () => {
  for (const brand of ['常发', 'Changfa', '沃得', '悍沃', '黄海金马', '金马', 'Jinma', '时风', 'Shifeng']) {
    const query = `${brand} 发动机水温过高`;
    assert.equal(retrieve(query, 100, tractor).length, 0, brand);
    assert.equal(retrieve('发动机水温过高', 100, { ...tractor, brand }).length, 0, brand);
    assert.match(generateLocalKnowledgeReply(query, [], { ...tractor, brand }), /资料不足/);
  }
});

test('LF1504 emission evidence is preserved and a national-four query cannot reuse its national-three manual', () => {
  const context = { ...tractor, brand: '东方红', model: 'LF1504' };
  const entry = expectEntry(retrieve('起动机不转与转动无力', 100, context), 'KB-YTO-LF1504-007');
  assert.equal(entry.emissionStage, '国三');
  expectEntry(retrieve('东方红 LF1504 国三 起动机不转', 100), 'KB-YTO-LF1504-007');
  assert.equal(retrieve('东方红 LF1504 国四 起动机不转', 100).length, 0);
  assert.equal(retrieve('国四 起动机不转', 100, context).length, 0);
  assert.equal(retrieve('起动机不转', 100, { ...context, model: 'LF1504(G4)' }).length, 0);
  assert.equal(retrieve('国三 不能起动', 100, { ...tractor, brand: '约翰迪尔', model: '6E-1204(G4)' }).length, 0);
});

test('ranks a model-specific starting fault ahead of the generic sample', () => {
  const found = retrieve(startQuery, 6, workmaster);
  assert.equal(found[0]?.entryId, 'NH-WM25-003');
  assert.ok(found.every((chunk) => chunk.entryId?.startsWith('NH-WM25-')));
  assert.equal(expectEntry(found, 'NH-WM25-003').applicability, 'matched');
});

test('finds representative steering, storage and autonomous-operation entries', () => {
  const wobble = retrieve('前轮摆动', 6, { ...tractor, brand: '雷沃', model: '欧豹TG系列' });
  assert.equal(wobble[0]?.entryId, 'LV-TG-002');
  const storage = retrieve('冬季长期存放的防锈与封护', 6, { ...tractor, brand: '东风' });
  assert.equal(storage[0]?.entryId, 'DF-WINTER-001');
  assert.equal(storage[0]?.applicability, 'pending');
  const lostLink = retrieve('无人作业失联，定位失效', 6, { ...tractor, brand: '鸿鹄', model: 'T70' });
  assert.equal(lostLink[0]?.entryId, 'HH-T70-002');
});

test('accepts supported model aliases in context and in a recognizable query', () => {
  for (const model of ['WORKMASTER 25', 'WORKMASTER25']) {
    expectEntry(retrieve(startQuery, 6, { ...workmaster, model }), 'NH-WM25-003');
    expectEntry(retrieve(`纽荷兰 ${model} ${startQuery}`), 'NH-WM25-003');
  }
  for (const model of ['LX2620', 'LX2620SU', 'LX2620/LX2620SU', 'LX2620-LX2620SU']) {
    expectEntry(retrieve('发动机启动困难', 6, { ...tractor, brand: '久保田', model }), 'KB-LX2620-003');
    expectEntry(retrieve(`久保田 ${model} 发动机启动困难`), 'KB-LX2620-003');
  }
  for (const model of ['欧豹TG', 'TG系列']) {
    expectEntry(retrieve('前轮摆动', 6, { ...tractor, brand: '雷沃', model }), 'LV-TG-002');
    expectEntry(retrieve(`雷沃 ${model} 前轮摆动`), 'LV-TG-002');
  }
  expectEntry(retrieve('中联 PL系列 发动机无法启动'), 'ZL-PL-003');
  expectEntry(retrieve('鸿鹄 T70 无人作业失联'), 'HH-T70-002');
  expectEntry(retrieve('雷沃 国三 发动机电气接头与传感器'), 'LV-NR3-001');
});

test('does not apply WORKMASTER25 entries to WORKMASTER25S or an unsupported model', () => {
  for (const model of ['WORKMASTER25S', 'WORKMASTER 25S', 'WORKMASTER35']) {
    assert.equal(archived(retrieve(startQuery, 100, { ...workmaster, model })).length, 0, model);
    assert.equal(archived(retrieve(`纽荷兰 ${model} ${startQuery}`, 100)).length, 0, model);
  }
});

test('explicit machine identity prevents cross-brand and cross-model retrieval', () => {
  const kubota = retrieve('纽荷兰 WORKMASTER25 发动机过热', 100, {
    ...tractor, brand: '久保田', model: 'LX2620',
  });
  assert.ok(archived(kubota).length > 0);
  assert.ok(archived(kubota).every((chunk) => chunk.sourceId === 'SRC-KB-LX2620-6C82063118'));

  const tg = retrieve('雷沃 国三 发动机电气接头与传感器', 100, {
    ...tractor, brand: '雷沃', model: '欧豹TG系列',
  });
  assert.ok(archived(tg).every((chunk) => chunk.entryId?.startsWith('LV-TG-')));
  const conflictingBrand = retrieve('久保田 LX2620 发动机过热', 100, {
    ...tractor, brand: '纽荷兰',
  });
  assert.ok(archived(conflictingBrand).every((chunk) => chunk.brand === '纽荷兰'));
});

test('unidentified equipment and non-tractor equipment do not receive tractor archive entries', () => {
  assert.equal(archived(retrieve('发动机无法启动', 100)).length, 0);
  for (const machineType of ['联合收割机', '插秧机', '植保机']) {
    const found = retrieve(`纽荷兰 WORKMASTER25 ${startQuery}`, 100, { ...workmaster, machineType });
    assert.equal(archived(found).length, 0, machineType);
  }
});

test('declared electric equipment cannot receive incompatible diesel tractor archive instructions', () => {
  for (const machineType of ['新能源农机', 'New-energy']) {
    assert.equal(retrieve('发动机不着火', 100, { ...workmaster, machineType }).length, 0);
  }
  expectEntry(retrieve('无人作业失联', 6, { machineType: '无人农机', brand: '鸿鹄', model: 'T70' }), 'HH-T70-002');
});

test('model/source identifiers alone cannot turn an undocumented question into a knowledge hit', () => {
  for (const query of ['久保田 LX2620 量子纠缠', '纽荷兰 WORKMASTER 25 量子纠缠']) {
    assert.equal(retrieve(query).length, 0, query);
  }
  assert.equal(retrieve('量子纠缠', 6, workmaster).length, 0);
  assert.equal(retrieve('发动机过热', 6, { ...tractor, brand: '久保田', model: 'LX9999' }).length, 0);
});

test('retains source identifiers, original document location and applicability boundaries in the prompt', () => {
  const { message, retrieved } = buildSystemPrompt({ query: startQuery, ...workmaster });
  const chunk = expectEntry(retrieved, 'NH-WM25-003');
  assert.equal(chunk.sourceId, 'SRC-NH-WM25-92157408');
  assert.match(chunk.locator ?? '', /175/);
  assert.match(chunk.scopeBoundary ?? '', /25S/);
  for (const content of [formatForPrompt([chunk]), message.content]) {
    assert.equal(typeof content, 'string');
    for (const value of [chunk.entryId, chunk.sourceId, chunk.originalPath, chunk.locator, chunk.scopeBoundary]) {
      assert.ok(value && content.includes(value), `Missing source metadata: ${value}`);
    }
  }
});

test('the local archived reply quotes supported facts and source boundaries without inventing a diagnosis', () => {
  const chunks = retrieve(startQuery, 6, workmaster);
  const chunk = expectEntry(chunks, 'NH-WM25-003');
  const reply = generateLocalKnowledgeReply(startQuery, chunks, workmaster);
  assert.match(reply, /启动联锁条件未满足/);
  assert.match(reply, /不得向 HST 用户统一要求/);
  for (const value of [chunk.entryId, chunk.sourceId, chunk.originalPath, chunk.locator, chunk.scopeBoundary]) {
    assert.ok(value && reply.includes(value), `Missing local reply metadata: ${value}`);
  }
  assert.doesNotMatch(reply, /完成知识对齐与推理|疑似属于|对应功能部件磨损、老化或密封失效|供油、供电或液压回路压力异常|滤清器堵塞或油液品质不达标/);
});

test('information-only archive hits explain provenance without presenting maintenance guidance', () => {
  const cases = [
    {
      entryId: 'KB-LV-TX-TRAINING-001',
      query: '交机培训手册原件与适用范围',
      context: { ...tractor, brand: '雷沃', model: 'TX平台' },
    },
    {
      entryId: 'KB-BARB-HYDROTRAC-4HWD-001',
      query: '封面机型、发行日期与适用范围',
      context: { ...tractor, brand: 'Barbieri', model: 'HydroTRAC 4HWD' },
    },
  ];
  for (const { entryId, query, context } of cases) {
    const found = retrieve(query, 100, context);
    assert.equal(found[0]?.entryId, entryId);
    const reply = generateLocalKnowledgeReply(query, found, context);
    assert.match(reply, /【来源与适用信息】/);
    assert.match(reply, /不是操作／维修依据/);
    assert.ok(reply.includes(entryId));
    assert.ok(found[0].scopeBoundary && reply.includes(found[0].scopeBoundary));
    assert.doesNotMatch(reply, /【初步判断】|【可能原因】|【建议排查】|故障表中的可能原因需要检测验证|尚缺正式操作／维修手册/);
  }
});

test('T70 material remains background information and never produces diesel repair instructions', () => {
  const context = { ...tractor, brand: '鸿鹄', model: 'T70' };
  const query = '无人作业失联，定位失效';
  const { message, retrieved } = buildSystemPrompt({ query, ...context });
  const chunk = expectEntry(retrieved, 'HH-T70-002');
  const reply = generateLocalKnowledgeReply(query, retrieved, context);
  assert.match(reply, /尚未取得急停、失联、定位失效、电池高压/);
  assert.match(reply, /不得用普通柴油机启动\/充电流程替代/);
  assert.match(message.content, /仅用于机型识别及应用背景/);
  assert.ok(chunk.scopeBoundary && reply.includes(chunk.scopeBoundary));
  assert.doesNotMatch(reply, /拔出机油尺|柴油滤芯|喷油泵|检查燃油箱油量|疑似属于|测量系统工作压力/);
});

test('reloading the index is idempotent and the original generic retrieval remains available', () => {
  const initial = stats();
  const first = loadKnowledgeBase();
  const second = loadKnowledgeBase();
  assert.deepEqual(first, second);
  assert.deepEqual(stats(), initial);
  const found = retrieve('发动机水温过高开锅');
  assert.ok(found.some((chunk) => chunk.source === '01_通用原理/通用故障诊断.md' && chunk.heading.includes('水温过高')));
  assert.equal(archived(found).length, 0);
  assert.ok(found.length <= 6);
});
