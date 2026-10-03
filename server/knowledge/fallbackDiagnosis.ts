import { describeSource, type KnowledgeChunk } from './retriever';
import type { RetrievalContext } from './scope';

/** Without a model service, report retrieved evidence instead of synthesizing a diagnosis. */
export function generateLocalKnowledgeReply(
  query: string,
  retrieved: KnowledgeChunk[],
  opts: RetrievalContext = {},
): string {
  const machineDesc = [opts.machineType, opts.brand, opts.model].filter(Boolean).join(' ') || '农机设备';
  const primary = retrieved[0];

  if (!primary) {
    return `**【故障现象分析】**
收到关于「${machineDesc}」的咨询：“${query}”。

**【当前资料不足】**
未检索到与问题及已知机型相符的知识条目，不能据此确定原因或提供操作参数。请补充品牌、完整型号、出厂配置／版本、故障代码、发生工况及伴随现象，并核对对应原厂手册。

**【安全提醒】**
故障原因未确认前不要继续危险作业、绕过安全装置或盲目拆修。电动／无人机型请按本机安全规程处理，并联系具备相应资质的维修人员。`;
  }

  const scopeNotice = primary.entryId
    ? primary.applicability === 'matched'
      ? '已找到对应品牌／型号的资料；市场、配置和手册版本仍需确认。下面是来源事实摘录，不代表已确诊。'
      : '已找到该品牌／系列的参考资料，具体车辆适用性待核实。不能直接套用操作步骤或参数。'
    : '仅命中通用示例资料，不能据此确认具体机型的维修参数或保养周期。';
  const background = ['机型资料', '资料缺口', '资料索引', '资料核验', '系统适用边界'].includes(primary.entryType ?? '');

  // Show the best matching entry intact so its safety conditions and evidence stay together.
  return `**【故障现象分析】**
针对「${machineDesc}」的咨询：“${query}”。

**【${background ? '来源与适用信息' : '初步判断'}】**
${scopeNotice}${background ? '该资料仅用于来源、适用范围或资料缺口说明，不是操作／维修依据。' : ''}

**【检索到的知识】**
### ${primary.heading}
${primary.text}

**【知识依据】**
${describeSource(primary)}

**【当前资料不足】**
请确认完整机型、市场、配置和原手册版本；条目中的待核实内容不能用其他品牌或相近机型补齐。${background ? '来源索引、封面核验或报道摘要不构成已审核的操作／维修步骤；请查本机匹配原件及具体章节。' : '故障表中的可能原因需要检测验证，不能据单一症状决定换件。'}

**【安全提醒】**
遵守本机手册的停机与安全隔离规程；不要绕过安全联锁、带压拆修或在悬空机具下作业。高温、高压、电池高压和无人作业相关检查应交具备相应资质的人员处理。`;
}
