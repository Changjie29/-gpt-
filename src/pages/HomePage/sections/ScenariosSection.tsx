import { Tractor, Wheat, Factory } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import content, { pick } from '@/data/content';
import { useLang } from '@/hooks/useLang';

const ICON_MAP: Record<string, typeof Tractor> = {
  Tractor,
  Wheat,
  Factory,
};

export default function ScenariosSection() {
  const lang = useLang();
  const t = (zh: string, en: string) => (lang === 'zh' ? zh : en);
  return (
    <section id="scenarios" className="w-full py-16 md:py-20 bg-accent/20">
      <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
        {/* 标题 */}
        <div className="section-heading mb-12">
          <div className="section-eyebrow">{t('服务农业生产一线', 'Made for agricultural work')}</div>
          <h2 className="font-serif text-2xl font-bold text-foreground md:text-3xl">
            {t('覆盖主要农机品类与关键故障', 'Covering Major Machinery & Key Faults')}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground md:text-base">
            {t(
              '从拖拉机到联合收割机，再到更广的农机装备生态，提供一致的诊断体验',
              'From tractors to combines and beyond, a consistent diagnosis experience across the fleet.',
            )}
          </p>
        </div>

        {/* 三卡片 */}
        <div className="grid gap-6 md:grid-cols-3">
          {content.SCENARIOS.map((scenario, i) => {
            const Icon = ICON_MAP[scenario.icon] || Tractor;
            return (
              <motion.div
                key={pick(scenario.name, lang)}
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
                    <h3 className="mb-4 font-serif text-lg font-semibold text-foreground">{pick(scenario.name, lang)}</h3>

                    <div className="mb-4">
                      <div className="mb-2 text-xs font-medium text-wheat">{t('重点监测部件', 'Key Components')}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {scenario.parts.map((p) => (
                          <span
                            key={pick(p, lang)}
                            className="rounded-md bg-accent px-2 py-1 text-xs text-foreground"
                          >
                            {pick(p, lang)}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 text-xs font-medium text-wheat">{t('典型故障', 'Typical Faults')}</div>
                      <ul className="space-y-1.5">
                        {scenario.faults.map((f) => (
                          <li key={pick(f, lang)} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                            {pick(f, lang)}
                          </li>
                        ))}
                      </ul>
                    </div>
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
