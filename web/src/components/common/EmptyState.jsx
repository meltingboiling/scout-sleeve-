// src/components/common/EmptyState.jsx
export default function EmptyState({ title = 'No data found', message = 'Try adjusting your filters.', icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 animate-fade-in">
      <div className="text-5xl opacity-30">{icon || '📭'}</div>
      <h3 className="font-display font-bold text-xl tracking-wide text-grass-400/60 uppercase">{title}</h3>
      <p className="text-sm text-grass-400/40 font-body max-w-xs text-center">{message}</p>
    </div>
  )
}

export function ErrorState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 animate-fade-in">
      <div className="text-5xl">⚠️</div>
      <h3 className="font-display font-bold text-xl tracking-wide text-danger-400/80 uppercase">Firebase Error</h3>
      <p className="text-sm text-danger-400/60 font-mono max-w-md text-center bg-danger-500/10 border border-danger-500/20 rounded-lg px-4 py-3">
        {message}
      </p>
      <p className="text-xs text-grass-400/40">Check your .env file and Firestore security rules.</p>
    </div>
  )
}
