const ils = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 })
const compact = new Intl.NumberFormat('he-IL', { notation: 'compact', maximumFractionDigits: 1 })

export const money = (v: number) => ils.format(Math.round(v) === 0 ? 0 : v)
export const moneyCompact = (v: number) => `₪${compact.format(v)}`

export function monthsLabel(m: number): string {
  const y = Math.floor(m / 12)
  const r = m % 12
  if (!y) return `${r} חודשים`
  const years = y === 1 ? 'שנה' : y === 2 ? 'שנתיים' : `${y} שנים`
  return r ? `${years} ו-${r} חודשים` : years
}
