import { AlertTriangle, Database, FlaskConical, Timer } from 'lucide-react'
import { Panel, PanelHeader } from '../../components/ui/Panel'
import { Badge } from '../../components/ui/Badge'
import type { ApplicationData } from '../../data/loaders'

export function Overview({ data }: { data: ApplicationData }) {
  const unresolved = data.mechanics.values.filter(
    (value) => value.category === 'unverified' || value.category === 'configurable-assumption',
  )

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Pokemon analyzed" value={data.pokemon.candidates.length} icon={Database} />
        <Metric label="Legal fast moves" value={data.moves.fastMoves.length} icon={Timer} />
        <Metric label="Legal charged moves" value={data.moves.chargedMoves.length} icon={Timer} />
        <Metric label="Rocket lineup records" value={data.rocket.lineups.length} icon={AlertTriangle} />
      </div>
      <Panel>
        <PanelHeader
          title="Milestone 1 status"
          subtitle="This build compares sourced attacker stats and legal Trainer Battle moves. It does not claim a best Rocket pair."
          right={<Badge tone="warning">Experimental</Badge>}
        />
        <div className="grid gap-3 p-3 md:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase text-[rgb(var(--muted-foreground))]">
              Snapshot date
            </p>
            <p className="mt-1 text-sm">{data.metadata.generatedAt}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-[rgb(var(--muted-foreground))]">
              Universal pairs
            </p>
            <p className="mt-1 text-sm">Unknown until Milestone 2 simulator validation</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-[rgb(var(--muted-foreground))]">
              Fastest pair
            </p>
            <p className="mt-1 text-sm">Not calculated in Milestone 1</p>
          </div>
        </div>
      </Panel>
      <Panel>
        <PanelHeader
          title="Important unresolved mechanics"
          subtitle="These values are visible because they materially affect future rankings."
          right={<FlaskConical className="h-4 w-4 text-[rgb(var(--warning))]" />}
        />
        <div className="grid gap-2 p-3 sm:grid-cols-2">
          {unresolved.map((value) => (
            <div key={value.key} className="rounded border border-[rgb(var(--border))] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{value.label}</p>
                <Badge tone={value.category === 'unverified' ? 'danger' : 'warning'}>
                  {value.category}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-[rgb(var(--muted-foreground))]">{value.note}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number
  icon: typeof Database
}) {
  return (
    <Panel className="p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-[rgb(var(--muted-foreground))]">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
        <Icon className="h-5 w-5 text-[rgb(var(--primary))]" aria-hidden />
      </div>
    </Panel>
  )
}
