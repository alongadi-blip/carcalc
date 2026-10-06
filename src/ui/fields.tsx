import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react'

export interface NumProps {
  label: string
  value: number | null
  onChange: (v: number | null) => void
  unit?: string
  hint?: string
  /** Shown greyed out while the field is empty. */
  example?: number
  step?: number
  min?: number
  max?: number
}

const toText = (v: number | null) => (v === null ? '' : String(v))

/** Numeric input; an empty field is `null`, partial text is tolerated while typing. */
export function Num({ label, value, onChange, unit, hint, example, step = 1, min = 0, max }: NumProps) {
  const id = useId()
  const [text, setText] = useState(toText(value))
  useEffect(() => {
    if ((text === '' ? null : Number(text)) !== value) setText(toText(value))
  }, [value])
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-wrap">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          dir="ltr"
          step={step}
          min={min}
          max={max}
          value={text}
          placeholder={example !== undefined ? `לדוגמה ${example.toLocaleString('he-IL')}` : undefined}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onChange={e => {
            const t = e.target.value
            setText(t)
            if (t === '') onChange(null)
            else if (Number.isFinite(Number(t))) onChange(Number(t))
          }}
          onBlur={() => {
            if (text !== '' && !Number.isFinite(Number(text))) {
              setText('')
              onChange(null)
            }
          }}
        />
        {unit && <span className="unit">{unit}</span>}
      </div>
      {hint && (
        <p className="hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
    </div>
  )
}

interface ChoiceProps<T extends string> {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  hint?: string
}

export function Choice<T extends string>({ label, value, options, onChange, hint }: ChoiceProps<T>) {
  const name = useId()
  return (
    <fieldset className="field choice">
      <legend>{label}</legend>
      <div className="segmented">
        {options.map(o => (
          <label key={o.value} className={o.value === value ? 'on' : undefined}>
            <input type="radio" name={name} checked={o.value === value} onChange={() => onChange(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
      {hint && <p className="hint">{hint}</p>}
    </fieldset>
  )
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  const id = useId()
  return (
    <div className="field toggle">
      <label htmlFor={id}>
        <input id={id} type="checkbox" role="switch" checked={checked} onChange={e => onChange(e.target.checked)} />
        <span className="track" aria-hidden />
        {label}
      </label>
      {hint && <p className="hint">{hint}</p>}
    </div>
  )
}

export function Section({
  title,
  icon,
  children,
  aside,
  accent,
}: {
  title: string
  icon: ReactNode
  children: ReactNode
  aside?: ReactNode
  accent?: string
}) {
  return (
    <section className="card section" style={accent ? ({ '--accent': accent } as CSSProperties) : undefined}>
      <header>
        <span className="sec-icon" aria-hidden>
          {icon}
        </span>
        <h2>{title}</h2>
        {aside}
      </header>
      <div className="grid">{children}</div>
    </section>
  )
}
