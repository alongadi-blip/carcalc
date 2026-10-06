import { carBenefit, taxOnExtra, type Propulsion, type TaxParams } from './tax'

export interface Personal {
  grossSalary: number
  creditPoints: number
  kmPerYear: number
  /** Annual net return the money could earn elsewhere, in %. */
  altReturnPct: number
  horizonYears: number
}

/** Car-related pay the employee gets today with a private car — lost with a company car. */
export interface Reimbursements {
  maintenanceGross: number
  travelGross: number
  /** Employer pension/study-fund deposits on the maintenance pay, in % of it. */
  employerDepositsPct: number
}

export type FuelMode = 'full' | 'cap' | 'none'

export interface CompanyCar {
  listPrice: number
  propulsion: Propulsion
  participation: number
  fuelMode: FuelMode
  fuelCap: number
  fuelBenefitGross: number
  employerGrossUp: boolean
  kmPerUnit: number
  energyPrice: number
  allowedKmPerYear: number
  extraKmPrice: number
  otherMonthly: number
}

export interface PrivateCar {
  enabled: boolean
  value: number
  depreciationPct: number
  insuranceYear: number
  licenseYear: number
  maintenanceYear: number
  maintenanceGrowthPct: number
  kmPerUnit: number
  energyPrice: number
  otherMonthly: number
}

export interface ExistingCar extends PrivateCar {
  /** Keep the existing car even when taking the company car (its fixed costs stay). */
  keepWithCompanyCar: boolean
}

export interface UsedCar extends PrivateCar {
  purchaseCosts: number
  financing: 'cash' | 'loan'
  downPayment: number
  loanRatePct: number
  loanMonths: number
}

export interface Inputs {
  personal: Personal
  reimb: Reimbursements
  company: CompanyCar
  existing: ExistingCar
  used: UsedCar
}

export type ScenarioId = 'company' | 'existing' | 'used'

export interface Component {
  key: string
  label: string
  /** Average monthly amount over the horizon; negative = income. */
  monthly: number
}

export interface Scenario {
  id: ScenarioId
  name: string
  months: number[]
  cumulative: number[]
  components: Component[]
  avgMonthly: number
  total: number
}

export interface Result {
  scenarios: Scenario[]
  benefit: number
  breakEven: { a: ScenarioId; b: ScenarioId; month: number }[]
}

class Ledger {
  private sums = new Map<string, { label: string; total: number }>()
  add(key: string, label: string, amount: number) {
    const e = this.sums.get(key)
    if (e) e.total += amount
    else this.sums.set(key, { label, total: amount })
  }
  components(months: number): Component[] {
    return [...this.sums.entries()]
      .map(([key, { label, total }]) => ({ key, label, monthly: total / months }))
      .filter(c => Math.abs(c.monthly) >= 0.5)
  }
}

function fuelPerMonth(kmPerYear: number, kmPerUnit: number, energyPrice: number): number {
  return kmPerUnit > 0 ? (kmPerYear / 12 / kmPerUnit) * energyPrice : 0
}

function loanPayment(principal: number, annualRatePct: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0
  const r = annualRatePct / 100 / 12
  return r === 0 ? principal / months : (principal * r) / (1 - Math.pow(1 + r, -months))
}

/** Ownership costs of one month for a privately held car (excluding fuel). */
function ownershipMonth(
  car: PrivateCar,
  m: number,
  altReturnPct: number,
  debt: number,
  ledger: Ledger,
): number {
  const d = car.depreciationPct / 100
  const prevValue = car.value * Math.pow(1 - d, (m - 1) / 12)
  const value = car.value * Math.pow(1 - d, m / 12)
  const year = Math.floor((m - 1) / 12)
  const items: [string, string, number][] = [
    ['depreciation', 'פחת (ירידת ערך)', prevValue - value],
    ['opportunity', 'תשואה אבודה על ההון ברכב', Math.max(0, prevValue - debt) * (altReturnPct / 100 / 12)],
    ['insurance', 'ביטוח', car.insuranceYear / 12],
    ['license', 'אגרת רישוי וטסט', car.licenseYear / 12],
    ['maintenance', 'טיפולים ותיקונים', (car.maintenanceYear / 12) * Math.pow(1 + car.maintenanceGrowthPct / 100, year)],
  ]
  let sum = 0
  for (const [k, l, v] of items) {
    ledger.add(k, l, v)
    sum += v
  }
  return sum
}

function netReimbursements(inp: Inputs, p: TaxParams): number {
  const { reimb, personal } = inp
  const gross = reimb.maintenanceGross + reimb.travelGross
  const net = gross - taxOnExtra(personal.grossSalary, gross, personal.creditPoints, p)
  return net + reimb.maintenanceGross * (reimb.employerDepositsPct / 100)
}

function finish(id: ScenarioId, name: string, monthly: number[], ledger: Ledger): Scenario {
  const cumulative: number[] = []
  let acc = 0
  for (const v of monthly) cumulative.push((acc += v))
  return {
    id,
    name,
    months: monthly,
    cumulative,
    components: ledger.components(monthly.length),
    avgMonthly: acc / monthly.length,
    total: acc,
  }
}

