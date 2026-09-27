import { Tractor, Wheat, Factory, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import content, { pick } from '@/data/content';
import { useLang } from '@/hooks/useLang';

const ICON_MAP = { Tractor, Wheat, Factory };
export default function ScenariosSection() {
  const lang = useLang();
  const t = (zh: string, en: string) => lang === 'zh' ? zh : en;
  return (
    <section id="scenarios" className="w-full">
      <div className="page-container">
        <div className="section-heading mb-12">
          <h2>{t('面向真实的农业作业。', 'Made for agricultural work.')}</h2>
          <p className="mt-4">{t('覆盖主要农机品类，围绕关键部件与常见故障提供诊断参考。', 'Diagnostic guidance for key components and common faults across agricultural machinery.')}</p>
        </div>
        <div className="scenario-layout">
          <figure className="scenario-image">
            <img src="/images/agri-fields.webp" alt={t('稻田与田间作业拖拉机的农业场景插图', 'Illustration of rice fields and a tractor at work')} width="1400" height="933" loading="lazy" />
            <figcaption>{t('农业作业场景示意 · AI 生成', 'Agricultural scene illustration · AI generated')}</figcaption>
          </figure>
          <div className="scenario-list">
            {content.SCENARIOS.map(scenario => {
              const Icon = ICON_MAP[scenario.icon as keyof typeof ICON_MAP] || Tractor;
              return <article key={pick(scenario.name, lang)} className="scenario-item">
                <div className="scenario-title"><Icon size={23} strokeWidth={1.5} /><h3>{pick(scenario.name, lang)}</h3></div>
                <p>{scenario.parts.map(p => pick(p, lang)).join(' · ')}</p>
                <ul>{scenario.faults.map(f => <li key={pick(f, lang)}>{pick(f, lang)}</li>)}</ul>
              </article>;
            })}
            <Link to="/chat" className="scenario-link">{t('开始诊断', 'Start diagnosis')}<ArrowUpRight size={18} /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}
