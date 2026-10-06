import { useEffect, useMemo, useState } from 'react'
import { Briefcase, Car, CarFront, Moon, ReceiptText, RotateCcw, Settings2, Sun, UserRound } from 'lucide-react'
import { DEFAULT_INPUTS } from './engine/defaults'
import { calculate, type Inputs, type Result } from './engine/model'
import { money } from './format'
import { TAX_2026, type Propulsion, type TaxParams } from './engine/tax'
import { Choice, Num, Section, Toggle } from './ui/fields'
import { Results } from './ui/Results'
import { TaxSettings } from './ui/TaxSettings'

const STORE_KEY = 'carcalc.v1'

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`${STORE_KEY}.${key}`)
    if (!raw) return fallback
    const saved = JSON.parse(raw)
    // Merge one level deep so fields added in later versions get defaults.
    if (fallback && typeof fallback === 'object' && !Array.isArray(fallback)) {
      const out: Record<string, unknown> = { ...(fallback as Record<string, unknown>) }
      for (const k of Object.keys(fallback)) {
        const f = (fallback as Record<string, unknown>)[k]
        const s = saved?.[k]
        if (s === undefined) continue
        out[k] = f && typeof f === 'object' && !Array.isArray(f) ? { ...f, ...s } : s
      }
      return out as T
    }
    return saved
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(`${STORE_KEY}.${key}`, JSON.stringify(value))
  } catch {
    /* storage unavailable — the app works without it */
  }
}

type Theme = 'auto' | 'light' | 'dark'

/** Compact verdict pinned to the bottom on small screens, where results sit below the form. */
function MobileBar({ result }: { result: Result }) {
  const best = [...result.scenarios].sort((a, b) => a.total - b.total)[0]
  return (
    <div className="mobile-bar">
      <span>
        הכי משתלם: <strong>{best.name}</strong> · {money(best.avgMonthly)} לחודש
      </span>
      <a href="#results">לתוצאות</a>
    </div>
  )
}

const PROPULSION: { value: Propulsion; label: string }[] = [
  { value: 'petrol', label: 'בנזין' },
  { value: 'hybrid', label: 'היברידי' },
  { value: 'plugin', label: 'פלאג-אין' },
  { value: 'electric', label: 'חשמלי' },
]

