import { Router } from 'express'
import multer from 'multer'
import mongoose from 'mongoose'
import { authenticate } from '../middleware/auth.js'
import { requireRole } from '../middleware/requireRole.js'
import { validateBody, validateQuery } from '../middleware/validate.js'
import { authLimiter, apiLimiter, forgotPasswordLimiter, verifyResetOtpLimiter } from '../middleware/rateLimit.js'
import { catchAsync } from '../utils/catchAsync.js'
import { z } from 'zod'
import * as authService from '../services/authService.js'
import * as clientService from '../services/clientService.js'
import * as siteService from '../services/siteService.js'
import * as visitService from '../services/visitService.js'
import * as transactionService from '../services/transactionService.js'
import * as accountManagerService from '../services/accountManagerService.js'
import * as dashboardService from '../services/dashboardService.js'
import * as settingsService from '../services/settingsService.js'
import * as reportService from '../services/reportService.js'
import * as calculatorService from '../services/calculatorService.js'
import * as instrumentService from '../services/instrumentService.js'
import * as uploadService from '../services/uploadService.js'
import { parseObjectId } from '../utils/instrumentAccess.js'
import {
  loginSchema,
  forgotPasswordSchema,
  verifyResetOtpSchema,
  resetPasswordSchema,
  changePasswordSchema,
  createClientSchema,
  createSiteSchema,
  createVisitSchema,
  createTransactionSchema,
  createAdminSchema,
  assignInstrumentsSchema,
  createInstrumentSchema,
  calculatorSchema,
} from '../validations/schemas.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 12 },
})

const router = Router()

router.get('/health', (_req, res) => {
  const dbState = mongoose.connection.readyState
  const db =
    dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : dbState === 3 ? 'disconnecting' : 'disconnected'
  res.json({
    ok: true,
    service: 'samarth-surveyos-api',
    time: new Date().toISOString(),
    db,
  })
})

router.post('/auth/login', authLimiter, validateBody(loginSchema), catchAsync(async (req, res) => {
  const data = await authService.login(req.body)
  res.json({ ok: true, ...data })
}))

router.post(
  '/auth/forgot-password',
  forgotPasswordLimiter,
  validateBody(forgotPasswordSchema),
  catchAsync(async (req, res) => {
    const data = await authService.forgotPassword(req.body)
    res.json(data)
  }),
)

router.post(
  '/auth/verify-reset-otp',
  verifyResetOtpLimiter,
  validateBody(verifyResetOtpSchema),
  catchAsync(async (req, res) => {
    const data = await authService.verifyResetOtp(req.body)
    res.json(data)
  }),
)

router.post('/auth/reset-password', authLimiter, validateBody(resetPasswordSchema), catchAsync(async (req, res) => {
  const data = await authService.resetPasswordWithOtp(req.body)
  res.json(data)
}))

router.get('/auth/me', authenticate, catchAsync(async (req, res) => {
  const data = await authService.getMe(req.user.id)
  res.json({ ok: true, ...data })
}))

router.use(authenticate)
router.use(apiLimiter)

router.get('/dashboard', catchAsync(async (req, res) => {
  const data = await dashboardService.getDashboard(req)
  res.json({ ok: true, ...data })
}))

router.get('/clients', catchAsync(async (req, res) => {
  const data = await clientService.listClients(req)
  res.json({ ok: true, clients: data })
}))

router.post('/clients', validateBody(createClientSchema), catchAsync(async (req, res) => {
  const data = await clientService.createClient(req, req.body)
  res.status(201).json({ ok: true, client: data })
}))

router.get('/clients/:id/sites', catchAsync(async (req, res) => {
  const id = parseObjectId(req.params.id, 'client id')
  const data = await siteService.listSitesForClient(req, id)
  res.json({ ok: true, sites: data })
}))

router.delete('/clients/:id', catchAsync(async (req, res) => {
  const id = parseObjectId(req.params.id, 'client id')
  const data = await clientService.deleteClientWithSites(req, id)
  res.json({ ok: true, ...data })
}))

router.post('/sites', validateBody(createSiteSchema), catchAsync(async (req, res) => {
  const clientId = parseObjectId(req.body.clientId, 'clientId')
  const data = await siteService.createSite(req, { ...req.body, clientId })
  res.status(201).json({ ok: true, site: data })
}))

router.get('/sites', catchAsync(async (req, res) => {
  const data = await siteService.listAllSites(req)
  res.json({ ok: true, sites: data })
}))

