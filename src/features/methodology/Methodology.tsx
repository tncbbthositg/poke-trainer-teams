import { Badge } from '../../components/atoms/Badge'
import { Panel, PanelHeader } from '../../components/molecules/Panel'
import type { ApplicationData } from '../../data/loaders'

export function Methodology({ data }: { data: ApplicationData }) {
  return (
    <div className="grid gap-4">
      <Panel>
        <PanelHeader title="Methodology and Sources" subtitle="Unofficial project. Not affiliated with Niantic, The Pokemon Company, PvPoke, Leek Duck, Pokemon GO Hub, or PokeMiners." />
        <div className="grid gap-3 p-3">
          {data.metadata.sources.map((source) => (
            <div key={`${source.sourceName}-${source.sourceUrl}`} className="rounded border border-[rgb(var(--border))] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">{source.sourceName}</h3>
                <Badge tone={source.category === 'sourced' ? 'ok' : 'warning'}>{source.category}</Badge>
              </div>
              <a className="mt-1 block break-all text-xs text-[rgb(var(--primary))]" href={source.sourceUrl} target="_blank" rel="noreferrer">{source.sourceUrl}</a>
              <p className="mt-2 text-xs text-[rgb(var(--muted-foreground))]">Retrieved: {source.retrievedAt}. Version: {source.sourceVersion}. Parser: {source.parserVersion}. License: {source.license}.</p>
              <p className="mt-2 text-sm">{source.notes}</p>
            </div>
          ))}
        </div>
      </Panel>
      <Panel>
        <PanelHeader title="Formulas and Boundaries" />
        <div className="grid gap-3 p-3 text-sm text-[rgb(var(--muted-foreground))]">
          <p>Effective stats use Pokemon GO CP multipliers for the selected level and IVs. Milestone 1 exposes level 40, 15/15/15 attacker calculations.</p>
          <p>Raw bulk proxy is effective defense times effective HP. It is not matchup-specific survivability.</p>
          <p>Time to Charged Attack uses discrete fast-move energy: ceil(energy cost / fast energy gain) times fast-move turns. Leftover energy is preserved for repeat timing displays.</p>
          <p>Focus rankings are experimental heuristics. Practical spam starts from charged-pause-control scoring, then downweights legendary, mythical, Ultra Beast, and high-value raid attacker overlap while slightly upweighting starter candidates to reflect candy competition and build accessibility.</p>
          <p>Battle engine interfaces distinguish combat turns, simulated duration, and wall-clock duration, but Rocket simulation is deferred to Milestone 2.</p>
        </div>
      </Panel>
      <Panel>
        <PanelHeader title="Assumptions and Unknowns" />
        <div className="grid gap-2 p-3 sm:grid-cols-2">
          {data.mechanics.values.map((value) => (
            <div key={value.key} className="rounded border border-[rgb(var(--border))] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{value.label}</p>
                <Badge tone={value.category === 'sourced' ? 'ok' : value.category === 'unverified' ? 'danger' : 'warning'}>{value.category}</Badge>
              </div>
              <p className="mt-1 text-sm">{value.value} {value.unit}</p>
              <p className="mt-2 text-xs text-[rgb(var(--muted-foreground))]">{value.note}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
