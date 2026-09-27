import { Boxes, BarChart3, RefreshCcw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import content, { pick } from '@/data/content';
import { useLang } from '@/hooks/useLang';

const ICON_MAP: Record<string, typeof Boxes> = {
  Boxes,
  BarChart3,
  RefreshCcw,
};

export default function SimulationSection() {
  const lang = useLang();
  const t = (zh: string, en: string) => (lang === 'zh' ? zh : en);
  return (
    <section className="w-full py-16 md:py-20 bg-accent/20">
      <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
        {/* 标题 */}
        <div className="section-heading mb-12">
          <div className="section-eyebrow">{t('从数字模型到真实机械', 'From digital models to real machines')}</div>
          <h2 className="font-serif text-2xl font-bold text-foreground md:text-3xl">
            {t('数字孪生 · 诊断验证闭环', 'Digital Twin · Verification Loop')}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground md:text-base">
            {t(
              '不只是给出故障标签，更通过结构仿真验证诊断结论的物理合理性，让诊断结果可解释、可追溯',
              'Beyond labels: structural simulation verifies physical plausibility, making diagnosis explainable and traceable.',
            )}
          </p>
        </div>

        {/* 三卡片 */}
        <div className="grid gap-6 md:grid-cols-3">
          {content.SIMULATION_ITEMS.map((item, i) => {
            const Icon = ICON_MAP[item.icon] || Boxes;
            return (
              <motion.div
                key={pick(item.title, lang)}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Card className="h-full transition-all duration-300 hover:shadow-md hover:border-primary/30 hover:-translate-y-1">
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
      </div>
    </section>
  );
}
