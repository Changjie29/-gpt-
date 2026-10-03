import type { KnowledgeChunk } from './retriever';

export interface RetrievalContext {
  machineType?: string;
  brand?: string;
  model?: string;
}

const BRAND_ALIASES: Record<string, string[]> = {
  久保田: ['久保田', 'kubota'],
  纽荷兰: ['纽荷兰', 'new holland', 'newholland'],
  中联: ['中联', 'zoomlion'],
  雷沃: ['雷沃', 'lovol', '福田雷沃', '雷沃欧豹', '雷沃阿波斯'],
  东风: ['东风', 'dongfeng', 'dong feng'],
  鸿鹄: ['鸿鹄', '国科鸿鹄', 'honghu'],
  东方红: ['东方红', 'yto'],
  常发: ['常发', 'changfa'],
  沃得: ['沃得', '悍沃'],
  黄海金马: ['黄海金马', '金马', 'jinma'],
  时风: ['时风', 'shifeng'],
  潍泰: ['潍泰', 'weitai'],
  约翰迪尔: ['约翰迪尔', 'john deere', 'johndeere'],
  '千寻位置 / 千耘': ['千寻位置', '千耘', 'qianxun'],
};

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function brandsIn(text: string): string[] {
  const lower = text.toLowerCase();
  return Object.entries(BRAND_ALIASES).filter(([, aliases]) => aliases.some((alias) => {
    if (/^[a-z ]+$/.test(alias)) return new RegExp(`(^|[^a-z])${alias.replace(/ /g, '\\s*')}([^a-z]|$)`).test(lower);
    return lower.includes(alias);
  })).map(([brand]) => brand);
}

function canonicalBrand(brand: string | undefined): string | undefined {
  if (!brand) return undefined;
  const known = brandsIn(brand);
  return known.length === 1 ? known[0] : brand.toLowerCase();
}

function normalizeModel(model: string): string {
  return model.toLowerCase().replace(/欧豹|系列|平台|拖拉机/g, '').replace(/[\s\-_/()（）]/g, '');
}

/** Explicit lists and parenthetical product names are aliases, never inferred submodels. */
function declaredModels(chunk: KnowledgeChunk): string[] {
  if (chunk.models?.length) return chunk.models.map(normalizeModel);
  const model = chunk.model || '';
  if (model === 'QYBD-2.5SD（QY210 Pro）') return ['qybd2.5sd', 'qy210pro'];
  return model.split(/[/、,，]|-(?=lx)/i).map(normalizeModel);
}

let indexedModels: string[] = [];
let modelFamilies: string[] = ['workmaster', 'lx', 't', 'pl', 'tg'];

/** Rebuilt on reload so source model lists drive recognition as the archive grows. */
export function configureIndexedModels(chunks: KnowledgeChunk[]): void {
  indexedModels = [...new Set(chunks.flatMap(declaredModels))]
    .filter((model) => /^[a-z0-9.]+$/.test(model)).sort((a, b) => b.length - a.length);
  modelFamilies = [...new Set([
    'workmaster', 'lx', 't', 'pl', 'tg',
    ...indexedModels.flatMap((model) => {
      const prefix = model.match(/^(?:\d+[a-z]+|[a-z]+)(?=\d)/)?.[0];
      return prefix ? [prefix] : /^[a-z]{1,5}$/.test(model) ? [model] : [];
    }),
  ])].sort((a, b) => b.length - a.length);
}

interface ModelMention {
  start: number;
  end: number;
  model: string;
}

function modelMentions(text: string): ModelMention[] {
  // Preserve the existing LX2620-LX2620SU grouped alias without merging two identities.
  const scanText = text.replace(/-(?=lx\s*\d)/gi, '/');
  const mentions: ModelMention[] = [];
  for (const model of indexedModels) {
    const pattern = [...model].map(escapeRegex).join('[\\s\\-_/()（）]*');
    const regex = new RegExp(`(?<![a-z0-9])${pattern}(?![a-z0-9])`, 'gi');
    for (const match of scanText.matchAll(regex)) {
      mentions.push({ start: match.index!, end: match.index! + match[0].length, model });
    }
  }
  // Unknown models in indexed families remain identities, preventing a generic fallback.
  const families = modelFamilies.map(escapeRegex).join('|');
  const regex = new RegExp(`(?<![a-z0-9])(?:${families})[\\s-]*\\d[a-z0-9]*(?:[.-]\\s*[a-z0-9]+)*(?:\\s+(?:pro|su))?(?:\\s*[(（]\\s*g\\d+\\s*[)）])?`, 'gi');
  for (const match of scanText.matchAll(regex)) {
    mentions.push({ start: match.index!, end: match.index! + match[0].length, model: normalizeModel(match[0]) });
  }
  // A longer identity always wins: WORKMASTER25S must not be read as WORKMASTER25.
  const sorted = mentions.sort((a, b) => a.start - b.start || b.end - a.end);
  return sorted.filter((mention, index) => !sorted.slice(0, index).some((previous) =>
    previous.start <= mention.start && previous.end >= mention.end,
  ));
}

