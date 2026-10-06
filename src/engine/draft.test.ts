import { describe, expect, it } from 'vitest'
import { EMPTY_DRAFT, missingRequired, toInputs } from './draft'

describe('draft', () => {
  it('starts with every numeric field empty and choices set', () => {
    expect(EMPTY_DRAFT.personal.grossSalary).toBeNull()
    expect(EMPTY_DRAFT.used.loanMonths).toBeNull()
    expect(EMPTY_DRAFT.company.fuelMode).toBe('full')
    expect(EMPTY_DRAFT.existing.enabled).toBe(true)
  })
  it('empty fields become 0 for the engine', () => {
    const i = toInputs(EMPTY_DRAFT)
    expect(i.personal.grossSalary).toBe(0)
    expect(i.company.propulsion).toBe(EMPTY_DRAFT.company.propulsion)
  })
  it('lists required fields until filled', () => {
    const d = structuredClone(EMPTY_DRAFT)
    d.used.enabled = false
    expect(missingRequired(d)).toContain('משכורת ברוטו')
    d.personal = { ...d.personal, grossSalary: 20000, creditPoints: 0, kmPerYear: 15000, horizonYears: 5 }
    d.company.listPrice = 180000
    d.existing = { ...d.existing, value: 60000, kmPerUnit: 14, energyPrice: 7.3 }
    expect(missingRequired(d)).toEqual([])
  })
})
