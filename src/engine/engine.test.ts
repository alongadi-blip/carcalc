import { describe, expect, it } from 'vitest'
import { carBenefit, incomeTax, nationalInsurance, taxOnExtra, TAX_2026 as P } from './tax'
import { calculate } from './model'
import { DEFAULT_INPUTS } from './defaults'

const clone = () => structuredClone(DEFAULT_INPUTS)

describe('tax', () => {
  it('income tax through brackets minus credit points', () => {
    // 7010*.1 + 3050*.14 + 8940*.2 = 701 + 427 + 1788 = 2916; minus 2.25*242 = 544.5
    expect(incomeTax(20000, 2.25, P)).toBeCloseTo(2916 + 1000 * 0.31 - 544.5, 2)
  })
  it('credit points never make tax negative', () => {
    expect(incomeTax(3000, 2.25, P)).toBe(0)
  })
  it('surtax above threshold', () => {
    expect(incomeTax(70000, 0, P) - incomeTax(60130, 0, P)).toBeCloseTo(9870 * 0.5, 2)
  })
  it('national insurance two tiers and ceiling', () => {
    expect(nationalInsurance(7703, P)).toBeCloseTo(7703 * 0.0427, 4)
    expect(nationalInsurance(60000, P)).toBeCloseTo(nationalInsurance(49030, P), 4)
  })
  it('marginal tax on benefit crosses brackets', () => {
    // 18,500 + 1,000: 500 at 20%+12.17%, 500 at 31%+12.17%
    expect(taxOnExtra(18500, 1000, 2.25, P)).toBeCloseTo(500 * 0.3217 + 500 * 0.4317, 4)
  })
  it('car benefit with cap and reduction', () => {
    expect(carBenefit(200000, 'petrol', P)).toBeCloseTo(4960, 4)
    expect(carBenefit(200000, 'electric', P)).toBeCloseTo(4960 - 1380, 4)
    expect(carBenefit(1_000_000, 'petrol', P)).toBeCloseTo(596860 * 0.0248, 4)
  })
})

describe('model', () => {
  it('produces one scenario per enabled alternative with horizon length', () => {
    const r = calculate(DEFAULT_INPUTS, P)
    expect(r.scenarios.map(s => s.id)).toEqual(['company', 'existing', 'used'])
    for (const s of r.scenarios) expect(s.cumulative).toHaveLength(60)
  })
  it('employer gross-up removes the benefit tax', () => {
    const i = clone()
    i.company.employerGrossUp = true
    const c = calculate(i, P).scenarios[0]
    expect(c.components.find(x => x.key === 'benefitTax')).toBeUndefined()
  })
  it('fuel cap charges only the excess', () => {
    const i = clone()
    i.company.fuelMode = 'cap'
    i.company.fuelCap = 500
    const fuel = (20000 / 12 / 18) * 7.3
    const c = calculate(i, P).scenarios[0]
    expect(c.components.find(x => x.key === 'fuel')!.monthly).toBeCloseTo(fuel - 500, 4)
  })
  it('lost reimbursements equal the private-side reimbursement income', () => {
    const r = calculate(DEFAULT_INPUTS, P)
    const lost = r.scenarios[0].components.find(x => x.key === 'lostReimb')!.monthly
    const got = r.scenarios[1].components.find(x => x.key === 'reimb')!.monthly
    expect(lost).toBeCloseTo(-got, 6)
  })
  it('depreciation over horizon equals value lost', () => {
    const i = clone()
    const s = calculate(i, P).scenarios[1]
    const dep = s.components.find(x => x.key === 'depreciation')!.monthly * 60
    expect(dep).toBeCloseTo(70000 * (1 - Math.pow(0.9, 5)), 4)
  })
  it('loan adds interest and lowers opportunity cost', () => {
    const i = clone()
    const cash = calculate(i, P).scenarios[2]
    i.used.financing = 'loan'
    const loan = calculate(i, P).scenarios[2]
    expect(loan.components.find(x => x.key === 'interest')!.monthly).toBeGreaterThan(0)
    const opp = (s: typeof cash) => s.components.find(x => x.key === 'opportunity')!.monthly
    expect(opp(loan)).toBeLessThan(opp(cash))
  })
  it('detects break-even when cumulative lines cross', () => {
    const i = clone()
    i.used.enabled = false
    // Company: flat cost. Existing car: cheap at first, maintenance grows fast.
    i.reimb = { maintenanceGross: 0, travelGross: 0, employerDepositsPct: 0 }
    i.company.employerGrossUp = true
    i.company.participation = 1000
    i.existing = { ...i.existing, value: 0, insuranceYear: 0, licenseYear: 0, maintenanceYear: 6000, maintenanceGrowthPct: 100, kmPerUnit: 0 }
    const r = calculate(i, P)
    expect(r.breakEven).toHaveLength(1)
    expect(r.breakEven[0].month).toBeGreaterThan(12)
  })
})
