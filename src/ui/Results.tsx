import { Trophy } from 'lucide-react'
import type { Result } from '../engine/model'
import { money, monthsLabel } from '../format'
import { CostChart, SERIES_VAR } from './CostChart'

export function Results({ result, years }: { result: Result; years: number }) {
  const sorted = [...result.scenarios].sort((a, b) => a.total - b.total)
  const best = sorted[0]
  const company = result.scenarios[0]
  const privates = sorted.filter(s => s.id !== 'company')
  // The question is always "company car or not": compare the company car with the cheapest private option.
  const rival = best.id === 'company' ? privates[0] : company
  const names = Object.fromEntries(result.scenarios.map(s => [s.id, s.name]))

  return (
    <div className="results" id="results" aria-live="polite">
      {rival ? (
        <div className="verdict card">
          <Trophy size={22} aria-hidden />
          <p>
            לאורך {monthsLabel(years * 12)}, <strong>{best.name}</strong> זול ב-
            <strong>{money(rival.avgMonthly - best.avgMonthly)}</strong> לחודש מ{rival.name}
            <span className="muted"> (סה״כ {money(rival.total - best.total)} נטו)</span>
          </p>
        </div>
      ) : (
        <div className="verdict card neutral">
          <p>הפעילו לפחות חלופה פרטית אחת כדי להשוות מול רכב החברה.</p>
        </div>
      )}

      <div className="tiles">
        {result.scenarios.map(s => (
          <div key={s.id} className={`tile card${s.id === best.id ? ' best' : ''}`}>
            <div className="tile-head">
              <span className="swatch" style={{ background: SERIES_VAR[s.id] }} />
              {s.name}
              {s.id === best.id && rival && <span className="badge">הכי משתלם</span>}
            </div>
            <div className="tile-value">{money(s.avgMonthly)}</div>
            <div className="tile-sub">עלות נטו לחודש · ממוצע</div>
          </div>
        ))}
      </div>

      <div className="card">
        <CostChart result={result} />
        {result.breakEven.length > 0 && (
          <ul className="notes">
            {result.breakEven.map(b => (
              <li key={b.b}>
                נקודת האיזון בין רכב חברה ל{names[b.b]}: אחרי {monthsLabel(b.month)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h3>פירוט חודשי (ממוצע לאורך התקופה)</h3>
        <p className="muted small">שווי השימוש החודשי ברכב החברה: {money(result.benefit)} (ברוטו, נזקף לשכר)</p>
        <div className="breakdowns">
          {result.scenarios.map(s => (
            <table key={s.id} className="breakdown">
              <caption>
                <span className="swatch" style={{ background: SERIES_VAR[s.id] }} />
                {s.name}
              </caption>
              <tbody>
                {s.components.map(c => (
                  <tr key={c.key} className={c.monthly < 0 ? 'income' : undefined}>
                    <th scope="row">{c.label}</th>
                    <td>{money(c.monthly)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">סה״כ לחודש</th>
                  <td>{money(s.avgMonthly)}</td>
                </tr>
              </tfoot>
            </table>
          ))}
        </div>
      </div>
    </div>
  )
}
