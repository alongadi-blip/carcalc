import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { TAX_2026, type TaxParams } from '../engine/tax'
import { Num } from './fields'

const pct = (v: number) => Math.round(v * 10000) / 100

export function TaxSettings({
  open,
  onClose,
  params,
  onChange,
}: {
  open: boolean
  onClose: () => void
  params: TaxParams
  onChange: (p: TaxParams) => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  const set = (patch: Partial<TaxParams>) => onChange({ ...params, ...patch })
  const setBracket = (i: number, patch: Partial<TaxParams['brackets'][number]>) =>
    set({ brackets: params.brackets.map((b, j) => (j === i ? { ...b, ...patch } : b)) })

  return (
    <dialog ref={ref} className="settings" onClose={onClose} aria-labelledby="settings-title">
      <header>
        <h2 id="settings-title">פרמטרי מס — 2026</h2>
        <button className="icon-btn" onClick={onClose} aria-label="סגירה">
          <X size={20} />
        </button>
      </header>
      <div className="settings-body">
        <p className="muted small">הערכים מעודכנים לשנת המס 2026. אפשר לשנות אותם אם יצאו עדכונים או לבדיקת תרחישים.</p>

        <h3>שווי שימוש</h3>
        <div className="grid">
          <Num label="אחוז ממחיר המחירון" unit="%" step={0.01} value={pct(params.benefitRate)} onChange={v => set({ benefitRate: v / 100 })} />
          <Num label="תקרת מחיר מחירון" unit="₪" value={params.listPriceCap} onChange={v => set({ listPriceCap: v })} />
          <Num label="הפחתה — היברידי" unit="₪" value={params.reductions.hybrid} onChange={v => set({ reductions: { ...params.reductions, hybrid: v } })} />
          <Num label="הפחתה — פלאג-אין" unit="₪" value={params.reductions.plugin} onChange={v => set({ reductions: { ...params.reductions, plugin: v } })} />
          <Num label="הפחתה — חשמלי" unit="₪" value={params.reductions.electric} onChange={v => set({ reductions: { ...params.reductions, electric: v } })} />
        </div>

        <h3>מדרגות מס הכנסה (חודשי)</h3>
        <div className="grid brackets">
          {params.brackets.map((b, i) => (
            <div key={i} className="bracket">
              <Num label={`מדרגה ${i + 1} — שיעור`} unit="%" value={pct(b.rate)} onChange={v => setBracket(i, { rate: v / 100 })} />
              {b.upTo !== null ? (
                <Num label="עד הכנסה של" unit="₪" value={b.upTo} onChange={v => setBracket(i, { upTo: v })} />
              ) : (
                <p className="hint bracket-top">ומעלה</p>
              )}
            </div>
          ))}
        </div>

        <h3>זיכויים ומס יסף</h3>
        <div className="grid">
          <Num label="שווי נקודת זיכוי" unit="₪" value={params.creditPointValue} onChange={v => set({ creditPointValue: v })} />
          <Num label="סף מס יסף (חודשי)" unit="₪" value={params.surtaxThreshold} onChange={v => set({ surtaxThreshold: v })} />
          <Num label="שיעור מס יסף" unit="%" value={pct(params.surtaxRate)} onChange={v => set({ surtaxRate: v / 100 })} />
        </div>

        <h3>ביטוח לאומי + מס בריאות (עובד)</h3>
        <div className="grid">
          <Num label="שיעור מופחת" unit="%" step={0.01} value={pct(params.niReducedRate)} onChange={v => set({ niReducedRate: v / 100 })} />
          <Num label="עד הכנסה של" unit="₪" value={params.niReducedThreshold} onChange={v => set({ niReducedThreshold: v })} />
          <Num label="שיעור מלא" unit="%" step={0.01} value={pct(params.niFullRate)} onChange={v => set({ niFullRate: v / 100 })} />
          <Num label="תקרת הכנסה" unit="₪" value={params.niCeiling} onChange={v => set({ niCeiling: v })} />
        </div>
      </div>
      <footer>
        <button className="btn ghost" onClick={() => onChange(structuredClone(TAX_2026))}>
          איפוס לערכי 2026
        </button>
        <button className="btn" onClick={onClose}>
          סגירה
        </button>
      </footer>
    </dialog>
  )
}
