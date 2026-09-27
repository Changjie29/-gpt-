import { AlertTriangle, Brain, ScanLine } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import content, { pick } from '@/data/content';
import { useLang } from '@/hooks/useLang';

const ICON_MAP: Record<string, typeof AlertTriangle> = {
  AlertTriangle,
  Brain,
  ScanLine,
};

export default function PainPointsSection() {
  const lang = useLang();
  const t = (zh: string, en: string) => (lang === 'zh' ? zh : en);
  return (
    <section id="painpoints" className="w-full py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
        {/* 标题 */}
        <div className="section-heading mb-12">
          <div className="section-eyebrow">{t('从真实维修现场出发', 'Built around real repair work')}</div>
          <h2 className="font-serif text-2xl font-bold text-foreground md:text-3xl">
            {t('传统农机故障诊断面临的三大挑战', 'Three Challenges of Traditional Fault Diagnosis')}
          </h2>
        </div>

        {/* 三痛点卡片 */}
        <div className="grid gap-6 md:grid-cols-3">
          {content.PAIN_POINTS.map((item, i) => {
            const Icon = ICON_MAP[item.icon] || AlertTriangle;
            return (
              <motion.div
                key={pick(item.title, lang)}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Card className="h-full transition-all duration-300 hover:shadow-md hover:border-primary/30">
                  <CardContent className="p-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mb-2 font-serif text-lg font-semibold text-foreground">{pick(item.title, lang)}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{pick(item.desc, lang)}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* 真实能力概览（不写虚构指标） */}
        <div className="mt-16 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {content.CAPABILITY_STATS.map((stat, i) => (
            <motion.div
              key={pick(stat.label, lang)}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="rounded-xl border border-border/60 bg-card p-4 text-center"
            >
              <div className="font-serif text-base font-bold text-primary">{stat.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{pick(stat.label, lang)}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
