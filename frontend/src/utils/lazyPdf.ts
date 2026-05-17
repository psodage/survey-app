import type { InvoicePdfData } from '../exportInvoicePdf'
import type { SiteReportPdfData } from '../exportSiteReportPdf'

export async function lazyExportInvoicePdf(data: InvoicePdfData) {
  const { exportInvoicePdf } = await import('../exportInvoicePdf')
  return exportInvoicePdf(data)
}

export async function lazyExportCombinedSiteInvoicePdf(
  data: Parameters<
    Awaited<typeof import('../exportInvoicePdf')>['exportCombinedSiteInvoicePdf']
  >[0],
) {
  const { exportCombinedSiteInvoicePdf } = await import('../exportInvoicePdf')
  return exportCombinedSiteInvoicePdf(data)
}

export async function lazyExportSiteReportPdf(data: SiteReportPdfData) {
  const { exportSiteReportPdf } = await import('../exportSiteReportPdf')
  return exportSiteReportPdf(data)
}

export async function lazyExportVisitRecordPdf(
  data: Parameters<Awaited<typeof import('../exportVisitRecordPdf')>['exportVisitRecordPdf']>[0],
) {
  const { exportVisitRecordPdf } = await import('../exportVisitRecordPdf')
  return exportVisitRecordPdf(data)
}

export async function lazyExportSiteVisitsPdf(
  ...args: Parameters<Awaited<typeof import('../exportSiteVisitsPdf')>['exportSiteVisitsPdf']>
) {
  const { exportSiteVisitsPdf } = await import('../exportSiteVisitsPdf')
  return exportSiteVisitsPdf(...args)
}

export async function lazyExportClientPdf(
  data: Parameters<Awaited<typeof import('./exportClientsReport')>['exportClientPdf']>[0],
) {
  const { exportClientPdf } = await import('./exportClientsReport')
  return exportClientPdf(data)
}

export async function lazyExportAllClientsPdf(
  data: Parameters<Awaited<typeof import('./exportClientsReport')>['exportAllClientsPdf']>[0],
) {
  const { exportAllClientsPdf } = await import('./exportClientsReport')
  return exportAllClientsPdf(data)
}
