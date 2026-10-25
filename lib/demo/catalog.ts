// Fixed reference data of the demo clinic: staff, the service catalog with prices in USD, bundles, folders and
// letterheads. Everything is fictional; the two external laboratories are invented names.
import type { ClinicSettings, Folder, Letterhead, Service, ServiceCategory, ServicePackage, Staff } from '../types'

// ============ Staff ============
// completion — how reliably this doctor's patients follow through on orders (1 = the scenario's typical rate).
// The manager's analytics should tell a story: Dr Carter's patients do almost everything, Dr Okafor's clearly less.

export const STAFF: (Staff & { completion: number })[] = [
  { id: 'st-1', full_name: 'Helen Whitaker', role: 'manager', specialty: null, crm_master_id: null, is_active: true, photo_url: null, completion: 1 },
  { id: 'st-2', full_name: 'Emily Carter', role: 'doctor', specialty: 'Family medicine', crm_master_id: 101, is_active: true, photo_url: null, completion: 1.5 },
  { id: 'st-3', full_name: 'James Okafor', role: 'doctor', specialty: 'Family medicine', crm_master_id: 102, is_active: true, photo_url: null, completion: 0.42 },
  { id: 'st-4', full_name: 'Priya Raman', role: 'doctor', specialty: 'Endocrinologist', crm_master_id: 103, is_active: true, photo_url: null, completion: 1 },
  { id: 'st-5', full_name: 'Thomas Avery', role: 'doctor', specialty: 'Cardiologist', crm_master_id: 104, is_active: true, photo_url: null, completion: 0.95 },
  { id: 'st-6', full_name: 'Sophie Lambert', role: 'doctor', specialty: 'Gynecologist', crm_master_id: 105, is_active: true, photo_url: null, completion: 1 },
  { id: 'st-7', full_name: 'Daniel Novak', role: 'doctor', specialty: 'Neurologist', crm_master_id: 106, is_active: true, photo_url: null, completion: 0.9 },
  { id: 'st-8', full_name: 'Laura Whitfield', role: 'doctor', specialty: 'Gastroenterologist', crm_master_id: 107, is_active: true, photo_url: null, completion: 0.9 },
  { id: 'st-9', full_name: 'Mark Ellison', role: 'doctor', specialty: 'Radiologist', crm_master_id: 108, is_active: true, photo_url: null, completion: 0.95 },
  { id: 'st-10', full_name: 'Grace Murphy', role: 'medical_staff', specialty: null, crm_master_id: 109, is_active: true, photo_url: null, completion: 1 },
  { id: 'st-11', full_name: 'Oliver Hughes', role: 'medical_staff', specialty: null, crm_master_id: 110, is_active: true, photo_url: null, completion: 1 },
  { id: 'st-12', full_name: 'Chloe Adams', role: 'reception', specialty: null, crm_master_id: null, is_active: true, photo_url: null, completion: 1 },
]

export const MANAGER_ID = 'st-1'
export const GP_IDS = ['st-2', 'st-3'] as const
export const ENDO_ID = 'st-4'
export const CARDIO_ID = 'st-5'
export const GYN_ID = 'st-6'
export const NEURO_ID = 'st-7'
export const GASTRO_ID = 'st-8'
export const US_ID = 'st-9'
export const NURSE_IDS = ['st-10', 'st-11'] as const
export const FRONT_DESK_ID = 'st-12'

// ============ Services (USD) ============
// Codes: 1xxx consultations, 2xxx instrumental diagnostics, 3xxx the clinic's own laboratory, 4xxx procedures;
// NL-… Northlab, CL-… CityLab.

type ServiceRow = [code: string, name: string, price: number, active?: boolean]

const clinic = (category: ServiceCategory, rows: ServiceRow[]): Service[] =>
  rows.map(([code, name, price, active = true]) => ({
    id: `sv-${code}`, source: 'crm', lab_name: null, code, name, category, price, is_active: active,
  }))

const lab = (labName: string, rows: ServiceRow[]): Service[] =>
  rows.map(([code, name, price, active = true]) => ({
    id: `sv-${code.toLowerCase()}`, source: 'lab', lab_name: labName, code, name, category: 'lab', price, is_active: active,
  }))

