import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  BarChart3,
  BookOpen,
  GitCompare,
  ListFilter,
  Moon,
  ShieldAlert,
  Sun,
  Table2,
  Users,
} from 'lucide-react'
import { Overview } from './features/overview/Overview'
import { loadApplicationData } from './data/loaders'
import { cn } from './lib/utils'

const PokemonExplorer = lazy(() =>
  import('./features/pokemon-explorer/PokemonExplorer').then((module) => ({
    default: module.PokemonExplorer,
  })),
)
const MovesetComparator = lazy(() =>
  import('./features/moveset-comparator/MovesetComparator').then((module) => ({
    default: module.MovesetComparator,
  })),
)
const PairBuilder = lazy(() =>
  import('./features/pair-builder/PairBuilder').then((module) => ({
    default: module.PairBuilder,
  })),
)
const LineupMatrix = lazy(() =>
  import('./features/lineup-matrix/LineupMatrix').then((module) => ({
    default: module.LineupMatrix,
  })),
)
const Methodology = lazy(() =>
  import('./features/methodology/Methodology').then((module) => ({
    default: module.Methodology,
  })),
)

type ViewId =
  | 'overview'
  | 'pokemon'
  | 'movesets'
  | 'pairs'
  | 'lineups'
  | 'methodology'

const views: Array<{
  id: ViewId
  label: string
  icon: typeof Activity
}> = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'pokemon', label: 'Pokemon', icon: ListFilter },
  { id: 'movesets', label: 'Movesets', icon: GitCompare },
  { id: 'pairs', label: 'Pair Builder', icon: Users },
  { id: 'lineups', label: 'Lineups', icon: Table2 },
  { id: 'methodology', label: 'Methodology', icon: BookOpen },
]

export default function App() {
  const data = useMemo(() => loadApplicationData(), [])
  const [activeView, setActiveView] = useState<ViewId>('overview')
  const [dark, setDark] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches,
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const updateTheme = () => setDark(mediaQuery.matches)
    updateTheme()
    mediaQuery.addEventListener('change', updateTheme)
    return () => mediaQuery.removeEventListener('change', updateTheme)
  }, [])

  return (
    <div className={cn(dark && 'dark')}>
      <div className="min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">
        <header className="sticky top-0 z-20 border-b border-[rgb(var(--border))] bg-[rgb(var(--panel)/0.96)] backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-3 sm:px-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--muted)/0.45)]">
              <ShieldAlert className="h-5 w-5 text-[rgb(var(--primary))]" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold sm:text-lg">
                Rocket Pair Lab
              </h1>
              <p className="truncate text-xs text-[rgb(var(--muted-foreground))]">
                Milestone 1 data explorer. Rankings remain experimental.
              </p>
            </div>
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--panel))]"
              aria-label="Theme follows system preference"
              title="Theme follows system preference"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </span>
          </div>
          <nav
            className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 pb-3 sm:px-4"
            aria-label="Primary views"
          >
            {views.map((view) => {
              const Icon = view.icon
              return (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => setActiveView(view.id)}
                  className={cn(
                    'inline-flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-sm',
                    activeView === view.id
                      ? 'border-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.14)] text-[rgb(var(--foreground))]'
                      : 'border-[rgb(var(--border))] bg-[rgb(var(--panel))] text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted)/0.6)]',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {view.label}
                </button>
              )
            })}
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-3 py-4 sm:px-4">
          {activeView === 'overview' && <Overview data={data} />}
          <Suspense
            fallback={
              <div className="rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--panel))] p-4 text-sm text-[rgb(var(--muted-foreground))]">
                Loading view...
              </div>
            }
          >
            {activeView === 'pokemon' && <PokemonExplorer data={data} />}
            {activeView === 'movesets' && <MovesetComparator data={data} />}
            {activeView === 'pairs' && <PairBuilder data={data} />}
            {activeView === 'lineups' && <LineupMatrix data={data} />}
            {activeView === 'methodology' && <Methodology data={data} />}
          </Suspense>
        </main>
      </div>
    </div>
  )
}
