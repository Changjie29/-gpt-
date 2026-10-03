#!/usr/bin/env python3
"""Read-only archive checks; optional report and temporary external PDF proofs."""
import argparse
import collections
import datetime
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
from urllib.parse import urlparse

ENTRY_TYPES = {
    '维护/故障知识', '操作/维护知识', '安全操作', '系统安装/调试',
    '系统适用边界', '资料索引', '资料核验', '机型资料', '资料缺口',
}
REPO = Path(__file__).resolve().parents[2]
INDEX = REPO / '知识库/整理后的知识库/农用拖拉机知识库'


def digest(path):
    result = hashlib.sha256()
    with path.open('rb') as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b''):
            result.update(block)
    return result.hexdigest()


def page_count(path):
    if shutil.which('pdfinfo'):
        result = subprocess.run(['pdfinfo', str(path)], check=True,
                                capture_output=True, text=True, timeout=30)
        match = re.search(r'^Pages:\s*(\d+)\s*$', result.stdout, re.M)
        if not match:
            raise ValueError('pdfinfo未返回页数')
        return int(match[1])
    try:
        import fitz
    except ImportError as error:
        raise RuntimeError('核对PDF页数需要pdfinfo（Poppler）或PyMuPDF') from error
    with fitz.open(path) as document:
        document.load_page(document.page_count - 1)
        return document.page_count


def cited_pages(text):
    pages = set()
    for match in re.finditer(r'PDF\s*(?:物理)?\s*第?\s*([0-9][0-9\s、,，～~至\-–—/]*)\s*页', text, re.I):
        for part in re.split(r'[、,，/]', match[1]):
            values = [int(value) for value in re.findall(r'\d+', part)]
            if len(values) == 2 and re.search(r'[～~至\-–—]', part):
                if not 0 <= values[1] - values[0] <= 1000:
                    raise ValueError('证据页范围无效')
                pages.update(range(values[0], values[1] + 1))
            else:
                pages.update(values)
    return sorted(pages)