router.delete('/sites/:id', catchAsync(async (req, res) => {
  const id = parseObjectId(req.params.id, 'site id')
  await siteService.deleteSiteWithRelated(req, id)
  res.json({ ok: true })
}))

router.get('/visits', catchAsync(async (req, res) => {
  const data = await visitService.listVisits(req)
  res.json({ ok: true, visits: data })
}))

router.post('/visits', validateBody(createVisitSchema), catchAsync(async (req, res) => {
  const data = await visitService.createVisit(req, req.body)
  res.status(201).json({ ok: true, visit: data })
}))

router.get('/visits/:id', catchAsync(async (req, res) => {
  const id = parseObjectId(req.params.id, 'visit id')
  const data = await visitService.getVisitById(req, id)
  res.json({ ok: true, visit: data })
}))

router.delete('/visits/:id', catchAsync(async (req, res) => {
  const id = parseObjectId(req.params.id, 'visit id')
  await visitService.deleteVisit(req, id)
  res.json({ ok: true })
}))

router.post(
  '/visits/:id/photos',
  upload.array('photos', 12),
  catchAsync(async (req, res) => {
    const visitId = parseObjectId(req.params.id, 'visit id')
    const files = req.files ?? []
    const urls = []
    const fileIds = []
    for (const file of files) {
      const up = await uploadService.uploadBufferToCloudinary({
        buffer: file.buffer,
        mimeType: file.mimetype,
        folder: 'survey-app/visits',
      })
      const reg = await uploadService.registerSurveyFile(req, {
        url: up.url,
        publicId: up.publicId,
        mimeType: file.mimetype,
        sizeBytes: up.bytes ?? file.size,
        linked: { entityType: 'site_visit', entityId: visitId },
      })
      urls.push(up.url)
      fileIds.push(reg.id)
    }
    await visitService.appendVisitPhotos(req, visitId, { urls, fileIds })
    res.json({ ok: true, urls, fileIds })
  }),
)

const reportQuerySchema = z.object({
  reportType: z.string().optional(),
  clientFilter: z.string().optional(),
  siteFilter: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  machineType: z.string().optional(),
  searchQuery: z.string().optional(),
  statusFilter: z.enum(['all', 'Completed', 'Pending']).optional(),
})

router.get('/reports/rows', validateQuery(reportQuerySchema), catchAsync(async (req, res) => {
  const data = await reportService.listReportRows(req, req.query)
  res.json({ ok: true, rows: data })
}))

router.post('/calculator/quote', validateBody(calculatorSchema), catchAsync(async (req, res) => {
  const data = calculatorService.quote(req.body)
  res.json({ ok: true, ...data })
}))

router.delete('/transactions/item/:id', catchAsync(async (req, res) => {
  const id = parseObjectId(req.params.id, 'transaction id')
  await transactionService.deleteTransaction(req, id)
  res.json({ ok: true })
}))

router.get('/transactions/:slug', catchAsync(async (req, res) => {
  const am = await accountManagerService.getAccountManagerBySlug(req, req.params.slug)
  const data = await transactionService.listTransactions(req, am._id)
  res.json({ ok: true, transactions: data })
}))

router.post('/transactions/:slug', validateBody(createTransactionSchema), catchAsync(async (req, res) => {
  const am = await accountManagerService.getAccountManagerBySlug(req, req.params.slug)
  const data = await transactionService.createTransaction(req, am._id, req.body)
  res.status(201).json({ ok: true, transaction: data })
}))

router.get('/account-managers', catchAsync(async (req, res) => {
  const data = await accountManagerService.listAccountManagers(req)
  res.json({ ok: true, managers: data })
}))

router.get('/account-managers/:slug/accounts', catchAsync(async (req, res) => {
  const am = await accountManagerService.getAccountManagerBySlug(req, req.params.slug)
  const rows = await accountManagerService.listAccountRowsForManager(req, am)
  res.json({
    ok: true,
    accounts: rows,
    manager: {
      slug: am.slug,
      fullName: am.fullName,
      shortName: am.shortName || am.fullName,
      phone: am.phone ?? '',
      adminId: am.adminId.toString(),
    },
  })
}))

router.get('/settings/company', catchAsync(async (req, res) => {
  const data = await settingsService.getCompanySettings(req)
  res.json({ ok: true, company: data })
}))

router.patch('/settings/company', requireRole('super_admin'), catchAsync(async (req, res) => {
  await settingsService.updateCompanySettings(req, req.body)
  res.json({ ok: true })
}))

