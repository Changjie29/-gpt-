import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, Database, ShieldCheck, Box, Wheat, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TractorViewer from '@/components/TractorViewer';
import content, { pick } from '@/data/content';
import { useLang } from '@/hooks/useLang';

export default function HeroSection() {
  const navigate = useNavigate();
  const lang = useLang();
  const h = content.HERO;

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section className="glass-hero w-full">
      <div className="relative mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
        <div className="grid items-center gap-9 lg:grid-cols-[1.05fr_.95fr] lg:gap-12">
          {/* 左侧文案 */}
          <div className="space-y-6">
            <div className="hero-affiliation">
              <span className="hero-affiliation-mark"><Wheat className="size-4" /></span>
              <span>{lang === 'zh' ? '南京农业大学 · 耕知·耘诊' : 'Nanjing Agricultural University · Gengzhi · Yunzhen'}</span>
              <span className="hero-affiliation-rule" />
              <span className="hero-kicker"><Sparkles className="size-3.5" />{pick(h.eyebrow, lang)}</span>
            </div>

            <h1 className="hero-title text-foreground">
              <span>{pick(h.title1, lang)}</span>
              <span className="text-primary">{pick(h.titleHighlight, lang)}</span>
              <span>{pick(h.title2, lang)}</span>
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              {pick(h.desc, lang)}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button size="lg" onClick={() => navigate('/chat')} className="hero-cta-primary gap-2">
                {pick(h.ctaPrimary, lang)}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => scrollToSection('multimodal')}
                className="hero-cta-secondary gap-2"
              >
                {pick(h.ctaSecondary, lang)}
              </Button>
            </div>
            <div className="hero-proofline" aria-label={lang === 'zh' ? '服务能力' : 'Service capabilities'}>
              <span><Database className="size-4" />{lang === 'zh' ? '本地维修知识' : 'Local repair knowledge'}</span>
              <span><ShieldCheck className="size-4" />{lang === 'zh' ? '可解释诊断' : 'Explainable diagnosis'}</span>
              <span><GraduationCap className="size-4" />{lang === 'zh' ? '南农团队研发' : 'Built by NAU team'}</span>
            </div>

          </div>

          {/* 右侧 3D 模型 */}
          <div className="relative shrink-0 lg:min-w-0">
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-primary/5 via-transparent to-wheat/10 blur-2xl" />
            <div className="hero-model-visual">
              <div className="hero-model-stage">
                <TractorViewer />
              </div>
              <div className="hero-model-caption">
                <span>{lang === 'zh' ? '交互式 3D 拖拉机模型' : 'Interactive 3D tractor model'}</span>
                <span className="hidden sm:inline">{lang === 'zh' ? '拖动旋转 · 滚轮缩放' : 'Drag to rotate · Scroll to zoom'}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="hero-features" aria-label={lang === 'zh' ? '系统能力' : 'Platform capabilities'}>
          {[
            { icon: Database, title: lang === 'zh' ? '本地知识检索' : 'Local knowledge retrieval', detail: lang === 'zh' ? '维修资料辅助诊断' : 'Repair information grounded' },
            { icon: ShieldCheck, title: lang === 'zh' ? '安全维修建议' : 'Safety-first advice', detail: lang === 'zh' ? '结构化排查与安全提醒' : 'Structured troubleshooting' },
            { icon: Box, title: lang === 'zh' ? '交互式 3D 展示' : 'Interactive 3D view', detail: lang === 'zh' ? '拖拉机模型可旋转缩放' : 'Explore the tractor model' },
          ].map(({ icon: Icon, title, detail }) => (
            <div key={title} className="hero-feature">
              <span className="hero-feature-icon"><Icon className="size-5" /></span>
              <span><strong className="block text-sm font-semibold text-foreground">{title}</strong><small className="mt-1 block text-xs text-muted-foreground">{detail}</small></span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
