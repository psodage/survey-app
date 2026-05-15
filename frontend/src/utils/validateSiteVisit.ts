export type BillingLineInput = {
  particular: string
  quantity: string
  rate: string
  amount: string
}

export type SiteVisitValidationInput = {
  client: string
  site: string
  machine: string
  billingLines: BillingLineInput[]
  billingOtherCharges: string
  amountRupees: number
}

export function validateSiteVisitForm(input: SiteVisitValidationInput): string | null {
  if (!input.client.trim()) return 'Please select a client.'
  if (!input.site.trim()) return 'Please select a site.'
  if (!input.machine.trim() || input.machine === '—') {
    return 'Machine is not set for this site. Link an instrument to the site first.'
  }

  const hasBillingLine = input.billingLines.some((line) => {
    const label = line.particular.trim()
    const q = parseFloat(line.quantity.replace(/[^\d.-]/g, '')) || 0
    const r = parseFloat(line.rate.replace(/[^\d.-]/g, '')) || 0
    const flat = parseFloat(line.amount.replace(/[^\d.-]/g, '')) || 0
    return Boolean(label) && (q * r > 0 || flat > 0)
  })

  if (!hasBillingLine) {
    return 'Add at least one billing line with a particular and amount.'
  }

  if (!Number.isFinite(input.amountRupees) || input.amountRupees <= 0) {
    return 'Total amount must be greater than zero.'
  }

  const other = parseFloat(input.billingOtherCharges.replace(/[^\d.-]/g, '')) || 0
  if (other < 0) return 'Other charges cannot be negative.'

  return null
}