router.get('/settings/me', catchAsync(async (req, res) => {
  const data = await settingsService.getUserSettings(req)
  res.json({ ok: true, ...data })
}))

router.patch('/settings/me', catchAsync(async (req, res) => {
  await settingsService.updateUserSettings(req, req.body)
  res.json({ ok: true })
}))

router.get('/settings/invoice-bank-columns', catchAsync(async (req, res) => {
  const bankColumns = await settingsService.getInvoiceBankColumns(req)
  res.json({ ok: true, bankColumns })
}))

router.get('/settings/invoice-company-header', catchAsync(async (req, res) => {
  const companyHeader = await settingsService.getInvoiceCompanyHeader(req)
  res.json({ ok: true, companyHeader })
}))

router.post(
  '/settings/me/bank-signature',
  upload.single('file'),
  catchAsync(async (req, res) => {
    const data = await settingsService.attachUserBankSignature(req, req.file)
    res.json({ ok: true, ...data })
  }),
)

router.post('/auth/change-password', validateBody(changePasswordSchema), catchAsync(async (req, res) => {
  await authService.changePassword(req.user.id, req.body)
  res.json({ ok: true })
}))

router.post(
  '/settings/company/logo',
  requireRole('super_admin'),
  upload.single('file'),
  catchAsync(async (req, res) => {
    const data = await settingsService.attachCompanyLogo(req, req.file)
    res.json({ ok: true, ...data })
  }),
)

router.post(
  '/settings/company/invoice-signature',
  requireRole('super_admin'),
  upload.single('file'),
  catchAsync(async (req, res) => {
    const data = await settingsService.attachInvoiceAsset(req, 'signature', req.file)
    res.json({ ok: true, ...data })
  }),
)

router.post(
  '/settings/company/invoice-stamp',
  requireRole('super_admin'),
  upload.single('file'),
  catchAsync(async (req, res) => {
    const data = await settingsService.attachInvoiceAsset(req, 'stamp', req.file)
    res.json({ ok: true, ...data })
  }),
)

router.post('/settings/company/backup', requireRole('super_admin'), catchAsync(async (req, res) => {
  const data = await settingsService.recordBackup(req)
  res.json({ ok: true, ...data })
}))

router.get('/settings/company/backup-export', requireRole('super_admin'), catchAsync(async (req, res) => {
  const data = await settingsService.getBackupSnapshot(req)
  const body = JSON.stringify(data, null, 2)
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="survey-company-backup.json"')
  res.send(body)
}))

router.get('/instruments', catchAsync(async (req, res) => {
  const data = await instrumentService.listInstruments(req)
  res.json({ ok: true, instruments: data })
}))

const instrumentCoworkersQuerySchema = z.object({
  instrumentId: z.string().optional(),
})

router.get('/instruments/coworkers', validateQuery(instrumentCoworkersQuerySchema), catchAsync(async (req, res) => {
  const data = await instrumentService.listCoworkersOnInstrument(req)
  res.json({ ok: true, admins: data })
}))

router.post('/instruments', requireRole('super_admin'), validateBody(createInstrumentSchema), catchAsync(async (req, res) => {
  const data = await instrumentService.createInstrument(req, req.body)
  res.status(201).json({ ok: true, instrument: data })
}))

router.get('/admins', requireRole('super_admin'), catchAsync(async (req, res) => {
  const data = await authService.listAdminsForSuper(req.user)
  res.json({ ok: true, admins: data })
}))

router.post('/admins', requireRole('super_admin'), validateBody(createAdminSchema), catchAsync(async (req, res) => {
  const data = await authService.createAdmin(req.user, req.body)
  res.status(201).json({ ok: true, admin: data })
}))

router.patch('/admins/:id/active', requireRole('super_admin'), catchAsync(async (req, res) => {
  const id = parseObjectId(req.params.id, 'admin id')
  const isActive = Boolean(req.body?.isActive)
  await authService.setAdminActive(req.user, id, isActive)
  res.json({ ok: true })
}))

router.post('/admins/:id/instruments', requireRole('super_admin'), validateBody(assignInstrumentsSchema), catchAsync(async (req, res) => {
  const id = parseObjectId(req.params.id, 'admin id')
  const ids = (req.body.instrumentIds ?? []).map((x) => parseObjectId(x, 'instrumentId'))
  await authService.assignInstruments(req.user, id, ids)
  res.json({ ok: true })
}))

router.use((_req, res) => {
  res.status(404).json({ ok: false, error: 'Not found' })
})

export default router
