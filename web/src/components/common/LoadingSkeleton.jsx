// src/components/common/LoadingSkeleton.jsx
export function SkeletonRow() {
  return (
    <div className="h-12 rounded-lg bg-pitch-800/50 animate-pulse my-1" />
  )
}

export function SkeletonCard() {
  return (
    <div className="panel p-5 animate-pulse">
      <div className="h-4 bg-pitch-700/60 rounded w-1/3 mb-3" />
      <div className="h-8 bg-pitch-700/60 rounded w-1/2 mb-2" />
      <div className="h-3 bg-pitch-700/40 rounded w-2/3" />
    </div>
  )
}

export default function LoadingSkeleton({ rows = 8 }) {
  return (
    <div className="space-y-1 animate-fade-in">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  )
}
