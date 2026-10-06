import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react'

interface NumProps {
  label: string
  value: number
  onChange: (v: number) => void
  unit?: string
  hint?: string
  step?: number
  min?: number
  max?: number
}

/** Numeric input that tolerates empty / partial text while typing. */
export function Num({ label, value, onChange, unit, hint, step = 1, min = 0, max }: NumProps) {
  const id = useId()
  const [text, setText] = useState(String(value))
  useEffect(() => {
    if (Number(text) !== value) setText(String(value))
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
          aria-describedby={hint ? `${id}-hint` : undefined}
          onChange={e => {
            setText(e.target.value)
            const n = Number(e.target.value)
            if (e.target.value !== '' && Number.isFinite(n)) onChange(n)
          }}
          onBlur={() => {
            if (text === '' || !Number.isFinite(Number(text))) {
              setText('0')
              onChange(0)
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
