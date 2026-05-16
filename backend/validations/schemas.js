import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const passwordStrengthSchema = z
  .string()
  .min(8)
  .max(128)
  .refine((p) => /[a-z]/.test(p), { message: 'Password must include a lowercase letter' })
  .refine((p) => /[A-Z]/.test(p), { message: 'Password must include an uppercase letter' })
  .refine((p) => /[0-9]/.test(p), { message: 'Password must include a number' })
  .refine((p) => /[^A-Za-z0-9]/.test(p), { message: 'Password must include a special character' })

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

export const verifyResetOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be a 6-digit code'),
})

export const resetPasswordSchema = z
  .object({
    email: z.string().email(),
    newPassword: passwordStrengthSchema,
    confirmPassword: z.string().min(1),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] })

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

const billingLineSchema = z.object({
  particular: z.string().max(500).optional(),
  quantity: z.coerce.number().optional(),
  rate: z.coerce.number().optional(),
  /** Fixed line total when this row is not quantity × rate. */
  amount: z.coerce.number().optional(),
})

export const createVisitSchema = z.object({
  siteId: z.string().min(1),
  visitDate: z.string().optional(),
  siteAddress: z.string().max(500).optional(),
  sitePhone: z.string().max(30).optional(),
  engineerName: z.string().max(200).optional(),
  dwgNo: z.string().max(120).optional(),
  contactPerson: z.string().max(200).optional(),
  workDescription: z.string().max(5000).optional(),
  machineLabel: z.string().max(200).optional(),
  /** When non-empty, server computes amount from these lines + billingOtherCharges. */
  billingLines: z.array(billingLineSchema).max(40).optional(),
  billingParticular: z.string().max(500).optional(),
  billingQuantity: z.coerce.number().optional(),
  billingRate: z.coerce.number().optional(),
  billingOtherCharges: z.coerce.number().optional(),
  amount: z.coerce.number().optional(),
  paymentMode: z.string().max(100).optional(),
  paymentStatus: z.string().max(50).optional(),
  notes: z.string().max(5000).optional(),
})

export const updateVisitSchema = createVisitSchema
  .omit({ siteId: true })
  .partial()
  .extend({
    visitDate: z.string().optional(),
    paymentMode: z.string().max(100).optional(),
    paymentStatus: z.string().max(50).optional(),
  })

export const createTransactionSchema = z.object({
  type: z.enum(['debit', 'credit']),
  amount: z.coerce.number(),
  date: z.string().optional(),
  reason: z.string().max(500).optional(),
  clientName: z.string().max(200).optional(),
  siteName: z.string().max(200).optional(),
  /** When set, row is tied to this visit (deleted when the visit is removed). */
  siteVisitId: z.string().optional(),
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
