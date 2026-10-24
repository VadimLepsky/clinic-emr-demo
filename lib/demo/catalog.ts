// Fixed reference data of the demo clinic: staff, the service catalogue with prices in EUR, bundles, folders and
// letterheads. Everything is fictional; the two external laboratories are invented names.
import type { ClinicSettings, Folder, Letterhead, Service, ServiceCategory, ServicePackage, Staff } from '../types'

// ============ Staff ============
// completion — how reliably this doctor's patients follow through on care plans (1 = the scenario's typical rate).
// The manager's analytics should tell a story: Dr Carter's patients do almost everything, Dr Okafor's clearly less.

export const STAFF: (Staff & { completion: number })[] = [
  { id: 'st-1', full_name: 'Helen Whitaker', role: 'manager', specialty: null, crm_master_id: null, is_active: true, photo_url: null, completion: 1 },
  { id: 'st-2', full_name: 'Emily Carter', role: 'doctor', specialty: 'General practitioner', crm_master_id: 101, is_active: true, photo_url: null, completion: 1.5 },
  { id: 'st-3', full_name: 'James Okafor', role: 'doctor', specialty: 'General practitioner', crm_master_id: 102, is_active: true, photo_url: null, completion: 0.42 },
  { id: 'st-4', full_name: 'Priya Raman', role: 'doctor', specialty: 'Endocrinologist', crm_master_id: 103, is_active: true, photo_url: null, completion: 1 },
  { id: 'st-5', full_name: 'Thomas Avery', role: 'doctor', specialty: 'Cardiologist', crm_master_id: 104, is_active: true, photo_url: null, completion: 0.95 },
  { id: 'st-6', full_name: 'Sophie Lambert', role: 'doctor', specialty: 'Gynaecologist', crm_master_id: 105, is_active: true, photo_url: null, completion: 1 },
  { id: 'st-7', full_name: 'Daniel Novak', role: 'doctor', specialty: 'Neurologist', crm_master_id: 106, is_active: true, photo_url: null, completion: 0.9 },
  { id: 'st-8', full_name: 'Laura Whitfield', role: 'doctor', specialty: 'Gastroenterologist', crm_master_id: 107, is_active: true, photo_url: null, completion: 0.9 },
  { id: 'st-9', full_name: 'Mark Ellison', role: 'doctor', specialty: 'Ultrasound doctor', crm_master_id: 108, is_active: true, photo_url: null, completion: 0.95 },
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

// ============ Services (EUR) ============
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
    ['1001', 'GP consultation', 60],
    ['1002', 'GP follow-up consultation', 45],
    ['1003', 'Endocrinologist consultation', 85],
    ['1004', 'Cardiologist consultation', 90],
    ['1005', 'Gynaecologist consultation', 85],
    ['1006', 'Neurologist consultation', 90],
    ['1007', 'Gastroenterologist consultation', 90],
    ['1008', 'Endocrinologist follow-up consultation', 65],
    ['1009', 'Cardiologist follow-up consultation', 70],
    ['1010', 'Gynaecologist follow-up consultation', 65],
    ['1011', 'Neurologist follow-up consultation', 70],
    ['1012', 'Gastroenterologist follow-up consultation', 70],
    ['1013', 'Dietitian consultation', 55],
    ['1014', 'Physiotherapy assessment', 50],
  ]),
  ...clinic('instrumental', [
    ['2001', 'ECG with interpretation', 35],
    ['2002', '24-hour Holter monitoring', 120],
    ['2003', '24-hour blood pressure monitoring', 95],
    ['2004', 'Echocardiography', 110],
    ['2005', 'Exercise stress test (treadmill)', 130],
    ['2006', 'Thyroid ultrasound', 55],
    ['2007', 'Abdominal ultrasound', 75],
    ['2008', 'Pelvic ultrasound (transvaginal)', 70],
    ['2009', 'Early pregnancy ultrasound', 75],
    ['2010', 'Breast ultrasound', 65],
    ['2011', 'Kidney and bladder ultrasound', 60],
    ['2012', 'Carotid duplex ultrasound', 90],
    ['2013', 'Lower limb venous duplex ultrasound', 90],
    ['2014', 'Spirometry', 45],
    ['2015', 'Spirometry with bronchodilator test', 60],
    ['2016', 'Soft tissue ultrasound', 50],
    ['2017', 'Lymph node ultrasound', 50],
    ['2018', 'Ultrasound-guided fine-needle aspiration', 140],
    ['2019', 'Ankle-brachial pressure index', 40],
    ['2020', 'Body composition analysis (bioimpedance)', 30],
    ['2021', 'Nerve conduction study', 120],
    ['2022', 'EEG', 110],
  ]),
  ...clinic('lab', [
    ['3001', 'Full blood count', 12],
    ['3002', 'ESR', 6],
    ['3003', 'C-reactive protein (CRP)', 14],
    ['3004', 'Fasting glucose', 6],
    ['3005', 'Urinalysis', 8],
    ['3006', 'Lipid profile', 22],
    ['3007', 'Liver function tests', 24],
    ['3008', 'Kidney function (urea, creatinine, eGFR)', 18],
    ['3009', 'Electrolytes (Na, K, Cl)', 15],
    ['3010', 'HbA1c', 18],
    ['3011', 'Ferritin', 16],
    ['3012', 'Iron studies (iron, TIBC, transferrin saturation)', 22],
    ['3013', 'TSH', 15],
    ['3014', 'Free T4', 15],
    ['3015', 'hCG, blood', 18],
    ['3016', 'Coagulation screen (PT/INR, APTT)', 20],
    ['3017', 'Blood group and Rh factor', 18],
    ['3018', 'Rapid strep A test', 12],
    ['3019', 'Urea breath test (H. pylori)', 45],
    ['3020', 'Faecal occult blood test', 15],
  ]),
  ...clinic('other', [
    ['4001', 'Venepuncture', 5],
    ['4002', 'Intramuscular injection', 10],
    ['4003', 'IV infusion', 35],
    ['4004', 'Wound dressing', 15],
  ]),
  ...lab('Northlab', [
    ['NL-101', 'Vitamin D (25-OH)', 32],
    ['NL-102', 'Vitamin B12', 22],
    ['NL-103', 'Folate', 20],
    ['NL-104', 'Anti-TPO antibodies', 26],
    ['NL-105', 'Anti-thyroglobulin antibodies', 26],
    ['NL-106', 'Free T3', 16],
    ['NL-107', 'Prolactin', 19],
    ['NL-108', 'FSH', 17],
    ['NL-109', 'LH', 17],
    ['NL-110', 'Oestradiol', 18],
    ['NL-111', 'Testosterone, total', 19],
    ['NL-112', 'Insulin, fasting', 22],
    ['NL-113', 'C-peptide', 26],
    ['NL-114', 'Cortisol, morning', 21],
    ['NL-115', 'PSA, total', 21],
    ['NL-116', 'HPV DNA test', 55],
    ['NL-117', 'Cervical cytology (liquid-based)', 38],
    ['NL-118', 'Coeliac serology (tTG-IgA)', 29],
  ]),
  ...lab('CityLab', [
    ['CL-201', 'Urine albumin/creatinine ratio', 16],
    ['CL-202', 'Uric acid', 8],
    ['CL-203', 'NT-proBNP', 42],
    ['CL-204', 'High-sensitivity troponin', 35],
    ['CL-205', 'Magnesium', 9],
    ['CL-206', 'Calcium, ionised', 11],
    ['CL-207', 'Lipoprotein(a)', 30],
    ['CL-208', 'Homocysteine', 28, false],
    ['CL-209', 'Stool culture', 32],
    ['CL-210', 'Faecal calprotectin', 38],
    ['CL-211', 'H. pylori stool antigen', 24],
    ['CL-212', 'Throat swab culture', 26],
    ['CL-213', 'Urine culture', 22],
    ['CL-214', 'Rubella IgG', 18],
    ['CL-215', 'Toxoplasma IgG/IgM', 30],
    ['CL-216', 'Pancreatic elastase', 40],
  ]),
]

