import http from './api/http'
import type { InvoicePdfBankColumns } from './exportInvoicePdf'

export async function fetchInvoiceBankColumns(): Promise<InvoicePdfBankColumns | undefined> {
  try {
    const res = await http.get<{ ok: boolean; bankColumns: InvoicePdfBankColumns }>(
      '/api/settings/invoice-bank-columns',
    )
    if (res.data?.ok && res.data.bankColumns) return res.data.bankColumns
  } catch {
    // PDF still renders; empty columns show "—" until the API is reachable
  }
  return undefined
}
