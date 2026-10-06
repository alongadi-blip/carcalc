import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Result, ScenarioId } from '../engine/model'
import { money, moneyCompact, monthsLabel } from '../format'

export const SERIES_VAR: Record<ScenarioId, string> = {
  company: 'var(--series-1)',
  existing: 'var(--series-2)',
  used: 'var(--series-3)',
}

interface Row {
  m: number
  [k: string]: number
}

export function CostChart({ result }: { result: Result }) {
  const { scenarios, breakEven } = result
  const n = scenarios[0].cumulative.length
  const data: Row[] = [{ m: 0, ...Object.fromEntries(scenarios.map(s => [s.id, 0])) }]
  for (let i = 0; i < n; i++) {
    data.push({ m: i + 1, ...Object.fromEntries(scenarios.map(s => [s.id, s.cumulative[i]])) })
  }
  const yearTicks = Array.from({ length: n / 12 + 1 }, (_, i) => i * 12)
  const names = Object.fromEntries(scenarios.map(s => [s.id, s.name]))

  return (
    <figure className="chart">
      <figcaption>
        <h3>עלות נטו מצטברת</h3>
        <ul className="legend">
          {scenarios.map(s => (
            <li key={s.id}>
              <span className="swatch" style={{ background: SERIES_VAR[s.id] }} />
              {s.name}
            </li>
          ))}
        </ul>
      </figcaption>
      <div className="chart-box" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 64, bottom: 4, left: 4 }}>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis
              dataKey="m"
              type="number"
              domain={[0, n]}
              ticks={yearTicks}
              tickFormatter={m => (m === 0 ? '0' : `${m / 12}`)}
              stroke="var(--axis)"
              tick={{ fill: 'var(--text-2)', fontSize: 12 }}
              tickLine={false}
              label={{ value: 'שנים', position: 'insideBottomRight', offset: -2, fill: 'var(--text-2)', fontSize: 12 }}
            />
            <YAxis
              tickFormatter={moneyCompact}
              stroke="var(--axis)"
              tick={{ fill: 'var(--text-2)', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <Tooltip
              cursor={{ stroke: 'var(--axis)', strokeWidth: 1 }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div className="tip" dir="rtl">
                    <strong>{label ? `אחרי ${monthsLabel(Number(label))}` : 'התחלה'}</strong>
                    {[...payload]
                      .sort((a, b) => Number(a.value) - Number(b.value))
                      .map(p => (
                        <div key={String(p.dataKey)} className="tip-row">
                          <span className="swatch" style={{ background: SERIES_VAR[p.dataKey as ScenarioId] }} />
                          <span>{names[String(p.dataKey)]}</span>
                          <b>{money(Number(p.value))}</b>
                        </div>
                      ))}
                  </div>
                ) : null
              }
            />
            {breakEven.map(b => (
              <ReferenceLine
                key={b.b}
                x={b.month}
                stroke="var(--text-2)"
                strokeDasharray="4 4"
                label={{ value: 'נקודת איזון', position: 'top', fill: 'var(--text-2)', fontSize: 11 }}
              />
            ))}
            {scenarios.map(s => (
              <Line
                key={s.id}
                dataKey={s.id}
                stroke={SERIES_VAR[s.id]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, stroke: 'var(--surface)', strokeWidth: 2 }}
                isAnimationActive={false}
                label={(props: { x?: number | string; y?: number | string; index?: number }) =>
                  props.index === n ? (
                    <text key={s.id} x={Number(props.x) + 6} y={Number(props.y)} dy={4} fontSize={12} fill="var(--text-1)">
                      {s.name}
                    </text>
                  ) : (
                    <g key={`${s.id}-${props.index}`} />
                  )
                }
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}
