// Demo data: generated once per page load by lib/demo/generate.ts (fixed seed, dates relative to today) and then
// changed in memory by lib/data.ts. Later this becomes the seed for staging.
import { generateDemoData } from './demo/generate'

const demo = generateDemoData()

export const staff = demo.staff

// Current user (mock). In demo mode (NEXT_PUBLIC_DEMO=1) «Sign in as…» switches it through a cookie.
export const currentUserId = demo.currentUserId

export const patients = demo.patients
export const services = demo.services
export const servicePackages = demo.servicePackages
export const folders = demo.folders
export const templates = demo.templates
export const templateVersions = demo.templateVersions
export const documents = demo.documents
export const files = demo.files
export const prescriptions = demo.prescriptions
export const prescriptionItems = demo.prescriptionItems
export const prescriptionFulfillments = demo.prescriptionFulfillments
// Today's appointments (CRM cache)
export const crmVisits = demo.crmVisits
export const clinicSettings = demo.clinicSettings
export const letterheads = demo.letterheads
export const auditLog = demo.auditLog
