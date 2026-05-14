export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 flex h-32">
      <div className="flex-1 p-4 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex items-center justify-between mt-3">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
      <Skeleton className="w-32 h-full rounded-none" />
    </div>
  )
}

export function MenuSkeleton() {
  return (
    <div className="space-y-6">
      {/* Category chips skeleton */}
      <div className="flex gap-2 overflow-hidden">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-8 w-20 rounded-full flex-shrink-0" />
        ))}
      </div>
      {/* Section */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        {[1, 2, 3].map(i => <ProductCardSkeleton key={i} />)}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        {[1, 2].map(i => <ProductCardSkeleton key={i} />)}
      </div>
    </div>
  )
}
