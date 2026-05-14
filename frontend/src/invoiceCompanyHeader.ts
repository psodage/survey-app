import http from './api/http'

export type InvoicePdfCompanyHeader = {
  companyName: string
  email: string
  officeAddress: string
  gstNumber: string
  contactPhone: string
}

export async function fetchInvoiceCompanyHeader(): Promise<InvoicePdfCompanyHeader | undefined> {
  try {
    const res = await http.get<{ ok: boolean; companyHeader: InvoicePdfCompanyHeader }>(
      '/api/settings/invoice-company-header',
    )
    if (res.data?.ok && res.data.companyHeader) return res.data.companyHeader
  } catch {
    // Letterhead falls back in exportInvoicePdf
  }
  return undefined
}
