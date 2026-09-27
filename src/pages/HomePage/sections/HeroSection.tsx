import { useNavigate } from 'react-router-dom';
import { ArrowRight, Database, ShieldCheck, Box, Wheat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TractorViewer from '@/components/TractorViewer';
import content, { pick } from '@/data/content';
import { useLang } from '@/hooks/useLang';

export default function HeroSection() {
  const navigate = useNavigate();
  const lang = useLang();
  const h = content.HERO;
  const t = (zh: string, en: string) => lang === 'zh' ? zh : en;
  return (
    <>
      <section className="glass-hero w-full">
        <div className="hero-layout page-container">
          <div className="hero-copy">
            <div className="hero-affiliation">
              <Wheat size={18} strokeWidth={1.5} />
              <span>{t('南京农业大学 · 耕知·耘诊', 'Nanjing Agricultural University · Gengzhi · Yunzhen')}</span>
            </div>
            <h1 className="hero-title text-foreground">
              <span>{pick(h.title1, lang)}</span>
              <span>{pick(h.titleHighlight, lang)}</span>
              <span>{pick(h.title2, lang)}</span>
            </h1>
            <p className="hero-description">{pick(h.desc, lang)}</p>
            <div className="hero-actions">
              <Button size="lg" onClick={() => navigate('/chat')} className="hero-cta-primary gap-3">
                {pick(h.ctaPrimary, lang)}<ArrowRight size={17} />
              </Button>
              <button className="hero-text-link" onClick={() => document.getElementById('multimodal')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                {pick(h.ctaSecondary, lang)}<ArrowRight size={16} />
              </button>
            </div>
          </div>
          <figure className="hero-model-visual">
            <div className="hero-model-stage"><TractorViewer /></div>
            <figcaption className="hero-model-caption">
              <span>{t('农业装备 · 交互式模型', 'Agricultural machinery · Interactive model')}</span>
              <Box size={15} strokeWidth={1.5} />
            </figcaption>
          </figure>
        </div>
      </section>
      <div className="capability-strip page-container" aria-label={t('系统能力', 'Platform capabilities')}>
        {[
          { icon: Database, title: t('知识有依据', 'Grounded knowledge'), detail: t('本地维修资料辅助检索', 'Retrieval from local repair documents') },
          { icon: ShieldCheck, title: t('诊断可解释', 'Explainable diagnosis'), detail: t('原因分析与分步排查建议', 'Causes and step-by-step troubleshooting') },
          { icon: Box, title: t('结构可交互', 'Interactive structure'), detail: t('三维模型辅助理解机械结构', 'Explore machinery through a 3D model') },
        ].map(({ icon: Icon, title, detail }) => (
          <div className="capability-item" key={title}>
            <Icon size={21} strokeWidth={1.5} />
            <div><strong>{title}</strong><span>{detail}</span></div>
          </div>
        ))}
      </div>
    </>
  );
}