def main():
    parser = argparse.ArgumentParser(description='检查来源、条目、标题和证据范围；不修改索引或下载文件')
    parser.add_argument('--report', type=Path, help='可选JSON报告路径')
    parser.add_argument('--external-pdf', action='append', default=[], metavar='SOURCE_ID=PATH',
                        help='核对仅存链接资料的临时PDF，可重复传入')
    args = parser.parse_args()
    errors, notes, checked = [], [], []

    def require_strings(value, fields, label):
        if not isinstance(value, dict):
            raise ValueError(f'{label}必须是对象')
        for field in fields:
            if not isinstance(value.get(field), str) or not value[field].strip():
                raise ValueError(f'{label}.{field}缺少非空字符串')

    def resolved(relative, area):
        if Path(relative).is_absolute():
            raise ValueError('索引路径须为仓库相对路径')
        path = (REPO / relative).resolve()
        if not path.is_relative_to(area.resolve()) or not path.is_file():
            raise ValueError(f'路径不存在或超出资料目录：{relative}')
        return path

    proofs = {}
    for value in args.external_pdf:
        identity, separator, path = value.partition('=')
        if not separator or not identity or not path or identity in proofs:
            parser.error('--external-pdf须为唯一SOURCE_ID=PATH')
        proofs[identity] = Path(path).resolve()
    sources = json.loads((INDEX / 'sources.json').read_text('utf8'))
    if not isinstance(sources, list):
        raise ValueError('sources.json必须是数组')
    entries = [json.loads(line) for line in (INDEX / 'entries.jsonl').read_text('utf8').splitlines() if line.strip()]
    source_map, page_counts = {}, {}
    retained_pdfs, external_pdfs = 0, 0
    for source in sources:
        label = source.get('source_id', '未知来源') if isinstance(source, dict) else '未知来源'
        try:
            require_strings(source, ['source_id', 'brand', 'model', 'path', 'url', 'version', 'scope_boundary', 'sha256'], label)
            if label in source_map:
                raise ValueError('来源编号重复')
            source_map[label] = source
            if not re.fullmatch(r'[A-Z0-9][A-Z0-9-]*', label):
                raise ValueError('来源编号格式无效')
            url = urlparse(source['url'])
            if url.scheme not in ['http', 'https'] or not url.netloc:
                raise ValueError('来源网址须为完整HTTP(S)链接')
            if source.get('emission_stage') not in [None, '国三', '国四']:
                raise ValueError('排放阶段无效')
            if 'models' in source and (not isinstance(source['models'], list) or not source['models'] or
                                      any(not isinstance(model, str) or not model.strip() for model in source['models'])):
                raise ValueError('精确型号列表无效')
            path = resolved(source['path'], REPO / '知识库/原始农机说明书')
            if not re.fullmatch(r'[a-f0-9]{64}', source['sha256']) or digest(path) != source['sha256']:
                raise ValueError('本地文件SHA256不符')
            if type(source.get('bytes')) is not int or path.stat().st_size != source['bytes']:
                raise ValueError('本地文件字节数不符')
            result = {'source_id': label, 'path': source['path'], 'sha256_matches': True,
                      'bytes_matches': True, 'actual_bytes': path.stat().st_size}
            if source.get('storage_type') == 'link_and_source_record':
                external_pdfs += 1
                if path.suffix != '.md':
                    raise ValueError('来源记录模式须指向Markdown记录')
                for field in ['manual_bytes', 'manual_pdf_pages']:
                    if type(source.get(field)) is not int or source[field] <= 0:
                        raise ValueError(f'{field}缺少原件完整性记录')
                if not re.fullmatch(r'[a-f0-9]{64}', source.get('manual_sha256', '')):
                    raise ValueError('缺少PDF原件哈希')
                page_counts[label] = source['manual_pdf_pages']
                result['referenced_pdf_pages'] = source['manual_pdf_pages']
                result['manual_sha256'] = source['manual_sha256']
                if label in proofs:
                    proof = proofs[label]
                    if digest(proof) != source['manual_sha256'] or proof.stat().st_size != source['manual_bytes']:
                        raise ValueError('临时PDF原件哈希或字节数不符')
                    if page_count(proof) != source['manual_pdf_pages']:
                        raise ValueError('临时PDF原件页数不符')
                    result['external_pdf_verified'] = True
                else:
                    result['external_pdf_verified'] = False
                    notes.append(f'{label}：本次只核对本地来源记录，未重新取得外链PDF；采用取得时登记的原件哈希/页数')
            elif path.suffix.lower() == '.pdf':
                retained_pdfs += 1
                actual = page_count(path)
                if source.get('pdf_pages') != actual:
                    raise ValueError('PDF页数不符')
                page_counts[label] = actual
                result['pdf_pages'] = actual
            pages = source.get('verified_pdf_pages', {})
            if not isinstance(pages, dict) or any(not isinstance(value, str) or not value.strip() for value in pages.values()):
                raise ValueError('已核对证据页须为页号到说明的对象')
            if label in page_counts:
                for key in pages:
                    numbers = cited_pages(f'PDF第{key}页')
                    if not numbers or any(number < 1 or number > page_counts[label] for number in numbers):
                        raise ValueError(f'已核对页越界：{key}')
            checked.append(result)
        except (ValueError, OSError, RuntimeError, subprocess.SubprocessError) as error:
            errors.append(f'{label}：{error}')
    for identity in proofs:
        if identity not in source_map or source_map[identity].get('storage_type') != 'link_and_source_record':
            errors.append(f'临时PDF没有对应的链接来源：{identity}')

    ids, documents, kinds = set(), {}, collections.Counter()
    for entry in entries:
        label = entry.get('entry_id', '未知条目') if isinstance(entry, dict) else '未知条目'
        try:
            require_strings(entry, ['entry_id', 'source_id', 'brand', 'model', 'title', 'knowledge_path', 'locator', 'status', 'entry_type'], label)
            if label in ids or not re.fullmatch(r'[A-Z0-9][A-Z0-9-]*', label):
                raise ValueError('条目编号重复或格式无效')
            ids.add(label)
            if entry['entry_type'] not in ENTRY_TYPES:
                raise ValueError('条目类别无效')
            kinds[entry['entry_type']] += 1
            source = source_map.get(entry['source_id'])
            if not source or entry['brand'] != source['brand']:
                raise ValueError('来源不存在或品牌不一致')
            if entry.get('emission_stage') not in [None, '国三', '国四']:
                raise ValueError('条目排放条件无效')
            if entry.get('emission_stage') and source.get('emission_stage') and entry['emission_stage'] != source['emission_stage']:
                raise ValueError('条目与来源的排放阶段冲突')
            path = resolved(entry['knowledge_path'], REPO / '知识库/整理后的知识库')
            if path.suffix != '.md' or path.name in ['README.md', '待补资料.md'] or '采集记录' in path.parts:
                raise ValueError('条目须指向正式知识卡')
            if path not in documents:
                sections = {}
                for match in re.finditer(r'^##\s+([^\r\n]+)\r?\n([\s\S]*?)(?=^##\s+|\Z)', path.read_text('utf8'), re.M):
                    key = match[1].split('｜')[0].strip()
                    if key in sections:
                        raise ValueError(f'Markdown标题键重复：{key}')
                    sections[key] = (match[1].strip(), match[2].strip())
                documents[path] = sections
            heading, body = documents[path].get(label, ('', ''))
            if heading != f"{label}｜{entry['title']}" or not body:
                raise ValueError('Markdown编号/标题/正文缺失或不一致')
            if entry['source_id'] not in body:
                raise ValueError('正文没有来源编号')
            if entry['source_id'] in page_counts:
                pages = cited_pages(entry['locator'])
                if not pages or any(page < 1 or page > page_counts[entry['source_id']] for page in pages):
                    raise ValueError('PDF证据页缺失或越界')
        except (ValueError, OSError) as error:
            errors.append(f'{label}：{error}')

    report = {
        'generated_at_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'scope': '文件/来源/编号/标题/证据范围校验；不等于全文事实审校、厂家确认或实车验证',
        'summary': {'sources': len(sources), 'entries': len(entries), 'knowledge_documents': len(documents),
                    'retained_pdf_files': retained_pdfs, 'link_only_pdf_sources': external_pdfs,
                    'entry_types': dict(kinds), 'errors': len(errors)},
        'sources': checked, 'errors': errors, 'notes': notes,
    }
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', 'utf8')
    print(json.dumps(report['summary'], ensure_ascii=False))
    for message in errors + notes:
        print(message)
    return 1 if errors else 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (ValueError, OSError) as error:
        print(f'校验失败：{error}', file=sys.stderr)
        sys.exit(1)
