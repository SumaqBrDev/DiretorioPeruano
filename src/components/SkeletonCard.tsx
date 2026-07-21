interface SkeletonCardProps {
  variant?: 'card' | 'stat' | 'testimonial';
}

export const SkeletonCard = ({ variant = 'card' }: SkeletonCardProps) => {
  if (variant === 'stat') {
    return (
      <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-oro-inca/20 animate-pulse">
        <div className="h-10 w-20 bg-gray-200 dark:bg-zinc-700 rounded mb-3" />
        <div className="h-4 w-24 bg-gray-200 dark:bg-zinc-700 rounded" />
      </div>
    );
  }

  if (variant === 'testimonial') {
    return (
      <div className="bg-white dark:bg-zinc-800 rounded-2xl p-8 border border-oro-inca/20 animate-pulse">
        <div className="flex gap-1 mb-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-5 w-5 bg-gray-200 dark:bg-zinc-700 rounded" />
          ))}
        </div>
        <div className="space-y-2 mb-6">
          <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-full" />
          <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-5/6" />
          <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-4/6" />
        </div>
        <div className="flex items-center gap-3 pt-4 border-t border-oro-inca/20">
          <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-zinc-700" />
          <div>
            <div className="h-4 w-28 bg-gray-200 dark:bg-zinc-700 rounded mb-1" />
            <div className="h-3 w-20 bg-gray-200 dark:bg-zinc-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-2xl overflow-hidden border border-oro-inca/20 animate-pulse">
      <div className="aspect-video bg-gray-200 dark:bg-zinc-700" />
      <div className="p-5 space-y-3">
        <div className="h-5 w-3/4 bg-gray-200 dark:bg-zinc-700 rounded" />
        <div className="h-4 w-1/2 bg-gray-200 dark:bg-zinc-700 rounded" />
        <div className="flex gap-2">
          <div className="h-6 w-16 bg-gray-200 dark:bg-zinc-700 rounded-full" />
          <div className="h-6 w-20 bg-gray-200 dark:bg-zinc-700 rounded-full" />
        </div>
      </div>
    </div>
  );
};