function companyScenario(inp: Inputs, p: TaxParams, benefit: number): Scenario {
  const { personal, company: c, existing } = inp
  const n = personal.horizonYears * 12
  const ledger = new Ledger()
  const fuelCost = fuelPerMonth(personal.kmPerYear, c.kmPerUnit, c.energyPrice)
  const fuelPaid = c.fuelMode === 'full' ? 0 : c.fuelMode === 'cap' ? Math.max(0, fuelCost - c.fuelCap) : fuelCost
  const fuelBenefit = c.fuelMode === 'none' ? 0 : c.fuelBenefitGross
  const tax = c.employerGrossUp
    ? 0
    : taxOnExtra(personal.grossSalary, benefit + fuelBenefit, personal.creditPoints, p)
  const extraKm = (Math.max(0, personal.kmPerYear - c.allowedKmPerYear) * c.extraKmPrice) / 12
  const lostReimb = netReimbursements(inp, p)
  const keepExisting = existing.enabled && existing.keepWithCompanyCar

  const monthly: number[] = []
  for (let m = 1; m <= n; m++) {
    const items: [string, string, number][] = [
      ['benefitTax', 'מס על שווי שימוש', tax],
      ['participation', 'השתתפות עצמית', c.participation],
      ['fuel', 'דלק / חשמל מהכיס', fuelPaid],
      ['extraKm', 'חיוב ק"מ עודפים', extraKm],
      ['other', 'הוצאות נוספות', c.otherMonthly],
      ['lostReimb', 'החזרים שאובדים (נטו)', lostReimb],
    ]
    let sum = 0
    for (const [k, l, v] of items) {
      ledger.add(k, l, v)
      sum += v
    }
    if (keepExisting) {
      const sub = new Ledger()
      const v = ownershipMonth(existing, m, personal.altReturnPct, 0, sub)
      ledger.add('keptCar', 'החזקת הרכב הקיים (בלי דלק)', v)
      sum += v
    }
    monthly.push(sum)
  }
  return finish('company', 'רכב חברה', monthly, ledger)
}

function privateScenario(
  id: ScenarioId,
  name: string,
  car: PrivateCar,
  inp: Inputs,
  p: TaxParams,
  loan?: { principal: number; ratePct: number; months: number },
  upfront = 0,
): Scenario {
  const { personal } = inp
  const n = personal.horizonYears * 12
  const ledger = new Ledger()
  const fuel = fuelPerMonth(personal.kmPerYear, car.kmPerUnit, car.energyPrice)
  const reimb = netReimbursements(inp, p)
  const payment = loan ? loanPayment(loan.principal, loan.ratePct, loan.months) : 0
  let debt = loan?.principal ?? 0

  const monthly: number[] = []
  for (let m = 1; m <= n; m++) {
    let sum = ownershipMonth(car, m, personal.altReturnPct, debt, ledger)
    if (loan && debt > 0) {
      const interest = debt * (loan.ratePct / 100 / 12)
      debt = Math.max(0, debt - (payment - interest))
      ledger.add('interest', 'ריבית הלוואה', interest)
      sum += interest
    }
    if (m === 1 && upfront) {
      ledger.add('upfront', 'עלויות רכישה חד-פעמיות', upfront)
      sum += upfront
    }
    const items: [string, string, number][] = [
      ['fuel', 'דלק / חשמל', fuel],
      ['other', 'הוצאות נוספות', car.otherMonthly],
      ['reimb', 'החזרים מהמעסיק (נטו)', -reimb],
    ]
    for (const [k, l, v] of items) {
      ledger.add(k, l, v)
      sum += v
    }
    monthly.push(sum)
  }
  return finish(id, name, monthly, ledger)
}

/** Ignore crossings caused only by one-off upfront costs in the first months. */
const MIN_BREAK_EVEN_MONTH = 4

/** Last month where the cumulative lines cross — the one that decides the final ranking. */
function findBreakEven(a: Scenario, b: Scenario): number {
  for (let i = a.cumulative.length - 1; i >= 1; i--) {
    const before = a.cumulative[i - 1] - b.cumulative[i - 1]
    const after = a.cumulative[i] - b.cumulative[i]
    if (before !== 0 && Math.sign(before) !== Math.sign(after)) return i + 1 >= MIN_BREAK_EVEN_MONTH ? i + 1 : 0
  }
  return 0
}

export function calculate(inp: Inputs, p: TaxParams): Result {
  const benefit = carBenefit(inp.company.listPrice, inp.company.propulsion, p)
  const scenarios: Scenario[] = [companyScenario(inp, p, benefit)]
  if (inp.existing.enabled) scenarios.push(privateScenario('existing', 'הרכב הקיים', inp.existing, inp, p))
  if (inp.used.enabled) {
    const u = inp.used
    const loan =
      u.financing === 'loan'
        ? { principal: Math.max(0, u.value - u.downPayment), ratePct: u.loanRatePct, months: u.loanMonths }
        : undefined
    scenarios.push(privateScenario('used', 'רכב משומש', u, inp, p, loan, u.purchaseCosts))
  }
  const breakEven: Result['breakEven'] = []
  for (const s of scenarios.slice(1)) {
    const month = findBreakEven(scenarios[0], s)
    if (month) breakEven.push({ a: 'company', b: s.id, month })
  }
  return { scenarios, benefit, breakEven }
}
