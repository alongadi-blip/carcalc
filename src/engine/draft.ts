import { DEFAULT_INPUTS } from './defaults'
import type { Inputs } from './model'

type Nullable<T> = { [K in keyof T]: T[K] extends number ? number | null : T[K] }

/** What the form holds: every numeric field may still be empty (null). */
export type Draft = { [S in keyof Inputs]: Nullable<Inputs[S]> }

function mapNumbers<T extends object, R>(obj: T, fn: (v: number | null) => R): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, typeof v === 'number' || v === null ? fn(v) : v]))
}

/** All numeric fields empty; choices and switches keep their defaults. */
export const EMPTY_DRAFT = Object.fromEntries(
  Object.entries(DEFAULT_INPUTS).map(([s, sec]) => [s, mapNumbers(sec, () => null)]),
) as Draft

export function toInputs(d: Draft): Inputs {
  return Object.fromEntries(Object.entries(d).map(([s, sec]) => [s, mapNumbers(sec, v => v ?? 0)])) as unknown as Inputs
}

/** Labels of the fields that must be filled before results make sense. */
export function missingRequired(d: Draft): string[] {
  const missing: string[] = []
  const need = (v: number | null, label: string) => {
    if (v === null || v <= 0) missing.push(label)
  }
  need(d.personal.grossSalary, 'משכורת ברוטו')
  // 0 credit points is legitimate, but an empty field would silently overstate the tax.
  if (d.personal.creditPoints === null) missing.push('נקודות זיכוי')
  need(d.personal.kmPerYear, 'נסועה שנתית')
  need(d.personal.horizonYears, 'תקופת ההשוואה')
  need(d.company.listPrice, 'מחיר מחירון של רכב החברה')
  if (d.company.fuelMode !== 'full') {
    need(d.company.kmPerUnit, 'צריכת דלק של רכב החברה')
    need(d.company.energyPrice, 'מחיר דלק לרכב החברה')
  }
  for (const [car, name] of [
    [d.existing, 'הרכב הקיים'],
    [d.used, 'הרכב המשומש'],
  ] as const) {
    if (!car.enabled) continue
    need(car.value, `שווי ${name}`)
    need(car.kmPerUnit, `צריכת דלק של ${name}`)
    need(car.energyPrice, `מחיר דלק ל${name}`)
  }
  return missing
}
