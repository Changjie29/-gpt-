// 首页静态文案（中英双语）
// 原则：只宣传真实已实现的能力；规划中的能力必须明确标注"规划中 / Planned"。

export type Lang = 'zh' | 'en';

const content = {
  HERO: {
    eyebrow: {
      zh: '本地知识库 · LLM 推理 · 可解释诊断',
      en: 'Local KB · LLM Reasoning · Explainable Diagnostics',
    },
    title1: { zh: '让农机', en: 'Intelligence for' },
    titleHighlight: { zh: '诊断更简单', en: 'Agricultural' },
    title2: { zh: '让作业更安心', en: 'Machinery' },
    desc: {
      zh: '司农智机，来自南京农业大学的农机智能诊断助手。把本地维修资料与大语言模型结合起来，帮助你理清故障原因、排查步骤和安全建议。',
      en: 'Sinong Zhiji is an agricultural machinery diagnosis assistant from Nanjing Agricultural University. It brings repair knowledge and language models together to make faults easier to understand and resolve.',
    },
    ctaPrimary: { zh: '开始诊断', en: 'Start Diagnosis' },
    ctaSecondary: { zh: '了解系统能力', en: 'See Capabilities' },
    stats: [
      { value: 'Online', label: { zh: '服务在线', en: 'Service Online' } },
      { value: 'RAG', label: { zh: '本地知识库检索', en: 'Local KB Retrieval' } },
      { value: '3D', label: { zh: '可交互农机模型', en: 'Interactive 3D Model' } },
    ],
  },
  PAIN_POINTS: [
    {
      icon: 'AlertTriangle',
      title: { zh: '经验诊断响应滞后', en: 'Slow Experience-based Response' },
      desc: {
        zh: '传统农机故障依赖资深技术员经验判断，下乡响应慢，故障排查周期长，作业窗口期损失大。',
        en: 'Traditional diagnosis relies on experienced technicians; slow off-field response and long troubleshooting cause major operational losses.',
      },
    },
    {
      icon: 'Brain',
      title: { zh: '只判断不解释', en: 'Labels Without Explanation' },
      desc: {
        zh: '传统诊断方法仅输出故障类别，缺乏机理分析与可解释性，维修人员难以理解与信任诊断结果。',
        en: 'Traditional methods output only a fault label without mechanism analysis, making results hard to understand and trust.',
      },
    },
    {
      icon: 'ScanLine',
      title: { zh: '维修资料分散', en: 'Scattered Repair Manuals' },
      desc: {
        zh: '维修手册散落在不同品牌、机型、PDF 与纸质资料中，现场查阅耗时，参数容易记错。',
        en: 'Repair manuals are scattered across brands, models, PDFs and paper; on-site lookup is slow and parameters are easily misremembered.',
      },
    },
  ],
  CAPABILITY_STATS: [
    { label: { zh: 'LLM 提供商', en: 'LLM Provider' }, value: 'Gemini / DeepSeek' },
    { label: { zh: '知识库', en: 'Knowledge Base' }, value: 'Local Markdown' },
    { label: { zh: '输出', en: 'Output' }, value: 'Structured MD' },
    { label: { zh: '部署', en: 'Deploy' }, value: 'Local / Edge' },
  ],
  MULTIMODAL_SIGNALS: [
    {
      icon: 'Activity',
      name: { zh: '振动信号（规划中）', en: 'Vibration (Planned)' },
      desc: {
        zh: '采集轴承、齿轮、发动机振动频谱，识别冲击与磨损。当前版本未接入传感器。',
        en: 'Vibration spectra from bearings and gears. Not wired to sensors in this version.',
      },
      value: { zh: '规划方向', en: 'Research direction' },
    },
    {
      icon: 'Volume2',
      name: { zh: '声音信号（规划中）', en: 'Acoustic (Planned)' },
      desc: {
        zh: '非接触式声学采集识别异响。当前版本未接入麦克风阵列。',
        en: 'Contactless acoustic capture. Mic array not integrated in this version.',
      },
      value: { zh: '规划方向', en: 'Research direction' },
    },
    {
      icon: 'Camera',
      name: { zh: '视觉信号（规划中）', en: 'Vision (Planned)' },
      desc: {
        zh: '工业相机捕捉外观损伤与渗漏。当前版本未接入视觉模块。',
        en: 'Industrial camera defect detection. Vision module not integrated in this version.',
      },
      value: { zh: '规划方向', en: 'Research direction' },
    },
    {
      icon: 'Gauge',
      name: { zh: '运行参数（规划中）', en: 'Telemetry (Planned)' },
      desc: {
        zh: 'CAN 总线转速/油压/温度。当前版本未接入车端总线。',
        en: 'CAN-bus telemetry. Vehicle bus not connected in this version.',
      },
      value: { zh: '规划方向', en: 'Research direction' },
    },
  ],
  ARCHITECTURE_LAYERS: [
    {
      index: '01',
      name: { zh: '接入层', en: 'Input' },
      icon: 'Layers',
      desc: { zh: '对话与农机信息输入', en: 'Chat & machine info' },
      points: [
        { zh: '自然语言对话', en: 'Natural-language chat' },
        { zh: '农机类型/品牌/型号（可选）', en: 'Type/brand/model (optional)' },
        { zh: '故障描述与现象', en: 'Symptom description' },
        { zh: '历史上下文', en: 'Conversation history' },
      ],
    },
    {
      index: '02',
      name: { zh: '知识检索', en: 'Retrieval' },
      icon: 'Network',
      desc: { zh: '本地 Markdown 知识库切块检索', en: 'Local KB chunk retrieval' },
      points: [
        { zh: '按 ## 标题切块', en: 'Split by ## headings' },
        { zh: '关键词重叠打分', en: 'Keyword-overlap scoring' },
        { zh: 'Top-K 片段注入 prompt', en: 'Top-K chunks into prompt' },
        { zh: '无向量库、零外部依赖', en: 'No vector DB, zero deps' },
      ],
    },
    {
      index: '03',
      name: { zh: '推理层', en: 'Reasoning' },
      icon: 'Cpu',
      desc: { zh: 'LLM Provider 按网络环境自动选择', en: 'Provider picked by network' },
      points: [
        { zh: '有代理 → Gemini 优先', en: 'Proxy → Gemini first' },
        { zh: '无代理 → DeepSeek 优先', en: 'No proxy → DeepSeek first' },
        { zh: '失败自动回退', en: 'Auto fallback' },
        { zh: '严格禁止编造参数', en: 'No fabricated params' },
      ],
    },
    {
      index: '04',
      name: { zh: '输出层', en: 'Output' },
      icon: 'ShieldCheck',
      desc: { zh: '结构化诊断与安全建议', en: 'Structured diagnosis & safety' },
      points: [
        { zh: '现象/原因/排查/依据', en: 'Symptom/causes/steps/evidence' },
        { zh: '安全提醒', en: 'Safety warnings' },
        { zh: '资料不足时主动追问', en: 'Asks when knowledge missing' },
        { zh: 'Markdown 渲染', en: 'Markdown rendering' },
      ],
    },
  ],
  SIMULATION_ITEMS: [
    {
      icon: 'Boxes',
      title: { zh: '3D 模型可视化（已实现）', en: '3D Visualization (Implemented)' },
      desc: {
        zh: '可交互的拖拉机 GLB 模型，支持拖拽旋转、滚轮缩放、自动自转。',
        en: 'Interactive tractor GLB with drag-to-rotate, zoom and auto-rotate.',
      },
    },
    {
      icon: 'BarChart3',
      title: { zh: '结构仿真验证（规划中）', en: 'FEA Verification (Planned)' },
      desc: {
        zh: '未来将接入有限元模态与应力分析，对诊断结论做物理反向验证。',
        en: 'Future: FEA modal and stress analysis to physically verify conclusions.',
      },
    },
    {
      icon: 'RefreshCcw',
      title: { zh: '数字孪生闭环（规划中）', en: 'Digital Twin Loop (Planned)' },
      desc: {
        zh: '未来将建立关键部件数字孪生，把实时运行数据与诊断结论闭环校验。',
        en: 'Future: digital twins of key parts for closed-loop verification.',
      },
    },
  ],
  TECH_ROUTE_STEPS: [
    { icon: 'Database', title: { zh: '故障描述', en: 'Symptom Input' }, desc: { zh: '用户自然语言描述', en: 'Natural language' } },
    { icon: 'Waves', title: { zh: '知识检索', en: 'KB Retrieval' }, desc: { zh: '本地知识库切块', en: 'Local KB chunks' } },
    { icon: 'GitMerge', title: { zh: 'Prompt 组装', en: 'Prompt Build' }, desc: { zh: 'system + 历史 + RAG', en: 'system + history + RAG' } },
    { icon: 'Bot', title: { zh: 'LLM 推理', en: 'LLM Reasoning' }, desc: { zh: 'Gemini / DeepSeek', en: 'Gemini / DeepSeek' } },
    { icon: 'Cpu', title: { zh: '结构化输出', en: 'Structured' }, desc: { zh: 'Markdown 诊断报告', en: 'Markdown report' } },
    { icon: 'FileText', title: { zh: '安全建议', en: 'Safety' }, desc: { zh: '维修注意事项', en: 'Repair warnings' } },
  ],
  SCENARIOS: [
    {
      icon: 'Tractor',
      name: { zh: '拖拉机', en: 'Tractors' },
      parts: [
        { zh: '发动机系统', en: 'Engine' },
        { zh: '传动系统', en: 'Drivetrain' },
        { zh: '液压系统', en: 'Hydraulics' },
        { zh: '行走系统', en: 'Chassis' },
      ],
      faults: [
        { zh: '水温过高', en: 'Overheating' },
        { zh: '启动困难', en: 'Hard start' },
        { zh: '冒黑烟动力不足', en: 'Black smoke / low power' },
        { zh: '液压提升无力', en: 'Weak hydraulics' },
      ],
    },
    {
      icon: 'Wheat',
      name: { zh: '联合收割机', en: 'Combine Harvesters' },
      parts: [
        { zh: '脱粒滚筒', en: 'Threshing drum' },
        { zh: '割台系统', en: 'Header' },
        { zh: '输送槽', en: 'Conveyor' },
        { zh: '行走底盘', en: 'Chassis' },
      ],
      faults: [
        { zh: '脱粒滚筒堵塞', en: 'Drum blockage' },
        { zh: '割台振动异响', en: 'Header vibration' },
        { zh: '滚筒轴承损坏', en: 'Drum bearing failure' },
        { zh: '输送链跑偏', en: 'Chain misalignment' },
      ],
    },
    {
      icon: 'Factory',
      name: { zh: '更广农机生态', en: 'Broader Ecosystem' },
      parts: [
        { zh: '插秧机', en: 'Rice transplanter' },
        { zh: '旋耕机', en: 'Rotavator' },
        { zh: '植保无人机', en: 'Spray drone' },
        { zh: '烘干设备', en: 'Drying unit' },
      ],
      faults: [
        { zh: '按类型逐步扩充', en: 'Expanding by type' },
        { zh: '统一诊断框架', en: 'Unified framework' },
        { zh: '品牌资料分目录管理', en: 'Per-brand KB' },
        { zh: '型号资料分目录管理', en: 'Per-model KB' },
      ],
    },
  ],
  CLOSING_CTA: {
    title: { zh: '现在就体验智能故障诊断', en: 'Try Intelligent Fault Diagnosis Now' },
    desc: {
      zh: '描述故障现象，本地知识库 + LLM 会给出结构化的原因分析、排查步骤与安全建议。',
      en: 'Describe the symptom and the local KB + LLM will give structured causes, steps and safety advice.',
    },
    buttonText: { zh: '开始诊断', en: 'Start Diagnosis' },
  },
  FOOTER_REFERENCES: [
    { name: { zh: '南京农业大学「司农智机」团队', en: 'NAU Sinong Zhiji Team' }, href: '#' },
    { name: { zh: '太仓市「农小修」农机服务平台', en: 'Taicang NongXiaoxiu Platform' }, href: '#' },
    { name: { zh: '本地知识库 Markdown', en: 'Local Knowledge Base' }, href: '#' },
    { name: { zh: 'Gemini API', en: 'Gemini API' }, href: '#' },
    { name: { zh: 'DeepSeek API', en: 'DeepSeek API' }, href: '#' },
    { name: { zh: 'Three.js / React Three Fiber', en: 'Three.js / R3F' }, href: '#' },
  ],
  CHAT_QUICK_QUESTIONS: [
    { zh: '拖拉机发动机水温过高怎么办？', en: 'Tractor engine overheating, what to do?' },
    { zh: '拖拉机启动困难、排白烟，可能原因？', en: 'Hard start with white smoke, possible causes?' },
    { zh: '液压提升无力、油温偏高，怎么排查？', en: 'Weak hydraulics with high oil temperature?' },
    { zh: '联合收割机脱粒滚筒堵塞如何处理？', en: 'How to clear a combine drum blockage?' },
  ],
  CHAT_WELCOME: {
    title: { zh: '司农智机 · 农机故障诊断智能体', en: 'Sinong Zhiji · Fault Diagnosis Agent' },
    desc: {
      zh: '您好！我是面向农机装备的故障诊断智能体。请描述故障现象（可附农机类型/品牌/型号），我会基于本地知识库给出结构化诊断与维修建议。',
      en: 'Hello! Describe the symptom (optionally with type/brand/model); I will use the local knowledge base to give structured diagnosis and repair advice.',
    },
  },
};

// 取双语字段的当前语言值
type B = { zh: string; en: string };
export const pick = (b: B, lang: Lang): string => b[lang];

export default content;