const byCode = new Map(SERVICES.map((s) => [s.code!, s]))

/** A catalogue service by its code; throws on a typo so a broken scenario fails loudly. */
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
  bundle('pk-annual', 'Annual check-up', ['3001', '3005', '3006', '3004', '3007', '3008', '3013', '2001', '2007']),
]

export const FOLDERS: Folder[] = [
  { id: 'f-1', name: 'Consultation notes', sort_order: 1 },
  { id: 'f-2', name: 'Lab results', sort_order: 2 },
  { id: 'f-3', name: 'Clinic lab results', sort_order: 3 },
  { id: 'f-4', name: 'Northlab results', sort_order: 4 },
  { id: 'f-5', name: 'CityLab results', sort_order: 5 },
  { id: 'f-6', name: 'Ultrasound', sort_order: 6 },
  { id: 'f-7', name: 'Endoscopy', sort_order: 7 },
  { id: 'f-8', name: 'Certificates', sort_order: 8 },
  { id: 'f-9', name: 'Other files', sort_order: 9 },
]

// Files live in public/letterheads/.
export const LETTERHEADS: Letterhead[] = [
  { id: 'lh-records', kind: 'header', name: 'Medical records', image_url: '/letterheads/header-consultation.png', is_default: true },
  { id: 'lh-lab', kind: 'header', name: 'Laboratory', image_url: '/letterheads/header-lab.png', is_default: false },
  { id: 'lh-general', kind: 'header', name: 'General', image_url: '/letterheads/header-plan.png', is_default: false },
  { id: 'lh-signature', kind: 'footer', name: 'Signature and online booking', image_url: '/letterheads/footer-signature.png', is_default: false },
]

// Care plan letterhead: its own header, no footer — care plans carry no signatures.
export const CLINIC_SETTINGS: ClinicSettings = {
  prescription_header_image_url: '/letterheads/header-plan.png',
  prescription_footer_image_url: null,
}