function modelsIn(text: string): string[] {
  const models = modelMentions(text).map((mention) => mention.model);
  if (text.includes('国三')) models.push('国三');
  if (text.includes('国四') && !models.some((model) => model.endsWith('g4'))) models.push('国四');
  return [...new Set(models)];
}

/** Identity selects eligible documents without inflating their symptom relevance. */
export function queryWithoutIdentity(query: string): string {
  let text = query;
  for (const aliases of Object.values(BRAND_ALIASES)) {
    for (const alias of [...aliases].sort((a, b) => b.length - a.length)) {
      text = /^[a-z ]+$/.test(alias)
        ? text.replace(new RegExp(`(^|[^a-z])${alias.replace(/ /g, '\\s*')}(?=[^a-z]|$)`, 'gi'), '$1 ')
        : text.replaceAll(alias, ' ');
    }
  }
  for (const mention of modelMentions(text).sort((a, b) => b.start - a.start)) {
    text = text.slice(0, mention.start) + ' ' + text.slice(mention.end);
  }
  return text.replace(/欧豹|系列|平台|国三|国四/g, ' ');
}

export interface ResolvedScope {
  brand?: string;
  models: string[];
  emissions: string[];
  ambiguous: boolean;
  tractorArchive: boolean;
  genericKnowledge: boolean;
  electric: boolean;
}

export function resolveScope(query: string, context: RetrievalContext): ResolvedScope {
  const brands = brandsIn(context.brand?.trim() || query);
  const explicitBrand = context.brand?.trim();
  const brand = explicitBrand ? canonicalBrand(explicitBrand) : brands.length === 1 ? brands[0] : undefined;
  const explicitModel = context.model?.trim();
  const models = explicitModel ? declaredModels({ source: '', heading: '', text: '', model: explicitModel }) : modelsIn(query);
  const emissions = ['国三', '国四'].filter((stage) => [query, explicitModel].some((text) => text?.includes(stage)));
  const type = context.machineType?.trim();
  const tractorArchive = type
    ? /^(拖拉机|tractor|新能源农机|new-energy|无人农机|autonomous)$/i.test(type)
    : !/收割机|插秧机|植保机|播种机|无人机|\b(combine|transplanter|sprayer)\b/i.test(query);
  const electric = /电动|新能源|无人|electric|autonomous|new-energy/i.test([type, explicitBrand, context.model, query].filter(Boolean).join(' ')) ||
    brand === '鸿鹄' || models.includes('t70');
  const ambiguous = !explicitBrand && brands.length > 1;
  return { brand, models, emissions, ambiguous, tractorArchive, electric, genericKnowledge: !electric && !brand && models.length === 0 && emissions.length === 0 && !ambiguous };
}

/** Matching is identity selection, not proof of market, configuration or version applicability. */
export function archiveApplicability(chunk: KnowledgeChunk, scope: ResolvedScope): 'matched' | 'pending' | undefined {
  const brand = canonicalBrand(chunk.brand);
  if (!scope.tractorArchive || scope.ambiguous || (scope.brand && scope.brand !== brand)) return undefined;
  if (scope.electric && brand !== '鸿鹄' && brand !== '千寻位置 / 千耘') return undefined;
  const allowed = declaredModels(chunk);
  const emissionStage = chunk.emissionStage ?? (chunk.model === '国三拖拉机' ? '国三'
    : allowed.length > 0 && allowed.every((model) => model.endsWith('g4')) ? '国四' : undefined);
  if (scope.emissions.some((stage) => stage !== emissionStage)) return undefined;
  const models = scope.models.filter((model) => model !== '国三' && model !== '国四');
  if (models.length === 0) return scope.brand === brand ? 'pending' : undefined;

  if (chunk.model === '具体系列待核实') return scope.brand === brand ? 'pending' : undefined;
  if (chunk.model === '国三拖拉机' && scope.brand !== brand) return undefined;
  if (!models.every((model) => allowed.includes(model))) return undefined;
  return models.some((model) => /\d/.test(model)) ? 'matched' : 'pending';
}
