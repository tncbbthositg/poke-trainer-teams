import { useMemo, useState } from 'react'
import { Badge } from '../../components/atoms/Badge'
import { Panel, PanelHeader } from '../../components/molecules/Panel'
import type { ApplicationData } from '../../data/loaders'
import { createNotSimulatedResult } from '../../domain/battle/engine'
import { analyzeMoveset } from '../../domain/moves/analytics'
import { firstLegalMoves } from '../shared/dataHelpers'

export function PairBuilder({ data }: { data: ApplicationData }) {
  const [leadId, setLeadId] = useState(data.pokemon.candidates[0].id)
  const [backupId, setBackupId] = useState(data.pokemon.candidates[1].id)
  const [trainerLevel, setTrainerLevel] = useState(50)
  const [strategy, setStrategy] = useState('charge-asap')
  const lead = data.pokemon.candidates.find((candidate) => candidate.id === leadId) ?? data.pokemon.candidates[0]
  const backup = data.pokemon.candidates.find((candidate) => candidate.id === backupId) ?? data.pokemon.candidates[1]
  const result = useMemo(
    () => createNotSimulatedResult('Rocket simulator is deferred to Milestone 2.'),
    [],
  )
  const leadMoves = firstLegalMoves(lead, data)
  const backupMoves = firstLegalMoves(backup, data)
  const leadAnalytics = analyzeMoveset(lead, leadMoves.fastMove, leadMoves.chargedMoves)
  const backupAnalytics = analyzeMoveset(backup, backupMoves.fastMove, backupMoves.chargedMoves)

  return (
    <div className="grid gap-4">
      <Panel>
        <PanelHeader title="Pair Builder" subtitle="Build an ordered pair with visible assumptions. Universal pass/fail is not simulated in Milestone 1." right={<Badge tone="warning">No ranking claim</Badge>} />
        <div className="grid gap-3 p-3 md:grid-cols-4">
          <Select label="Lead" value={leadId} onChange={setLeadId} options={data.pokemon.candidates.map((candidate) => [candidate.id, candidate.name])} />
          <Select label="Backup" value={backupId} onChange={setBackupId} options={data.pokemon.candidates.map((candidate) => [candidate.id, candidate.name])} />
          <label className="grid gap-1 text-xs font-medium text-[rgb(var(--muted-foreground))]">
            Trainer Level
            <input type="number" min={1} max={50} value={trainerLevel} onChange={(event) => setTrainerLevel(Number(event.target.value))} className="h-9 rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--panel))] px-2 text-sm text-[rgb(var(--foreground))]" />
          </label>
          <Select label="Strategy" value={strategy} onChange={setStrategy} options={[['charge-asap', 'Charge ASAP'], ['fastest-expected-knockout', 'Fastest expected knockout'], ['shield-breaker', 'Shield breaker'], ['preserve-lead', 'Preserve lead'], ['minimal-interaction', 'Minimal interaction']]} />
        </div>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <PairSummary name={lead.name} role="Lead" fast={leadMoves.fastMove.name} analytics={leadAnalytics} />
        <PairSummary name={backup.name} role="Backup" fast={backupMoves.fastMove.name} analytics={backupAnalytics} />
      </div>
      <Panel className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="danger">Universal status unknown</Badge>
          <Badge tone="info">Trainer Level {trainerLevel} demo input</Badge>
          <Badge tone="warning">{strategy}</Badge>
        </div>
        <p className="mt-3 text-sm text-[rgb(var(--muted-foreground))]">
          {result.events[0].message} Third-slot use is prohibited by the model boundary, but battle outcomes are not evaluated until Rocket opponent mechanics are implemented.
        </p>
      </Panel>
    </div>
  )
}

function PairSummary({
  name,
  role,
  fast,
  analytics,
}: {
  name: string
  role: string
  fast: string
  analytics: ReturnType<typeof analyzeMoveset>
}) {
  return (
    <Panel className="p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[rgb(var(--muted-foreground))]">{role}</p>
          <h3 className="text-base font-semibold">{name}</h3>
        </div>
        <Badge tone="info">{analytics.decisionComplexity} complexity</Badge>
      </div>
      <p className="mt-3 text-sm">{fast}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        {analytics.timings.map((timing) => (
          <div key={timing.chargedMoveId} className="rounded border border-[rgb(var(--border))] p-2">
            <p className="font-medium">{timing.chargedMoveName}</p>
            <p className="text-xs text-[rgb(var(--muted-foreground))]">{timing.firstFastMoveCount} fast moves to first use</p>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<[string, string]>
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-[rgb(var(--muted-foreground))]">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--panel))] px-2 text-sm text-[rgb(var(--foreground))]">
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  )
}
