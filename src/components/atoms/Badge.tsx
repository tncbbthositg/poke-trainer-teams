import { cn } from '../../lib/utils'

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'ok' | 'warning' | 'danger' | 'info'
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
        tone === 'neutral' && 'border border-[rgb(var(--border))] bg-[rgb(var(--muted)/0.65)]',
        tone === 'ok' && 'bg-[rgb(var(--ok)/0.16)] text-[rgb(var(--ok))]',
        tone === 'warning' && 'bg-[rgb(var(--warning)/0.16)] text-[rgb(var(--warning))]',
        tone === 'danger' && 'bg-[rgb(var(--danger)/0.14)] text-[rgb(var(--danger))]',
        tone === 'info' && 'bg-[rgb(var(--primary)/0.14)] text-[rgb(var(--primary))]',
      )}
    >
      {children}
    </span>
  )
}
