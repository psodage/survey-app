/** Invoice / report PDF date: always today in DD/MM/YYYY (en-GB). */
export function todayInvoiceDate(d = new Date()): string {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
