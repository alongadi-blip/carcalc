# רכב חברה או פרטי? — CarCalc

Public calculator comparing a company car (רכב צמוד) with keeping a private car in Israel: net monthly cost after tax and cumulative cost over 1–7 years.

**Live:** https://carcalc-il.web.app

- Exact marginal tax on the car benefit (שווי שימוש) from gross salary and credit points — income tax brackets, surtax, Bituach Leumi + health tax (2026 values, editable in-app).
- Lost car reimbursements (אחזקת רכב, דמי נסיעות) when switching to a company car.
- Private options: the car you already own, or buying a used car (cash with opportunity cost, or a loan).
- Company car: participation, fuel (full / cap / none), fuel benefit, extra-km charges, EV/hybrid reductions, employer gross-up.

## Develop

```bash
npm install
npm run dev
npm test
```

## Deploy

```bash
npm run build
firebase deploy --only hosting --project carcalc-il
```

The calculation engine lives in `src/engine/` (pure functions, unit-tested).
