export type AccountManagerRecord = {
  id: string
  name: string
  shortName: string
  phone: string
}

export const ACCOUNT_MANAGERS: AccountManagerRecord[] = [
  {
    id: 'sanket-katkar',
    name: 'Er. Sanket Katakar',
    shortName: 'Sanket Katakar',
    phone: '+91 7026016077',
  },
  {
    id: 'shubham-sodage',
    name: 'Er. Shubham Sodage',
    shortName: 'Shubham Sodage',
    phone: '+91 9595975566',
  },
]

export const DEFAULT_ACCOUNT_MANAGER_ID = ACCOUNT_MANAGERS[0].id

export function getAccountManagerById(id: string | undefined): AccountManagerRecord | undefined {
  if (!id) return undefined
  return ACCOUNT_MANAGERS.find((m) => m.id === id)
}

export type AccountRow = {
  name: string
  phone: string
  totalRevenue: string
  received: string
  pending: string
  debit: string
  credit: string
}

const allAccountRows: AccountRow[] = [
  {
    name: 'Amit Developers',
    phone: '+91 8643001010',
    totalRevenue: '₹2,25,000',
    received: '₹1,40,000',
    pending: '₹85,000',
    debit: '₹10,000',
    credit: '₹1,50,000',
  },
  {
    name: 'Shree Krishna Infra',
    phone: '+91 7026016077',
    totalRevenue: '₹2,10,000',
    received: '₹1,45,000',
    pending: '₹65,000',
    debit: '₹7,500',
    credit: '₹1,52,500',
  },
  {
    name: 'Vishwakarma Properties',
    phone: '+91 9595975566',
    totalRevenue: '₹1,85,000',
    received: '₹1,20,000',
    pending: '₹65,000',
    debit: '₹5,000',
    credit: '₹1,25,000',
  },
  {
    name: 'Gajanan Projects',
    phone: '+91 7058129002',
    totalRevenue: '₹1,70,000',
    received: '₹95,000',
    pending: '₹75,000',
    debit: '₹9,000',
    credit: '₹1,04,000',
  },
  {
    name: 'Sai Realities',
    phone: '+91 9011122334',
    totalRevenue: '₹1,55,000',
    received: '₹1,05,500',
    pending: '₹49,500',
    debit: '₹6,500',
    credit: '₹1,12,000',
  },
  {
    name: 'Green Valley Constructions',
    phone: '+91 9988776655',
    totalRevenue: '₹1,30,000',
    received: '₹80,000',
    pending: '₹50,000',
    debit: '₹4,000',
    credit: '₹84,000',
  },
]

/** Portfolio split by account manager (demo). */
export const accountRowsByManagerId: Record<string, AccountRow[]> = {
  'sanket-katkar': allAccountRows.slice(0, 3),
  'shubham-sodage': allAccountRows.slice(3, 6),
}

export type LedgerTransaction = {
  id: string
  type: 'debit' | 'credit'
  amount: number
  date: string
  reason?: string
  client?: string
  site?: string
}

export const initialTransactionsByManagerId: Record<string, LedgerTransaction[]> = {
  'sanket-katkar': [
    { id: 't1', type: 'debit', amount: 1500, date: '2025-05-20', reason: 'Petrol' },
    { id: 't2', type: 'credit', amount: 12000, date: '2025-05-18', client: 'Amit Developers', site: 'Wakad Site' },
  ],
  'shubham-sodage': [
    { id: 't3', type: 'debit', amount: 800, date: '2025-05-19', reason: 'Stationery' },
    {
      id: 't4',
      type: 'credit',
      amount: 18500,
      date: '2025-05-17',
      client: 'Gajanan Projects',
      site: 'Ravet Site',
    },
  ],
}

export const siteOptionsByClient: Record<string, string[]> = {
  'Amit Developers': ['Wakad Site', 'Baner Site'],
  'Shree Krishna Infra': ['Hinjewadi Site'],
  'Vishwakarma Properties': ['Kothrud Site'],
  'Gajanan Projects': ['Ravet Site'],
  'Sai Realities': ['Wagholi Site'],
  'Green Valley Constructions': ['Mulshi Site'],
}

export function clientNamesForManager(managerId: string): string[] {
  const rows = accountRowsByManagerId[managerId] ?? []
  return rows.map((r) => r.name)
}
