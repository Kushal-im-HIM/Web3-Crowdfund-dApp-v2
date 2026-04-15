/**
 * components/SkeletonCard.js
 *
 * Idea 1 — Skeleton loading screens.
 * Content-shaped shimmer skeletons for campaigns, stats, and activity feeds.
 * Drop-in replacements for spinner-based loading states across all pages.
 */

export function CampaignCardSkeleton() {
  return (
    <div className="bg-white dark:bg-primary-800 rounded-xl border border-emerald-100 dark:border-primary-700 overflow-hidden">
      <div className="h-48 animate-shimmer rounded-none" />
      <div className="p-6 space-y-3">
        <div className="h-5 animate-shimmer rounded-md w-3/4" />
        <div className="h-4 animate-shimmer rounded-md w-full" />
        <div className="h-4 animate-shimmer rounded-md w-5/6" />
        <div className="h-2.5 animate-shimmer rounded-full w-full mt-4" />
        <div className="flex justify-between mt-2">
          <div className="h-4 animate-shimmer rounded w-20" />
          <div className="h-4 animate-shimmer rounded w-16" />
        </div>
        <div className="h-10 animate-shimmer rounded-lg mt-3 w-full" />
      </div>
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="bg-white dark:bg-primary-800 rounded-xl border border-emerald-100 dark:border-primary-700 p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5 animate-shimmer" />
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1">
          <div className="h-3.5 animate-shimmer rounded w-28" />
          <div className="h-7 animate-shimmer rounded w-20 mt-1" />
        </div>
        <div className="w-12 h-12 animate-shimmer rounded-xl" />
      </div>
    </div>
  );
}

export function ActivityRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg">
      <div className="w-2.5 h-2.5 animate-shimmer rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-4 animate-shimmer rounded w-4/5" />
        <div className="h-3 animate-shimmer rounded w-1/3" />
      </div>
    </div>
  );
}

export function CampaignDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-72 animate-shimmer rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-8 animate-shimmer rounded w-3/4" />
          <div className="h-4 animate-shimmer rounded w-full" />
          <div className="h-4 animate-shimmer rounded w-5/6" />
          <div className="h-4 animate-shimmer rounded w-4/5" />
        </div>
        <div className="space-y-3">
          <div className="h-12 animate-shimmer rounded-xl" />
          <div className="h-12 animate-shimmer rounded-xl" />
          <div className="h-10 animate-shimmer rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 4 }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-emerald-50 dark:border-primary-700">
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className={`h-4 animate-shimmer rounded flex-1 ${i === 0 ? "max-w-[40px]" : ""}`} />
      ))}
    </div>
  );
}
