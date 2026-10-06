// Israeli employee payroll deductions (monthly), 2026 defaults.

export type Propulsion = 'petrol' | 'hybrid' | 'plugin' | 'electric'

export interface TaxParams {
  /** Monthly income-tax brackets; `upTo: null` marks the top bracket. */
  brackets: { upTo: number | null; rate: number }[]
  creditPointValue: number
  surtaxThreshold: number
  surtaxRate: number
  /** Bituach Leumi + health tax, employee share, combined. */
  niReducedThreshold: number
  niReducedRate: number
  niFullRate: number
  niCeiling: number
  /** Car benefit (שווי שימוש). */
  benefitRate: number
  listPriceCap: number
  reductions: Record<Propulsion, number>
}

export const TAX_2026: TaxParams = {
  brackets: [
    { upTo: 7010, rate: 0.1 },
    { upTo: 10060, rate: 0.14 },
    { upTo: 19000, rate: 0.2 },
    { upTo: 25100, rate: 0.31 },
    { upTo: 46690, rate: 0.35 },
    { upTo: null, rate: 0.47 },
  ],
  creditPointValue: 242,
  surtaxThreshold: 60130,
  surtaxRate: 0.03,
  niReducedThreshold: 7703,
  niReducedRate: 0.0427,
  niFullRate: 0.1217,
  niCeiling: 49030,
  benefitRate: 0.0248,
  listPriceCap: 596860,
  reductions: { petrol: 0, hybrid: 580, plugin: 1150, electric: 1380 },
}

export function incomeTax(gross: number, creditPoints: number, p: TaxParams): number {
  let tax = 0
  let lower = 0
  for (const b of p.brackets) {
    const upper = b.upTo ?? Infinity
    if (gross > lower) tax += (Math.min(gross, upper) - lower) * b.rate
    lower = upper
  }
  tax = Math.max(0, tax - creditPoints * p.creditPointValue)
  tax += Math.max(0, gross - p.surtaxThreshold) * p.surtaxRate
  return tax
}

export function nationalInsurance(gross: number, p: TaxParams): number {
  const capped = Math.min(Math.max(gross, 0), p.niCeiling)
  const reduced = Math.min(capped, p.niReducedThreshold)
  return reduced * p.niReducedRate + (capped - reduced) * p.niFullRate
}

export function deductions(gross: number, creditPoints: number, p: TaxParams): number {
  return incomeTax(gross, creditPoints, p) + nationalInsurance(gross, p)
}

/** Extra tax + NI paid because `extra` (cash or benefit) is added on top of `base`. */
export function taxOnExtra(base: number, extra: number, creditPoints: number, p: TaxParams): number {
  return deductions(base + extra, creditPoints, p) - deductions(base, creditPoints, p)
}

export function carBenefit(listPrice: number, propulsion: Propulsion, p: TaxParams): number {
  return Math.max(0, Math.min(listPrice, p.listPriceCap) * p.benefitRate - p.reductions[propulsion])
}
