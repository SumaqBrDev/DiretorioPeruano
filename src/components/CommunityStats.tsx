import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useHomeStore } from '../stores/useHomeStore';
import { useAnimatedCounter } from '../hooks/useAnimatedCounter';
import { SkeletonCard } from './SkeletonCard';

function StatCard({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  const { t } = useTranslation();
  const { count, ref, displayValue } = useAnimatedCounter({ end: value, suffix: suffix || '' });

  return (
    <div
      ref={ref}
      className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-xl p-6 border border-oro-inca/20 text-center"
    >
      <p className="text-3xl md:text-4xl font-bold text-aji-rojo mb-1 tabular-nums">
        {displayValue}
      </p>
      <p className="text-gray-600 dark:text-gray-400 text-sm">
        {t(label)}
      </p>
    </div>
  );
}

export const CommunityStats = () => {
  const { t } = useTranslation();
  const { stats, loading, error, fetchStats } = useHomeStore();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <section className="py-16 bg-creme-andino dark:bg-zinc-900">
      <div className="container mx-auto px-4">
        {error.stats && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-aji-rojo/10 border border-aji-rojo/30 rounded-xl text-center">
            <p className="text-aji-rojo text-sm">{t('common.error')}</p>
            <button
              onClick={fetchStats}
              className="mt-2 text-sm text-aji-rojo font-medium hover:underline"
            >
              {t('common.retry')}
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {loading.stats
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} variant="stat" />)
            : stats.map((stat, i) => (
                <StatCard
                  key={i}
                  label={stat.label}
                  value={stat.value}
                  suffix={stat.suffix}
                />
              ))}
        </div>
      </div>
    </section>
  );
};