export const SERVICES: Service[] = [
  ...clinic('consultation', [
    ['1001', 'Primary care visit', 150],
    ['1002', 'Primary care follow-up visit', 110],
    ['1003', 'Endocrinology consult', 250],
    ['1004', 'Cardiology consult', 260],
    ['1005', 'Gynecology consult', 240],
    ['1006', 'Neurology consult', 260],
    ['1007', 'Gastroenterology consult', 260],
    ['1008', 'Endocrinology follow-up visit', 180],
    ['1009', 'Cardiology follow-up visit', 190],
    ['1010', 'Gynecology follow-up visit', 170],
    ['1011', 'Neurology follow-up visit', 190],
    ['1012', 'Gastroenterology follow-up visit', 190],
    ['1013', 'Dietitian consult', 120],
    ['1014', 'Physical therapy evaluation', 140],
  ]),
  ...clinic('instrumental', [
    ['2001', 'ECG with interpretation', 75],
    ['2002', '24-hour Holter monitoring', 350],
    ['2003', '24-hour ambulatory BP monitoring', 250],
    ['2004', 'Echocardiogram', 450],
    ['2005', 'Treadmill stress test', 500],
    ['2006', 'Thyroid ultrasound', 250],
    ['2007', 'Abdominal ultrasound', 350],
    ['2008', 'Pelvic ultrasound (transvaginal)', 300],
    ['2009', 'Early pregnancy ultrasound', 300],
    ['2010', 'Breast ultrasound', 280],
    ['2011', 'Renal and bladder ultrasound', 260],
    ['2012', 'Carotid ultrasound', 400],
    ['2013', 'Leg venous duplex', 420],
    ['2014', 'Spirometry', 95],
    ['2015', 'Spirometry with bronchodilator', 140],
    ['2016', 'Soft tissue ultrasound', 220],
    ['2017', 'Lymph node ultrasound', 220],
    ['2018', 'Ultrasound-guided FNA', 650],
    ['2019', 'Ankle-brachial index', 150],
    ['2020', 'Body composition analysis', 60],
    ['2021', 'Nerve conduction study', 500],
    ['2022', 'EEG', 450],
  ]),
  ...clinic('lab', [
    ['3001', 'CBC', 28],
    ['3002', 'ESR', 15],
    ['3003', 'C-reactive protein (CRP)', 30],
    ['3004', 'Fasting glucose', 12],
    ['3005', 'Urinalysis', 18],
    ['3006', 'Lipid panel', 45],
    ['3007', 'Hepatic function panel', 40],
    ['3008', 'Kidney function panel', 35],
    ['3009', 'Electrolytes', 30],
    ['3010', 'HbA1c', 40],
    ['3011', 'Ferritin', 35],
    ['3012', 'Iron panel', 55],
    ['3013', 'TSH', 38],
    ['3014', 'Free T4', 35],
    ['3015', 'hCG, serum', 35],
    ['3016', 'PT/INR and PTT', 45],
    ['3017', 'Blood type and Rh', 30],
    ['3018', 'Rapid strep test', 25],
    ['3019', 'H. pylori breath test', 120],
    ['3020', 'Fecal occult blood test', 30],
  ]),
  ...clinic('other', [
    ['4001', 'Venipuncture', 15],
    ['4002', 'Intramuscular injection', 25],
    ['4003', 'IV infusion', 150],
    ['4004', 'Wound dressing', 40],
  ]),
  ...lab('Northlab', [
    ['NL-101', 'Vitamin D (25-OH)', 60],
    ['NL-102', 'Vitamin B12', 45],
    ['NL-103', 'Folate', 40],
    ['NL-104', 'Anti-TPO antibodies', 55],
    ['NL-105', 'Anti-thyroglobulin antibodies', 55],
    ['NL-106', 'Free T3', 35],
    ['NL-107', 'Prolactin', 45],
    ['NL-108', 'FSH', 40],
    ['NL-109', 'LH', 40],
    ['NL-110', 'Estradiol', 45],
    ['NL-111', 'Testosterone, total', 55],
    ['NL-112', 'Insulin, fasting', 45],
    ['NL-113', 'C-peptide', 55],
    ['NL-114', 'Cortisol, morning', 45],
    ['NL-115', 'PSA, total', 50],
    ['NL-116', 'HPV DNA test', 120],
    ['NL-117', 'Pap test', 90],
    ['NL-118', 'Celiac serology (tTG-IgA)', 60],
  ]),
  ...lab('CityLab', [
    ['CL-201', 'Urine albumin/creatinine ratio', 35],
    ['CL-202', 'Uric acid', 18],
    ['CL-203', 'NT-proBNP', 95],
    ['CL-204', 'hs-Troponin', 80],
    ['CL-205', 'Magnesium', 20],
    ['CL-206', 'Calcium, ionized', 25],
    ['CL-207', 'Lipoprotein(a)', 65],
    ['CL-208', 'Homocysteine', 60, false],
    ['CL-209', 'Stool culture', 75],
    ['CL-210', 'Fecal calprotectin', 85],
    ['CL-211', 'H. pylori stool antigen', 55],
    ['CL-212', 'Throat culture', 50],
    ['CL-213', 'Urine culture', 45],
    ['CL-214', 'Rubella IgG', 40],
    ['CL-215', 'Toxoplasma IgG/IgM', 65],
    ['CL-216', 'Pancreatic elastase', 90],
  ]),
]