export default function App() {
  const [inputs, setInputs] = useState<Inputs>(() => load('inputs', DEFAULT_INPUTS))
  const [tax, setTax] = useState<TaxParams>(() => load('tax', TAX_2026))
  const [theme, setTheme] = useState<Theme>(() => load('theme', 'auto' as Theme))
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => save('inputs', inputs), [inputs])
  useEffect(() => save('tax', tax), [tax])
  useEffect(() => {
    save('theme', theme)
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const result = useMemo(() => calculate(inputs, tax), [inputs, tax])

  const upd =
    <K extends keyof Inputs>(section: K) =>
    (patch: Partial<Inputs[K]>) =>
      setInputs(prev => ({ ...prev, [section]: { ...prev[section], ...patch } }))
  const personal = upd('personal')
  const reimb = upd('reimb')
  const company = upd('company')
  const existing = upd('existing')
  const used = upd('used')
  const { personal: p, reimb: r, company: c, existing: e, used: u } = inputs
  const electric = c.propulsion === 'electric'

  const isDark =
    theme === 'dark' || (theme === 'auto' && typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches)

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden>
            <Car size={20} />
          </span>
          <div>
            <h1>רכב חברה או פרטי?</h1>
            <p>מחשבון כדאיות — עלות נטו אחרי מס, לאורך שנים</p>
          </div>
        </div>
        <div className="top-actions">
          <button className="icon-btn" onClick={() => setTheme(isDark ? 'light' : 'dark')} aria-label={isDark ? 'מצב בהיר' : 'מצב כהה'}>
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button className="icon-btn" onClick={() => setSettingsOpen(true)} aria-label="פרמטרי מס">
            <Settings2 size={20} />
          </button>
        </div>
      </header>

      <main className="layout">
        <div className="form">
          <Section title="פרטים אישיים" icon={<UserRound size={18} />}>
            <Num label="משכורת ברוטו חודשית" unit="₪" value={p.grossSalary} onChange={v => personal({ grossSalary: v })} hint="בלי אחזקת רכב ודמי נסיעות — אותם ממלאים בנפרד" />
            <Num label="נקודות זיכוי" step={0.25} value={p.creditPoints} onChange={v => personal({ creditPoints: v })} hint="תושב: 2.25 · תושבת: 2.75 · ועוד לפי ילדים, תואר וכו׳" />
            <Num label="נסועה שנתית" unit='ק"מ' step={1000} value={p.kmPerYear} onChange={v => personal({ kmPerYear: v })} />
            <Num label="תשואה חלופית על הכסף" unit="%" step={0.5} value={p.altReturnPct} onChange={v => personal({ altReturnPct: v })} hint="כמה הכסף שתקוע ברכב היה מרוויח בהשקעה (שנתי, נטו)" />
            <Num label="תקופת ההשוואה" unit="שנים" min={1} max={7} value={p.horizonYears} onChange={v => personal({ horizonYears: Math.min(7, Math.max(1, Math.round(v))) })} />
          </Section>

          <Section title="החזרים שאתה מקבל היום על הרכב" icon={<ReceiptText size={18} />}>
            <Num label="אחזקת רכב (ברוטו לחודש)" unit="₪" value={r.maintenanceGross} onChange={v => reimb({ maintenanceGross: v })} hint="הרכיב בתלוש — נכנס לשכר החייב במס" />
            <Num label="דמי נסיעות (ברוטו לחודש)" unit="₪" value={r.travelGross} onChange={v => reimb({ travelGross: v })} />
            <Num label="הפרשות מעסיק על אחזקת רכב" unit="%" step={0.5} value={r.employerDepositsPct} onChange={v => reimb({ employerDepositsPct: v })} hint="פנסיה / קרן השתלמות אם המעסיק מפריש גם על הרכיב הזה. בדרך כלל 0" />
            <p className="hint wide">ההחזרים נחשבים כהכנסה נטו בחלופות הרכב הפרטי, ואובדים במעבר לרכב חברה.</p>
          </Section>

          <Section title="רכב חברה" icon={<Briefcase size={18} />} accent="var(--series-1)">
            <Num label="מחיר מחירון" unit="₪" step={1000} value={c.listPrice} onChange={v => company({ listPrice: v })} />
            <Choice label="סוג הנעה" value={c.propulsion} options={PROPULSION} onChange={v => company({ propulsion: v, ...(v === 'electric' ? { kmPerUnit: 6, energyPrice: 0.65 } : c.propulsion === 'electric' ? { kmPerUnit: 16, energyPrice: 7.3 } : {}) })} />
            <Num label="השתתפות עצמית חודשית" unit="₪" value={c.participation} onChange={v => company({ participation: v })} hint="מנוכה מהנטו בתלוש" />
            <Toggle label="המעסיק מגלם את המס על שווי השימוש" checked={c.employerGrossUp} onChange={v => company({ employerGrossUp: v })} />
            <Choice
              label="דלק / טעינה"
              value={c.fuelMode}
              options={[
                { value: 'full', label: 'מלא על המעסיק' },
                { value: 'cap', label: 'עד תקרה' },
                { value: 'none', label: 'עליי' },
              ]}
              onChange={v => company({ fuelMode: v })}
            />
            {c.fuelMode === 'cap' && <Num label="תקרת דלק חודשית" unit="₪" value={c.fuelCap} onChange={v => company({ fuelCap: v })} />}
            {c.fuelMode !== 'none' && (
              <Num label="שווי דלק בתלוש" unit="₪" value={c.fuelBenefitGross} onChange={v => company({ fuelBenefitGross: v })} hint="אם המעסיק זוקף שווי על הדלק. אם לא — 0" />
            )}
            <Num label={electric ? 'יעילות (ק"מ לקוט"ש)' : 'צריכה (ק"מ לליטר)'} step={0.5} value={c.kmPerUnit} onChange={v => company({ kmPerUnit: v })} />
            <Num label={electric ? 'מחיר לקוט"ש' : 'מחיר לליטר'} unit="₪" step={0.05} value={c.energyPrice} onChange={v => company({ energyPrice: v })} />
            <Num label='מכסת ק"מ שנתית' unit='ק"מ' step={1000} value={c.allowedKmPerYear} onChange={v => company({ allowedKmPerYear: v })} />
            <Num label='חיוב לק"מ עודף' unit="₪" step={0.05} value={c.extraKmPrice} onChange={v => company({ extraKmPrice: v })} />
            <Num label="הוצאות נוספות מהכיס" unit="₪ לחודש" value={c.otherMonthly} onChange={v => company({ otherMonthly: v })} hint="חניה, כבישי אגרה וכו׳" />
          </Section>

          <Section
            title="הרכב הקיים שלי"
            icon={<CarFront size={18} />}
            accent="var(--series-2)"
            aside={<Toggle label="להשוות" checked={e.enabled} onChange={v => existing({ enabled: v })} />}
          >
            {e.enabled && (
              <>
                <Num label="שווי נוכחי (מחירון יד שנייה)" unit="₪" step={1000} value={e.value} onChange={v => existing({ value: v })} />
                <Num label="ירידת ערך שנתית" unit="%" value={e.depreciationPct} onChange={v => existing({ depreciationPct: v })} hint="רכב בן 3–7 שנים: בדרך כלל 8%–12%" />
                <Num label="ביטוח חובה + מקיף" unit="₪ לשנה" step={100} value={e.insuranceYear} onChange={v => existing({ insuranceYear: v })} />
                <Num label="אגרת רישוי + טסט" unit="₪ לשנה" step={100} value={e.licenseYear} onChange={v => existing({ licenseYear: v })} />
                <Num label="טיפולים ותיקונים" unit="₪ לשנה" step={100} value={e.maintenanceYear} onChange={v => existing({ maintenanceYear: v })} />
                <Num label="התייקרות טיפולים בשנה" unit="%" value={e.maintenanceGrowthPct} onChange={v => existing({ maintenanceGrowthPct: v })} />
                <Num label='צריכה (ק"מ לליטר)' step={0.5} value={e.kmPerUnit} onChange={v => existing({ kmPerUnit: v })} />
                <Num label="מחיר לליטר" unit="₪" step={0.05} value={e.energyPrice} onChange={v => existing({ energyPrice: v })} />
                <Num label="הוצאות נוספות" unit="₪ לחודש" value={e.otherMonthly} onChange={v => existing({ otherMonthly: v })} hint="חניה, כבישי אגרה וכו׳" />
                <Toggle
                  label="אשאיר את הרכב גם אם אקח רכב חברה"
                  checked={e.keepWithCompanyCar}
                  onChange={v => existing({ keepWithCompanyCar: v })}
                  hint="כבוי: הרכב נמכר במעבר לרכב חברה. דלוק: עלויות ההחזקה שלו (בלי דלק) נוספות לחלופת רכב החברה"
                />
              </>
            )}
          </Section>

          <Section
            title="קניית רכב משומש"
            icon={<Car size={18} />}
            accent="var(--series-3)"
            aside={<Toggle label="להשוות" checked={u.enabled} onChange={v => used({ enabled: v })} />}
          >
            {u.enabled && (
              <>
                <Num label="מחיר הרכב" unit="₪" step={1000} value={u.value} onChange={v => used({ value: v })} />
                <Num label="עלויות קנייה חד-פעמיות" unit="₪" step={100} value={u.purchaseCosts} onChange={v => used({ purchaseCosts: v })} hint="העברת בעלות, בדיקה במכון, תיקונים ראשונים" />
                <Num label="ירידת ערך שנתית" unit="%" value={u.depreciationPct} onChange={v => used({ depreciationPct: v })} />
                <Choice
                  label="מימון"
                  value={u.financing}
                  options={[
                    { value: 'cash', label: 'מזומן' },
                    { value: 'loan', label: 'הלוואה' },
                  ]}
                  onChange={v => used({ financing: v })}
                />
                {u.financing === 'loan' && (
                  <>
                    <Num label="הון עצמי" unit="₪" step={1000} value={u.downPayment} onChange={v => used({ downPayment: v })} />
                    <Num label="ריבית שנתית" unit="%" step={0.1} value={u.loanRatePct} onChange={v => used({ loanRatePct: v })} />
                    <Num label="תקופת הלוואה" unit="חודשים" step={12} value={u.loanMonths} onChange={v => used({ loanMonths: v })} />
                  </>
                )}
                <Num label="ביטוח חובה + מקיף" unit="₪ לשנה" step={100} value={u.insuranceYear} onChange={v => used({ insuranceYear: v })} />
                <Num label="אגרת רישוי + טסט" unit="₪ לשנה" step={100} value={u.licenseYear} onChange={v => used({ licenseYear: v })} />
                <Num label="טיפולים ותיקונים" unit="₪ לשנה" step={100} value={u.maintenanceYear} onChange={v => used({ maintenanceYear: v })} />
                <Num label="התייקרות טיפולים בשנה" unit="%" value={u.maintenanceGrowthPct} onChange={v => used({ maintenanceGrowthPct: v })} />
                <Num label='צריכה (ק"מ לליטר)' step={0.5} value={u.kmPerUnit} onChange={v => used({ kmPerUnit: v })} />
                <Num label="מחיר לליטר" unit="₪" step={0.05} value={u.energyPrice} onChange={v => used({ energyPrice: v })} />
                <Num label="הוצאות נוספות" unit="₪ לחודש" value={u.otherMonthly} onChange={v => used({ otherMonthly: v })} />
              </>
            )}
          </Section>

          <button className="btn ghost reset" onClick={() => setInputs(structuredClone(DEFAULT_INPUTS))}>
            <RotateCcw size={16} aria-hidden /> איפוס כל השדות
          </button>
        </div>

        <aside className="side">
          <Results result={result} years={p.horizonYears} />
        </aside>
      </main>

      <MobileBar result={result} />

      <footer className="foot">
        <p>
          המחשבון מספק הערכה בלבד ואינו מהווה ייעוץ מס או ייעוץ פיננסי. החישוב מניח שכר ופרמטרי מס קבועים לאורך התקופה.
        </p>
      </footer>

      <TaxSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} params={tax} onChange={setTax} />
    </>
  )
}
