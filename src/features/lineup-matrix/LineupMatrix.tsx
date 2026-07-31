import { Badge } from '../../components/atoms/Badge'
import { Panel, PanelHeader } from '../../components/molecules/Panel'
import type { ApplicationData } from '../../data/loaders'

export function LineupMatrix({ data }: { data: ApplicationData }) {
  return (
    <Panel>
      <PanelHeader title="Lineup Matrix Scaffold" subtitle="Lineup records are visible with confidence labels. Win/loss cells are intentionally not calculated yet." />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-[rgb(var(--muted)/0.55)] text-xs text-[rgb(var(--muted-foreground))]">
            <tr>
              <th className="px-3 py-2">Trainer</th>
              <th className="px-3 py-2">Class</th>
              <th className="px-3 py-2">Slot 1</th>
              <th className="px-3 py-2">Slot 2</th>
              <th className="px-3 py-2">Slot 3</th>
              <th className="px-3 py-2">Confidence</th>
              <th className="px-3 py-2">Pair result</th>
            </tr>
          </thead>
          <tbody>
            {data.rocket.lineups.map((lineup) => (
              <tr key={lineup.id} className="border-t border-[rgb(var(--border))]">
                <td className="px-3 py-2 font-medium">{lineup.trainerName}</td>
                <td className="px-3 py-2">{lineup.trainerClass}</td>
                {lineup.slots.map((slot) => (
                  <td key={slot.slot} className="px-3 py-2">{slot.pokemonIds.join(', ')}</td>
                ))}
                <td className="px-3 py-2"><Badge tone={lineup.sourceAgreement === 'verified-agreement' ? 'ok' : 'warning'}>{lineup.sourceAgreement}</Badge></td>
                <td className="px-3 py-2"><Badge tone="danger">Not simulated</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