const byCode = new Map(SERVICES.map((s) => [s.code!, s]))

/** A catalog service by its code; throws on a typo so a broken scenario fails loudly. */
export function service(code: string): Service {
  const found = byCode.get(code)
  if (!found) throw new Error(`Unknown demo service code ${code}`)
  return found
}

const bundle = (id: string, name: string, codes: string[]): ServicePackage => ({
  id, name, items: codes.map((code) => ({ service_id: service(code).id, quantity: 1 })),
})

export const BUNDLES: ServicePackage[] = [
  bundle('pk-thyroid', 'Thyroid check', ['3013', '3014', 'NL-104', '2006']),
  bundle('pk-cardio', 'Cardio check-up', ['2001', '2004', '3006', '3004']),
  bundle('pk-diabetes', 'Diabetes follow-up', ['3010', '3004', '3008', 'CL-201', '3006']),
  bundle('pk-women', "Women's health", ['NL-117', 'NL-116', '2008', '2010', '3001']),
  bundle('pk-presurgery', 'Pre-surgery', ['3001', '3016', '3017', '3008', '3004', '2001']),
  bundle('pk-annual', 'Annual physical', ['3001', '3005', '3006', '3004', '3007', '3008', '3013', '2001', '2007']),
]

export const FOLDERS: Folder[] = [
  { id: 'f-1', name: 'Visit notes', sort_order: 1 },
  { id: 'f-2', name: 'Lab results', sort_order: 2 },
  { id: 'f-3', name: 'In-house lab results', sort_order: 3 },
  { id: 'f-4', name: 'Northlab results', sort_order: 4 },
  { id: 'f-5', name: 'CityLab results', sort_order: 5 },
  { id: 'f-6', name: 'Ultrasound', sort_order: 6 },
  { id: 'f-7', name: 'Endoscopy', sort_order: 7 },
  { id: 'f-8', name: 'Letters & forms', sort_order: 8 },
  { id: 'f-9', name: 'Other files', sort_order: 9 },
]

// Files live in public/letterheads/.
export const LETTERHEADS: Letterhead[] = [
  { id: 'lh-records', kind: 'header', name: 'Medical records', image_url: '/letterheads/header-consultation.png', is_default: true },
  { id: 'lh-lab', kind: 'header', name: 'Laboratory', image_url: '/letterheads/header-lab.png', is_default: false },
  { id: 'lh-general', kind: 'header', name: 'General', image_url: '/letterheads/header-plan.png', is_default: false },
  { id: 'lh-signature', kind: 'footer', name: 'Signature and online booking', image_url: '/letterheads/footer-signature.png', is_default: false },
]

// Orders letterhead: its own header, no footer — orders carry no signatures.
export const CLINIC_SETTINGS: ClinicSettings = {
  prescription_header_image_url: '/letterheads/header-plan.png',
  prescription_footer_image_url: null,
}
