import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})

export const createClientSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().max(20).optional(),
  email: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  adminId: z.string().optional(),
})

export const createSiteSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().min(1).max(200),
  locationLabel: z.string().max(200).optional(),
})

export const createVisitSchema = z.object({
  siteId: z.string().min(1),
  visitDate: z.string().optional(),
  workDescription: z.string().max(5000).optional(),
  machineLabel: z.string().max(200).optional(),
  amount: z.coerce.number().optional(),
  paymentMode: z.string().max(100).optional(),
  paymentStatus: z.string().max(50).optional(),
  notes: z.string().max(5000).optional(),
})

export const createTransactionSchema = z.object({
  type: z.enum(['debit', 'credit']),
  amount: z.coerce.number(),
  date: z.string().optional(),
  reason: z.string().max(500).optional(),
  clientName: z.string().max(200).optional(),
  siteName: z.string().max(200).optional(),
})

export const createAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().max(200).optional(),
  phone: z.string().max(20).optional(),
  instrumentIds: z.array(z.string()).optional(),
})

export const assignInstrumentsSchema = z.object({
  instrumentIds: z.array(z.string()),
})

export const createInstrumentSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  serialNumber: z.string().optional(),
  status: z.enum(['operational', 'maintenance', 'retired']).optional(),
  notes: z.string().optional(),
})

export const calculatorSchema = z.object({
  lengthM: z.coerce.number().optional(),
  widthM: z.coerce.number().optional(),
  ratePerSqm: z.coerce.number().optional(),
  currency: z.string().optional(),
})
