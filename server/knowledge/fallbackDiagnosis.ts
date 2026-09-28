import type { KnowledgeChunk } from './retriever';

interface FallbackOptions {
  machineType?: string;
  brand?: string;
  model?: string;
}

/**
 * 当未配置外部 LLM API Key 或网络暂时不可达时，
 * 基于本地知识库命中的 RAG 片段直接生成结构化诊断建议，
 * 确保农机诊断平台的开箱即用与核心业务连续性。
 */
export function generateLocalKnowledgeReply(
  query: string,
  retrieved: KnowledgeChunk[],
  opts: FallbackOptions = {},
): string {
  const machineDesc = [opts.machineType, opts.brand, opts.model].filter(Boolean).join(' ') || '农机设备';

  if (retrieved.length === 0) {
    return `**【故障现象分析】**
收到关于「${machineDesc}」的咨询：“${query}”。当前通用农机知识库中暂未检索到直接匹配的专属故障条目。

**【初步判断】**
暂不能确切判断具体单一部件故障，需依据农机“油、电、气、液”四大基础系统进行常规巡检。

**【可能原因】**
1. 控制电路或供电电压异常（保险丝熔断、蓄电池亏电、接插件松动）。
2. 油路或气路滤清器阻力过大（空滤积尘、燃油滤芯杂质堵塞）。
3. 执行机构或传动部件机械卡滞、磨损超限。

**【建议排查】**
1. **基础外观检查**：检查全车线束插头是否牢固，有无破损打火痕迹；检查仪表盘是否闪烁特定故障报警灯。
2. **油液与滤芯**：拔出机油尺检查机油液位与黏度；检查燃油箱油量及粗/细滤器沉淀杯有无水分杂质。
3. **补充故障细节**：为获得更精准的诊断，请补充具体农机机型、工况出现时间（冷车/热车/带负荷）、是否有明显异响或异味。

**【知识依据】**
通用农机常规运行与保养规范

**【安全提醒】**
进行任何检修或探入机械内部前，必须**彻底熄火停机、拔下钥匙、拉紧驻车制动**，升起的农具必须降落至地面或加装机械安全锁止垫块！`;
  }

  // 命中知识库片段，结合首要片段解析可能原因和处理步骤
  const primaryChunk = retrieved[0];
  const sources = retrieved.map((c) => `- \`${c.source}\` (${c.heading})`).join('\n');

  // 从知识库正文中提取条目
  const lines = primaryChunk.text.split('\n');
  const possibleCauses: string[] = [];
  const suggestions: string[] = [];
  let inCauses = false;
  let inSteps = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.includes('可能原因') || trimmed.includes('原因')) {
      inCauses = true;
      inSteps = false;
      continue;
    }
    if (trimmed.includes('处理') || trimmed.includes('排查') || trimmed.includes('步骤')) {
      inSteps = true;
      inCauses = false;
      continue;
    }
    if (trimmed.includes('注意') || trimmed.includes('现象') || trimmed.startsWith('##')) {
      inCauses = false;
      inSteps = false;
      continue;
    }

    if (inCauses && /^\d+[.、]/.test(trimmed)) {
      possibleCauses.push(trimmed.replace(/^\d+[.、]\s*/, ''));
    } else if (inSteps && /^\d+[.、]/.test(trimmed)) {
      suggestions.push(trimmed.replace(/^\d+[.、]\s*/, ''));
    }
  }

  const causesText =
    possibleCauses.length > 0
      ? possibleCauses.slice(0, 4).map((c, i) => `${i + 1}. ${c}`).join('\n')
      : `1. 对应功能部件磨损、老化或密封失效。\n2. 供油、供电或液压回路压力异常。\n3. 滤清器堵塞或油液品质不达标。`;

  const suggestionsText =
    suggestions.length > 0
      ? suggestions.slice(0, 4).map((s, i) => `${i + 1}. ${s}`).join('\n')
      : `1. **停机巡检**：熄火停机后，首先检查对应管路、接头及外表面有无渗漏或破损。\n2. **检查介质状态**：检查相关油液（机油/液压油/防冻液）液位、颜色及是否混入杂质。\n3. **清洁与测试**：清理堵塞滤芯，必要时使用专用测试表测量系统工作压力。`;

  return `**【故障现象分析】**
针对「${machineDesc}」反映的现象：“${query}”，系统已结合本地农机维修专家知识库【${primaryChunk.heading}】完成知识对齐与推理。

**【初步判断】**
疑似属于【${primaryChunk.heading}】相关故障，建议按“先简后繁、先外后内”的标准化维修流程排查。

**【可能原因】**
${causesText}

**【建议排查】**
${suggestionsText}

**【知识依据】**
${sources}

**【安全提醒】**
⚠️ **作业前安全确认**：
1. 涉及水箱开锅或冷却系统排查时，**切勿在发动机高温高压状态下立即拧开散热器盖**，防止高温沸水喷溅烫伤！
2. 涉及旋转部件（风扇、皮带、动力输出轴PTO）检修时，必须确保发动机完全熄火并拔除钥匙。
3. 液压管路检修前须完全释放蓄能器及管路内部残压，切勿用手直接封堵高压油孔。`;
}
