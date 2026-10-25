// Clinical scenarios of the demo: what the patient says, what the doctor finds and concludes, and which services
// end up in the care plan. Each case keeps complaints, findings, assessment and recommendations consistent with
// each other; the generator picks a case and fills the template's fields from it.
//
// These shapes describe generator input only — they are not entities (entities live in lib/types.ts).
import type { FieldValue } from '../types'
import type { Rng } from './random'
import type { TemplateKey } from './templates'

/** One string, or variants to pick from. Tokens: {d} — a duration, {years} — a number of years. */
export type Text = string | readonly string[]

export type ValueContext = { rng: Rng; date: string; age: number; sex: 'male' | 'female' }
export type Value = FieldValue | ((ctx: ValueContext) => FieldValue)

/** Catalogue codes that are always recommended, and ones recommended with a probability. */
export type ServicePick = { always?: readonly string[]; maybe?: readonly (readonly [code: string, p: number])[] }

export type CaseText = {
  complaints?: Text
  history?: Text
  prevTreatment?: Text
  medicalHistory?: Text
  examNotes?: Text
  diagnosis?: Text
  lifestyle?: Text
  drugs?: Text
  followUp?: Text
  extra?: Record<string, Value>
}

export type Scenario = CaseText & {
  id: string
  template: TemplateKey
  /** gp — the patient's own GP; otherwise the clinic's specialist. */
  doctor: 'gp' | 'endo' | 'cardio' | 'gyn' | 'neuro' | 'gastro' | 'us'
  ages: readonly [number, number]
  sex?: 'male' | 'female'
  /** Typical share of the care plan the patient goes on to do (before the doctor's own factor). */
  completion: number
  durations?: readonly string[]
  allergyChance?: number
  habits?: { smoking?: number; alcohol?: number; vaping?: number }
  generalState?: Text
  vitals?: {
    bp?: readonly [readonly [number, number], readonly [number, number]]
    hr?: readonly [number, number]
    temp?: readonly [number, number]
    spo2?: readonly [number, number]
  }
  lab?: ServicePick
  instrumental?: ServicePick
  consultation?: ServicePick
  /** External items (no code, no price) by the services field they go to. */
  external?: { instrumental?: readonly (readonly [name: string, p: number])[]; consultation?: readonly (readonly [name: string, p: number])[] }
  /** Coherent variants: a case overrides the shared texts above. */
  cases?: readonly (CaseText & { lab?: ServicePick; instrumental?: ServicePick; consultation?: ServicePick; childOnly?: boolean; adultOnly?: boolean })[]
  /** Extended texts for the few notes that run to two pages. */
  long?: CaseText
}

const between = (min: number, max: number, digits = 0) => ({ rng }: ValueContext) => rng.float(min, max, digits)
const oneOf = (...items: string[]) => ({ rng }: ValueContext) => rng.pick(items)

// ============ General consultation (GPs; the gastroenterologist uses it too) ============

const gpHypothyroid: Scenario = {
  id: 'gp-hypothyroid', template: 'general', doctor: 'gp', ages: [24, 72], completion: 0.8,
  durations: ['2 months', '3 months', '4 months', 'half a year'],
  complaints: [
    'Tiredness and low energy for {d}, feels cold when others are comfortable, weight gain of about 4 kg without changes in diet.',
    'Fatigue, daytime sleepiness, dry skin and constipation for {d}. Has put on weight.',
    'Persistent tiredness for {d}, poor concentration at work, hair thinning, feeling cold.',
  ],
  history: [
    'Symptoms came on gradually. No recent illness. Mother has an underactive thyroid.',
    'Gradual onset; exercise tolerance has dropped. Thyroid function has never been checked.',
  ],
  prevTreatment: ['Multivitamins from the pharmacy, no effect.', 'None.'],
  vitals: { bp: [[108, 128], [68, 82]], hr: [54, 66], temp: [36.1, 36.5] },
  examNotes: [
    'Skin dry, mild puffiness around the eyes. Thyroid not visibly enlarged, soft on palpation. Heart sounds regular, quiet.',
    'Dry skin, slow relaxation of the ankle reflexes. Thyroid slightly enlarged, painless. Chest clear.',
  ],
  diagnosis: [
    'Suspected hypothyroidism. Fatigue.',
    'Suspected primary hypothyroidism, to be confirmed by thyroid function tests.',
  ],
  lab: { always: ['3013', '3014', '3001'], maybe: [['NL-104', 0.7], ['3006', 0.4]] },
  instrumental: { maybe: [['2006', 0.75]] },
  consultation: { always: ['1003'] },
  lifestyle: 'Regular sleep and moderate activity. No iodine or biotin supplements until the results are back.',
  drugs: 'No medication until the results are available.',
  followUp: 'Review with the results in 1–2 weeks; endocrinology appointment.',
}

const gpHypertension: Scenario = {
  id: 'gp-hypertension', template: 'general', doctor: 'gp', ages: [40, 86], completion: 0.7,
  habits: { smoking: 0.3, alcohol: 0.4 },
  vitals: { bp: [[148, 168], [90, 102]], hr: [70, 88] },
  cases: [
    {
      complaints: 'Morning headaches and a feeling of pressure in the head for {d}. Home blood pressure readings up to 160/95.',
      history: 'No previous treatment for blood pressure. Father had a stroke at 68.',
      examNotes: 'Heart sounds regular, no murmurs. No peripheral oedema. Overweight.',
      diagnosis: 'Essential hypertension, stage 2, newly diagnosed. Cardiovascular risk to be assessed.',
      drugs: 'Amlodipine 5 mg once daily in the morning. Home blood pressure diary twice a day for 2 weeks.',
    },
    {
      complaints: 'Raised blood pressure at a pharmacy check (158/96). Occasional dizziness, otherwise well.',
      history: 'Blood pressure borderline for several years, never treated. Sedentary job.',
      examNotes: 'Apex beat not displaced, heart sounds regular. Peripheral pulses present. Abdominal obesity.',
      diagnosis: 'Arterial hypertension, stage 1–2. Overweight.',
      drugs: 'Ramipril 2.5 mg once daily, 5 mg after a week if tolerated. Home blood pressure diary.',
    },
  ],
  lab: { always: ['3006', '3008', '3005', '3004'], maybe: [['3009', 0.5], ['CL-201', 0.4]] },
  instrumental: { always: ['2001'], maybe: [['2003', 0.7], ['2004', 0.4]] },
  consultation: { maybe: [['1004', 0.6]] },
  external: { instrumental: [['Eye examination (fundoscopy)', 0.4]] },
  lifestyle: 'Salt under 5 g a day, lose 5–7% of weight, brisk walking 150 minutes a week.',
  followUp: 'Review in 2 weeks with the blood pressure diary and results.',
}

const gpAnaemia: Scenario = {
  id: 'gp-anaemia', template: 'general', doctor: 'gp', ages: [18, 50], sex: 'female', completion: 0.85,
  durations: ['a month', '2 months', '3 months'],
  complaints: [
    'Weakness, tiredness and breathlessness on stairs for {d}. Periods heavy for the last year.',
    'Fatigue, dizziness on standing up and brittle nails for {d}.',
  ],
  history: [
    'Periods last 7–8 days with clots. Vegetarian diet for 3 years.',
    'Periods heavier since an IUD was removed. No blood in the stool, no weight loss.',
  ],
  vitals: { bp: [[100, 118], [62, 75]], hr: [82, 96] },
  examNotes: 'Pale skin and conjunctivae. Heart sounds regular, soft systolic flow murmur. Abdomen soft, non-tender.',
  diagnosis: [
    'Iron-deficiency anaemia, probably due to heavy menstrual bleeding. To be confirmed.',
    'Suspected iron-deficiency anaemia.',
  ],
  lab: { always: ['3001', '3011', '3012'], maybe: [['NL-102', 0.6], ['NL-103', 0.5], ['3013', 0.4], ['NL-118', 0.3]] },
  instrumental: { maybe: [['2008', 0.3]] },
  consultation: { always: ['1005'] },
  lifestyle: 'Iron-rich foods (red meat, pulses, leafy greens), vitamin C with meals, tea and coffee away from meals.',
  drugs: 'Ferrous sulfate 200 mg once daily on alternate days; continue for 3 months after haemoglobin returns to normal.',
  followUp: 'Repeat full blood count and ferritin in 4–6 weeks.',
}

const gpAnnual: Scenario = {
  id: 'gp-annual', template: 'general', doctor: 'gp', ages: [28, 82], completion: 0.8,
  complaints: [
    'No complaints. Attends for a routine annual check-up.',
    'Feels well. Would like a general health check; the last one was 2 years ago.',
  ],
  history: ['No chronic conditions. No regular medication.', 'Mildly raised cholesterol 2 years ago, managed with diet.'],
  habits: { alcohol: 0.4, smoking: 0.15 },
  vitals: { bp: [[114, 134], [72, 85]] },
  examNotes: 'General examination unremarkable. Heart sounds regular, chest clear, abdomen soft and non-tender.',
  diagnosis: ['Routine health check. No acute findings.', 'Routine health check. Overweight (BMI 27).'],
  lab: { always: ['3001', '3005', '3006', '3004', '3007', '3008', '3013'], maybe: [['NL-101', 0.4]] },
  instrumental: { always: ['2001', '2007'] },
  consultation: { maybe: [['1013', 0.2]] },
  lifestyle: 'Keep up regular exercise, a Mediterranean-style diet and 7–8 hours of sleep.',
  drugs: 'None.',
  followUp: 'Results by phone; next check-up in a year.',
}

const gpUrti: Scenario = {
  id: 'gp-urti', template: 'general', doctor: 'gp', ages: [2, 88], completion: 0.9,
  durations: ['5 days', 'a week', '8 days'],
  generalState: 'satisfactory',
  vitals: { temp: [37.8, 38.7], hr: [88, 104], spo2: [95, 98] },
  cases: [
    {
      adultOnly: true,
      complaints: 'Sore throat, painful swallowing and fever up to 39 °C for {d}.',
      history: 'Started as a common cold; paracetamol at home with a short-lived effect. A family member was ill last week.',
      examNotes: 'Throat red, tonsils enlarged with white exudate. Tender anterior cervical lymph nodes. Chest clear.',
      diagnosis: 'Acute tonsillopharyngitis, probably streptococcal.',
      lab: { always: ['3001', '3003', '3018'], maybe: [['CL-212', 0.5]] },
      drugs: 'Phenoxymethylpenicillin 500 mg four times a day for 10 days. Paracetamol 1 g up to four times a day for fever.',
    },
    {
      adultOnly: true,
      complaints: 'Fever up to 38.6 °C and cough for {d}; the cough is now productive with yellow sputum.',
      history: 'Symptoms improved on day 3, then the fever came back. Non-smoker.',
      examNotes: 'Pharynx red. Harsh breathing with scattered wheeze, fine crackles at the right base. No signs of respiratory distress.',
      diagnosis: 'Acute bronchitis after a viral upper respiratory tract infection. Right lower lobe pneumonia to be excluded.',
      lab: { always: ['3001', '3003'] },
      drugs: 'Amoxicillin 500 mg three times a day for 7 days. Paracetamol 1 g up to four times a day for fever.',
    },
    {
      childOnly: true,
      complaints: 'Runny nose, cough and fever for {d}, worse again after initial improvement. Pulling at the right ear, poor sleep.',
      history: 'Attends nursery. Paracetamol syrup at home. Vaccinations up to date.',
      examNotes: 'Pharynx red. Right eardrum red and bulging, left normal. Chest clear, no recession.',
      diagnosis: 'Acute otitis media on the right after an upper respiratory tract infection.',
      lab: { always: ['3001', '3003'] },
      drugs: 'Amoxicillin suspension by weight, three times a day for 5 days. Paracetamol or ibuprofen syrup by weight for pain and fever.',
    },
    {
      childOnly: true,
      complaints: 'Fever up to 38.5 °C, sore throat and refusing food for {d}.',
      history: 'Classmates off school with similar symptoms. No rash.',
      examNotes: 'Tonsils enlarged and red with exudate, tender neck glands. Chest clear.',
      diagnosis: 'Acute tonsillitis.',
      lab: { always: ['3001', '3018'], maybe: [['3003', 0.6]] },
      drugs: 'Phenoxymethylpenicillin by weight for 10 days if the strep test is positive. Paracetamol by weight for fever.',
    },
  ],
  external: { instrumental: [['Chest X-ray', 0.35]] },
  lifestyle: 'Rest, plenty of fluids, humidified air. Stay off work or school until 24 hours without fever.',
  followUp: 'Review in 3 days if no better, sooner if breathing gets worse.',
}

const gpBackPain: Scenario = {
  id: 'gp-back-pain', template: 'general', doctor: 'gp', ages: [25, 66], completion: 0.55,
  durations: ['5 days', '10 days', '2 weeks', '3 weeks'],
  cases: [
    {
      complaints: 'Low back pain for {d} after lifting a heavy box, worse on bending and sitting.',
      history: 'A similar episode two years ago settled in a few weeks. Office job. No bladder or bowel symptoms.',
      examNotes: 'Paravertebral muscle spasm at L4–S1, lumbar flexion limited. Straight leg raise negative on both sides. Reflexes and sensation in the legs intact.',
      diagnosis: 'Acute non-specific low back pain, mechanical. No red flags.',
    },
    {
      complaints: 'Low back pain for {d} radiating to the left buttock and back of the thigh, worse when sitting.',
      history: 'No injury. No weight loss or night pain. No bladder or bowel symptoms.',
      examNotes: 'Tender lumbar paraspinal muscles. Straight leg raise positive on the left at 60°. Power normal, left ankle reflex slightly reduced.',
      diagnosis: 'Lumbar radiculopathy on the left, probably L5–S1. No red flags.',
      consultation: { always: ['1006'], maybe: [['1014', 0.7]] },
    },
  ],
  lab: { maybe: [['3001', 0.5], ['3003', 0.5]] },
  consultation: { always: ['1014'] },
  external: { instrumental: [['Lumbar spine MRI', 0.45]] },
  lifestyle: 'Stay active within the limits of pain, no bed rest. Short walks several times a day. Heat on the lower back.',
  drugs: 'Ibuprofen 400 mg three times a day with food for 5–7 days. Diclofenac gel on the lower back.',
  followUp: 'Review in 2 weeks, sooner if numbness, weakness or bladder problems appear.',
}

const gpGerd: Scenario = {
  id: 'gp-gerd', template: 'general', doctor: 'gp', ages: [25, 82], completion: 0.6,
  complaints: [
    'Heartburn and acid regurgitation after meals and at night for {d}. Sour taste in the mouth in the morning.',
    'Burning behind the breastbone, worse when lying down, and a dry cough at night for {d}.',
  ],
  history: [
    'Worse after coffee and late dinners. Antacids help briefly.',
    'Has taken omeprazole from the pharmacy on and off for a year.',
  ],
  habits: { smoking: 0.3, alcohol: 0.4 },
  examNotes: 'Abdomen soft, mild epigastric tenderness, no masses. Overweight.',
  diagnosis: ['Gastro-oesophageal reflux disease, suspected.', 'Reflux symptoms. Dyspepsia; H. pylori to be excluded.'],
  lab: { always: ['3001'], maybe: [['3019', 0.6], ['CL-211', 0.25]] },
  instrumental: { maybe: [['2007', 0.5]] },
  consultation: { maybe: [['1007', 0.6]] },
  external: { instrumental: [['Upper GI endoscopy (gastroscopy)', 0.4]] },
  lifestyle: 'Smaller meals, nothing to eat 3 hours before bed, raise the head of the bed, cut down on coffee and alcohol.',
  drugs: 'Omeprazole 20 mg once daily 30 minutes before breakfast for 4 weeks.',
  followUp: 'Review in 4 weeks.',
}

const gpDiabetes: Scenario = {
  id: 'gp-t2dm', template: 'general', doctor: 'gp', ages: [40, 80], completion: 0.85,
  complaints: [
    'Thirst, dry mouth and passing urine more often for {d}. Tiredness after meals.',
    'Random glucose of 11.2 mmol/L at a workplace health check. Tiredness, occasional blurred vision.',
  ],
  history: [
    'Weight gain of 8 kg over 2 years. Mother has type 2 diabetes.',
    'Glucose has never been checked before. Sedentary lifestyle.',
  ],
  vitals: { bp: [[130, 146], [80, 90]] },
  examNotes: 'Central obesity, BMI 32. Foot pulses present, sensation intact.',
  diagnosis: ['Suspected type 2 diabetes mellitus. Obesity class I.', 'Hyperglycaemia; type 2 diabetes to be confirmed.'],
  lab: { always: ['3010', '3004', '3006', '3008'], maybe: [['CL-201', 0.6], ['3007', 0.5], ['3005', 0.5]] },
  instrumental: { maybe: [['2001', 0.5]] },
  consultation: { always: ['1003'], maybe: [['1013', 0.5]] },
  lifestyle: 'No sugary drinks or sweets, smaller portions of starchy food, a 30-minute walk every day.',
  drugs: 'No medication until the diagnosis is confirmed.',
  followUp: 'Review with HbA1c in a week; endocrinology appointment.',
}

const gpUti: Scenario = {
  id: 'gp-uti', template: 'general', doctor: 'gp', ages: [18, 86], sex: 'female', completion: 0.85,
  durations: ['2 days', '3 days', '4 days'],
  complaints: [
    'Burning when passing urine, frequency and urgency for {d}. Lower abdominal discomfort.',
    'Painful urination and cloudy urine for {d}, no fever.',
  ],
  history: ['Second episode this year. No fever or back pain.', 'First episode. Not pregnant.'],
  vitals: { temp: [36.6, 37.3] },
  examNotes: 'Suprapubic tenderness. Renal angles non-tender.',
  diagnosis: ['Acute uncomplicated cystitis.', 'Lower urinary tract infection, recurrent.'],
  lab: { always: ['3005', 'CL-213'], maybe: [['3001', 0.4]] },
  instrumental: { maybe: [['2011', 0.4]] },
  lifestyle: 'Drink about 2 litres a day, do not hold urine.',
  drugs: 'Nitrofurantoin 100 mg twice daily for 5 days.',
  followUp: 'Review if no better after 3 days or if a fever appears.',
}

const gpPreop: Scenario = {
  id: 'gp-preop', template: 'general', doctor: 'gp', ages: [30, 76], completion: 0.95,
  cases: [
    {
      complaints: 'No complaints. Referred for a pre-operative assessment before a planned laparoscopic cholecystectomy.',
      history: 'Gallstones on ultrasound, two episodes of biliary colic. Surgery at a partner hospital next month.',
      diagnosis: 'Pre-operative assessment. Gallstone disease. No contraindications found so far.',
    },
    {
      complaints: 'Attends for pre-operative tests before a planned knee arthroscopy.',
      history: 'Sports injury of the right knee, meniscal tear on MRI. No previous anaesthetic problems.',
      diagnosis: 'Pre-operative assessment before knee arthroscopy.',
    },
  ],
  examNotes: 'General condition good. Heart sounds regular, chest clear. Airway assessment unremarkable.',
  lab: { always: ['3001', '3016', '3017', '3008', '3004'] },
  instrumental: { always: ['2001'] },
  external: { instrumental: [['Chest X-ray', 0.5]] },
  lifestyle: 'No food for 6 hours and no drinks for 2 hours before surgery.',
  drugs: 'Continue regular medication unless the surgical team says otherwise.',
  followUp: 'Fitness letter for the surgical team once the results are back.',
}

const gpCertificate: Scenario = {
  id: 'gp-certificate', template: 'certificate', doctor: 'gp', ages: [18, 66], completion: 0,
  extra: {
    occupation: oneOf('Office administrator', 'Delivery driver', 'Primary school teacher', 'Warehouse operative', 'Software developer', 'Chef', 'Care assistant'),
    fitness: ({ rng }) => (rng.chance(0.85) ? 'fit for work' : 'fit with restrictions'),
    valid_until: ({ date }) => {
      const [y, m, d] = date.split('-')
      return `${d}/${m}/${Number(y) + 1}`
    },
  },
}

// ============ Gastroenterology (general template) ============

const gastroIbs: Scenario = {
  id: 'gastro-ibs', template: 'general', doctor: 'gastro', ages: [19, 52], completion: 0.6,
  durations: ['4 months', 'half a year', 'a year'],
  complaints: 'Bloating and cramping pain relieved by opening the bowels, alternating constipation and diarrhoea, for {d}.',
  history: 'Worse with stress. No blood in the stool, no weight loss, no family history of bowel cancer.',
  examNotes: 'Abdomen soft, mild tenderness in the left iliac fossa, no masses.',
  diagnosis: 'Irritable bowel syndrome, mixed type, suspected; coeliac disease and IBD to be excluded.',
  lab: { always: ['3001', '3003', 'NL-118', 'CL-210'], maybe: [['CL-209', 0.4], ['3013', 0.3]] },
  instrumental: { maybe: [['2007', 0.6]] },
  consultation: { maybe: [['1013', 0.5]] },
  external: { instrumental: [['Colonoscopy', 0.25]] },
  lifestyle: 'Food and symptom diary for 2 weeks; regular meals, fewer fizzy drinks and sweeteners.',
  drugs: 'Mebeverine 135 mg three times a day before meals for 4 weeks.',
  followUp: 'Review in 4 weeks with the results.',
}

const gastroDyspepsia: Scenario = {
  id: 'gastro-dyspepsia', template: 'general', doctor: 'gastro', ages: [25, 72], completion: 0.7,
  cases: [
    {
      complaints: 'Epigastric pain and early fullness after meals for {d}, occasional nausea.',
      history: 'GP started omeprazole with a partial effect. No weight loss, no vomiting.',
      diagnosis: 'Functional dyspepsia; Helicobacter pylori infection to be excluded.',
    },
    {
      complaints: 'Gnawing pain in the upper abdomen on an empty stomach for {d}, relieved by food.',
      history: 'Took ibuprofen regularly for knee pain last month. Black stools once a week ago.',
      diagnosis: 'Suspected peptic ulcer disease, NSAID-related.',
    },
  ],
  examNotes: 'Epigastric tenderness, no guarding. Liver and spleen not palpable.',
  lab: { always: ['3001'], maybe: [['3019', 0.7], ['3020', 0.3]] },
  instrumental: { maybe: [['2007', 0.7]] },
  consultation: { maybe: [['1012', 0.4]] },
  external: { instrumental: [['Upper GI endoscopy (gastroscopy)', 0.65]] },
  lifestyle: 'Stop NSAIDs. Smaller, regular meals; avoid alcohol and smoking.',
  drugs: 'Lansoprazole 30 mg once daily before breakfast for 8 weeks.',
  followUp: 'Review with the breath test and gastroscopy results.',
}

const gastroFattyLiver: Scenario = {
  id: 'gastro-fatty-liver', template: 'general', doctor: 'gastro', ages: [32, 68], completion: 0.55,
  complaints: 'Discomfort under the right ribs for {d}. Raised liver enzymes on a recent blood test.',
  history: 'Overweight; drinks about 10 units of alcohol a week, mostly at weekends. No history of hepatitis.',
  habits: { alcohol: 0.7 },
  examNotes: 'Liver edge 1 cm below the costal margin, smooth, non-tender. BMI 31.',
  diagnosis: 'Non-alcoholic fatty liver disease, suspected. Raised transaminases.',
  lab: { always: ['3007', '3006', '3010', '3001'], maybe: [['3016', 0.3]] },
  instrumental: { maybe: [['2020', 0.4]] },
  consultation: { maybe: [['1013', 0.6]] },
  lifestyle: 'Lose 7–10% of body weight over 6 months, no alcohol for 3 months, 150 minutes of exercise a week.',
  drugs: 'No medication at this stage.',
  followUp: 'Repeat liver function tests in 3 months.',
}

// ============ Endocrinology ============

const endoDiabetes: Scenario = {
  id: 'endo-t2dm', template: 'endo', doctor: 'endo', ages: [42, 86], completion: 0.8,
  cases: [
    {
      complaints: 'Diabetes review. No hypoglycaemia. Tingling in the feet in the evenings.',
      prevTreatment: 'Metformin 1000 mg twice daily.',
      examNotes: 'Feet: skin intact, pulses present, monofilament sensation reduced at the toes on both sides.',
      diagnosis: 'Type 2 diabetes mellitus, not at target (HbA1c above 7%). Early peripheral neuropathy.',
      drugs: 'Continue metformin 1000 mg twice daily. Add empagliflozin 10 mg once daily in the morning.',
      consultation: { maybe: [['1011', 0.4], ['1013', 0.4]] },
    },
    {
      complaints: 'Diabetes review. Home glucose 6–7.5 mmol/L before breakfast. Feels well.',
      prevTreatment: 'Metformin 1000 mg twice daily, gliclazide 80 mg in the morning.',
      examNotes: 'No injection site problems. Foot pulses present, sensation intact.',
      diagnosis: 'Type 2 diabetes mellitus without complications, on target.',
      drugs: 'Continue current treatment.',
    },
    {
      complaints: 'Newly diagnosed type 2 diabetes, referred by the GP with HbA1c 7.9%. Thirst has eased with diet.',
      prevTreatment: 'None.',
      examNotes: 'Central obesity. Foot pulses present, sensation intact. No acanthosis.',
      diagnosis: 'Type 2 diabetes mellitus, newly diagnosed. Obesity class I.',
      drugs: 'Metformin 500 mg with the evening meal, increasing by 500 mg a week to 1000 mg twice daily.',
      consultation: { always: ['1013'] },
    },
  ],
  history: 'Type 2 diabetes for {years} years. Last HbA1c six months ago.',
  medicalHistory: ['Hypertension, on ramipril.', 'No other chronic conditions.'],
  extra: {
    family_history: oneOf('Mother and brother have type 2 diabetes.', 'Father had type 2 diabetes and a heart attack at 60.', 'No diabetes in the family.'),
    waist: between(98, 114),
    thyroid_palpation: 'not enlarged',
  },
  vitals: { bp: [[126, 142], [76, 88]] },
  lab: { always: ['3010', '3004', '3006', '3008', 'CL-201'], maybe: [['3007', 0.5], ['NL-102', 0.4]] },
  instrumental: { maybe: [['2001', 0.5]] },
  external: { instrumental: [['Diabetic eye screening (retinal photography)', 0.6]] },
  lifestyle: 'Plate method: half vegetables, a quarter protein, a quarter starchy food. Walk after meals. Check the feet daily.',
  followUp: 'Review in 3 months with HbA1c.',
  long: {
    complaints:
      'Diabetes review. Over the last 3 months home glucose before breakfast 8–11 mmol/L, after meals up to 14 mmol/L. ' +
      'Two episodes of shakiness and sweating late in the afternoon that settled after juice; glucose was not measured at the time. ' +
      'Burning and tingling in both feet in the evenings, worse in bed, for about half a year. Blurred vision after long days at the computer. ' +
      'Getting up at night to pass urine twice. Tired by the end of the working day. Weight up by 3 kg since the spring.',
    history:
      'Type 2 diabetes for {years} years. HbA1c 8.4% six months ago, 7.6% a year ago. Last eye screening more than 2 years ago. ' +
      'Diet has slipped since a change of job with shift work and irregular meals. Takes the evening metformin late or forgets it on night shifts. ' +
      'Has never had diabetes education; measures glucose only when feeling unwell.',
    prevTreatment:
      'Metformin 1000 mg twice daily, gliclazide 80 mg in the morning, ramipril 5 mg once daily, atorvastatin 20 mg at night. ' +
      'Over-the-counter alpha-lipoic acid for the feet, no clear effect.',
    medicalHistory:
      'Hypertension for 8 years. Dyslipidaemia. Fatty liver on ultrasound 3 years ago. Laparoscopic appendicectomy at 30. ' +
      'No heart attack or stroke. No known kidney disease.',
    examNotes:
      'Central obesity, BMI 33. Skin: acanthosis nigricans on the neck, no ulcers. ' +
      'Feet: skin dry, callus under the first metatarsal heads on both sides, dorsalis pedis and posterior tibial pulses present. ' +
      'Monofilament sensation reduced at the toes on both sides, vibration sense reduced at the big toes, ankle reflexes reduced. ' +
      'Thyroid not enlarged. Heart sounds regular, no murmurs. Chest clear. No peripheral oedema.',
    diagnosis:
      'Type 2 diabetes mellitus, poorly controlled (HbA1c above target), with distal symmetrical diabetic polyneuropathy. ' +
      'Possible hypoglycaemia on gliclazide with irregular meals. Hypertension, at target. Dyslipidaemia. Obesity class I. Non-alcoholic fatty liver disease.',
    lifestyle:
      'Diabetes education session with the nurse. Regular meals on shift days, no long gaps; carry glucose tablets. ' +
      'Measure glucose before breakfast and 2 hours after the main meal 3 days a week, and whenever feeling shaky. ' +
      'Lose 5–7% of body weight over 6 months. A 20-minute walk after the main meal. ' +
      'Daily foot check, moisturise the feet, no barefoot walking, see a podiatrist for the callus.',
    drugs:
      'Stop gliclazide (risk of hypoglycaemia with shift work). Continue metformin 1000 mg twice daily with meals. ' +
      'Start semaglutide 0.25 mg subcutaneously once a week for 4 weeks, then 0.5 mg once a week; nurse to teach the injection technique. ' +
      'Continue ramipril 5 mg and atorvastatin 20 mg. For the burning feet: amitriptyline 10 mg at night, may increase to 25 mg after 2 weeks.',
    followUp: 'Nurse phone call in 2 weeks about glucose readings and tolerance; review in 3 months with HbA1c, kidney function and lipids.',
  },
}

const endoHypothyroid: Scenario = {
  id: 'endo-hypothyroid', template: 'endo', doctor: 'endo', ages: [24, 76], completion: 0.85,
  cases: [
    {
      complaints: 'Fatigue, feeling cold and weight gain; referred by the GP with TSH 9.8 mIU/L and low free T4.',
      history: 'Symptoms for several months. Thyroid ultrasound shows diffuse changes typical of autoimmune thyroiditis.',
      prevTreatment: 'None.',
      extra: { thyroid_palpation: 'diffusely enlarged' },
      diagnosis: 'Primary hypothyroidism due to autoimmune (Hashimoto’s) thyroiditis.',
      drugs: 'Levothyroxine 50 micrograms once daily on an empty stomach, 30 minutes before breakfast.',
      followUp: 'TSH and free T4 in 6–8 weeks, then review.',
      lab: { always: ['3013', '3014'], maybe: [['3006', 0.4]] },
    },
    {
      complaints: 'Hypothyroidism review. Feels well on levothyroxine, energy back to normal.',
      history: 'Hashimoto’s thyroiditis diagnosed {years} years ago.',
      prevTreatment: 'Levothyroxine 75 micrograms once daily.',
      extra: { thyroid_palpation: 'not enlarged' },
      diagnosis: 'Autoimmune thyroiditis, hypothyroidism; euthyroid on treatment.',
      drugs: 'Continue levothyroxine 75 micrograms daily.',
      followUp: 'TSH in 6 months; review in a year.',
      lab: { always: ['3013'], maybe: [['3014', 0.5]] },
    },
    {
      complaints: 'Review 2 months after starting levothyroxine. Less tired; still some hair loss.',
      history: 'Hashimoto’s thyroiditis diagnosed recently; TSH was 9.8 mIU/L before treatment.',
      prevTreatment: 'Levothyroxine 50 micrograms once daily.',
      extra: { thyroid_palpation: 'diffusely enlarged' },
      diagnosis: 'Primary hypothyroidism, autoimmune thyroiditis; dose being adjusted.',
      drugs: 'Increase levothyroxine to 75 micrograms once daily.',
      followUp: 'TSH in 6–8 weeks.',
      lab: { always: ['3013'], maybe: [['3011', 0.3]] },
    },
  ],
  extra: {
    family_history: oneOf('Mother has hypothyroidism.', 'Sister has Graves’ disease.', 'No thyroid disease in the family.'),
    waist: between(76, 98),
  },
  vitals: { hr: [58, 72] },
  examNotes: 'Skin slightly dry. Heart sounds regular. No tremor, reflexes normal.',
  instrumental: { maybe: [['2006', 0.3]] },
  lifestyle: 'Take levothyroxine separately from iron, calcium and coffee (at least 4 hours from iron and calcium).',
}

const endoNodule: Scenario = {
  id: 'endo-nodule', template: 'endo', doctor: 'endo', ages: [30, 72], completion: 0.6,
  complaints: [
    'No complaints. A thyroid nodule was found on a neck ultrasound.',
    'A feeling of a lump in the throat when swallowing for {d}.',
  ],
  history: 'Thyroid ultrasound: nodule in the right lobe, 14 × 11 mm, TI-RADS 3. No radiation exposure. No family history of thyroid cancer.',
  extra: { thyroid_palpation: 'nodular', family_history: 'No thyroid disease in the family.', waist: between(78, 100) },
  examNotes: 'Firm, mobile nodule in the right lobe, painless. No enlarged neck lymph nodes. Voice normal.',
  diagnosis: 'Nodular goitre: right lobe nodule, TI-RADS 3. Clinically euthyroid.',
  lab: { always: ['3013', '3014'], maybe: [['NL-104', 0.5]] },
  instrumental: { maybe: [['2018', 0.45]] },
  lifestyle: 'No restrictions.',
  drugs: 'No treatment needed at present.',
  followUp: 'Repeat thyroid ultrasound in 12 months, sooner if the lump grows or the voice changes.',
}

const endoObesity: Scenario = {
  id: 'endo-obesity', template: 'endo', doctor: 'endo', ages: [28, 62], completion: 0.5,
  complaints: 'Weight gain of 12 kg over 3 years despite dieting. Cravings for sweets, tiredness after meals.',
  history: 'Fasting glucose 6.4 mmol/L last year. Irregular working hours, little exercise.',
  extra: { waist: between(104, 118), thyroid_palpation: 'not enlarged', family_history: 'Both parents overweight; father has type 2 diabetes.' },
  examNotes: 'BMI 34. Acanthosis nigricans on the neck. No striae.',
  diagnosis: 'Obesity class I. Prediabetes (impaired fasting glucose); insulin resistance suspected.',
  lab: { always: ['3010', '3004', 'NL-112', '3006', '3013'], maybe: [['3007', 0.5], ['NL-114', 0.3]] },
  instrumental: { maybe: [['2020', 0.6]] },
  consultation: { always: ['1013'] },
  lifestyle: 'A daily deficit of about 500 kcal, protein at every meal, 8,000–10,000 steps a day, strength training twice a week.',
  drugs: ['Metformin 500 mg with the evening meal, 500 mg twice daily after 2 weeks if tolerated.', 'No medication; lifestyle programme first.'],
  followUp: 'Review in 3 months with weight and waist measurements.',
}

// ============ Cardiology ============

const cardioAngina: Scenario = {
  id: 'cardio-angina', template: 'cardio', doctor: 'cardio', ages: [50, 78], completion: 0.75,
  durations: ['3 weeks', 'a month', '2 months'],
  complaints: 'Pressing chest pain on stairs or fast walking, easing within 3–5 minutes of rest, for {d}.',
  history: 'Hypertension for 8 years, on ramipril. High cholesterol, not on a statin.',
  prevTreatment: 'Ramipril 5 mg once daily.',
  habits: { smoking: 0.5 },
  extra: {
    risk_factors: ['hypertension', 'dyslipidaemia'],
    ecg: 'Sinus rhythm 72 bpm, normal axis, no acute ST changes.',
    cv_risk: 'high',
  },
  vitals: { bp: [[134, 150], [82, 92]] },
  examNotes: 'Chest clear. Peripheral pulses present. No carotid bruits.',
  diagnosis: 'Stable angina, CCS class II; coronary artery disease suspected. Hypertension. Dyslipidaemia.',
  lab: { always: ['3006', '3004', '3010', '3008', 'CL-204'], maybe: [['CL-207', 0.4], ['3001', 0.5]] },
  instrumental: { always: ['2004', '2005'], maybe: [['2012', 0.4]] },
  external: { instrumental: [['Coronary CT angiography', 0.5]] },
  lifestyle: 'Stop smoking, more walking; chest pain at rest over 15 minutes — call an ambulance.',
  drugs: 'Aspirin 75 mg, atorvastatin 40 mg at night, bisoprolol 2.5 mg in the morning; GTN spray for chest pain.',
  followUp: 'Review with the stress test and echocardiography in 2 weeks.',
}

const cardioPalpitations: Scenario = {
  id: 'cardio-palpitations', template: 'cardio', doctor: 'cardio', ages: [24, 84], completion: 0.8,
  complaints: 'Episodes of a fast, irregular heartbeat lasting 10–30 minutes, two or three times a month, for {d}. Mild breathlessness during episodes.',
  history: 'No known heart disease. Drinks 4–5 cups of coffee a day.',
  extra: {
    heart_sounds: oneOf('regular, no murmurs', 'irregular'),
    ecg: 'Sinus rhythm 68 bpm, PR and QT normal, a single supraventricular ectopic beat.',
    cv_risk: 'low',
  },
  examNotes: 'No signs of heart failure. Thyroid not enlarged.',
  diagnosis: ['Palpitations; paroxysmal atrial fibrillation to be excluded.', 'Symptomatic supraventricular ectopic beats.'],
  lab: { always: ['3013', '3009', 'CL-205', '3001'], maybe: [['CL-203', 0.3]] },
  instrumental: { always: ['2002', '2004'] },
  lifestyle: 'Limit coffee to 1–2 cups a day, no energy drinks, regular sleep.',
  drugs: 'No treatment until the Holter results are back.',
  followUp: 'Review with the Holter results.',
}

const cardioHypertension: Scenario = {
  id: 'cardio-hypertension', template: 'cardio', doctor: 'cardio', ages: [42, 86], completion: 0.7,
  history: 'Hypertension for {years} years. Referred by the GP: not at target on treatment.',
  cases: [
    {
      complaints: 'Hypertension review. Home readings 140–150/88–94 on amlodipine. Ankle swelling in the evenings.',
      prevTreatment: 'Amlodipine 5 mg once daily.',
      extra: { oedema: 'ankles' },
      drugs: 'Add ramipril 5 mg once daily to amlodipine 5 mg. Keep the home blood pressure diary.',
    },
    {
      complaints: 'Hypertension review. Home readings 135–148/85–92. Cramps in the legs at night.',
      prevTreatment: 'Ramipril 5 mg once daily, indapamide 1.5 mg once daily.',
      extra: { oedema: 'none' },
      drugs: 'Replace indapamide with amlodipine 5 mg once daily; continue ramipril 5 mg.',
    },
  ],
  extra: {
    risk_factors: ({ rng }) => (rng.chance(0.5) ? ['hypertension', 'obesity'] : ['hypertension']),
    ecg: 'Sinus rhythm 74 bpm; left ventricular hypertrophy by voltage criteria.',
    cv_risk: oneOf('moderate', 'high'),
  },
  vitals: { bp: [[138, 154], [84, 94]] },
  examNotes: 'Apex beat slightly displaced. No signs of heart failure.',
  diagnosis: 'Essential hypertension, not at target. Hypertensive heart disease (LVH on ECG).',
  lab: { always: ['3008', '3009', '3006', 'CL-201'], maybe: [['CL-202', 0.4]] },
  instrumental: { always: ['2003', '2004'] },
  lifestyle: 'Salt under 5 g a day, regular exercise, keep the home blood pressure diary.',
  followUp: 'Review in 4 weeks with the 24-hour blood pressure monitoring.',
}

const cardioHeartFailure: Scenario = {
  id: 'cardio-hf', template: 'cardio', doctor: 'cardio', ages: [62, 88], completion: 0.85,
  durations: ['3 weeks', 'a month', '6 weeks'],
  complaints: 'Breathless after 100 metres or one flight of stairs, swollen ankles by the evening, for {d}. Sleeps on two pillows.',
  history: 'Myocardial infarction 6 years ago, stent in the right coronary artery. Type 2 diabetes.',
  prevTreatment: 'Aspirin 75 mg, atorvastatin 40 mg, bisoprolol 5 mg, metformin 1000 mg twice daily.',
  extra: {
    risk_factors: ['hypertension', 'diabetes', 'dyslipidaemia'],
    heart_sounds: 'systolic murmur',
    oedema: 'lower legs',
    ecg: 'Sinus rhythm 84 bpm, Q waves in II, III and aVF.',
    cv_risk: 'very high',
  },
  vitals: { bp: [[126, 140], [74, 86]], hr: [80, 92], spo2: [93, 96] },
  examNotes: 'Fine crackles at both lung bases, raised jugular venous pressure, oedema to mid-shin.',
  diagnosis: 'Chronic heart failure, NYHA II–III. Coronary artery disease, old inferior MI. Type 2 diabetes.',
  lab: { always: ['CL-203', '3008', '3009', '3001', '3010', '3007'], maybe: [['CL-205', 0.5]] },
  instrumental: { always: ['2004', '2001'], maybe: [['2002', 0.4]] },
  external: { instrumental: [['Chest X-ray', 0.7]] },
  lifestyle: 'Weigh daily; call if up 2 kg in 3 days. Fluids up to 1.5 litres, salt under 5 g.',
  drugs: 'Furosemide 40 mg in the morning, ramipril 2.5 mg once daily; continue bisoprolol, aspirin, atorvastatin.',
  followUp: 'Review in a week with the echocardiography and results.',
  long: {
    complaints:
      'Increasing breathlessness for {d}: now after about 100 metres on the flat or one flight of stairs, earlier only on hills. ' +
      'Ankles and lower legs swollen by the evening, the swelling goes down overnight only partly. Sleeps on two pillows, ' +
      'woke up twice last week short of breath and had to sit up for a few minutes. Dry cough at night. ' +
      'Weight up by 4 kg in a month without eating more. Tired, has stopped gardening. No chest pain at rest; ' +
      'pressing chest discomfort on brisk walking twice in the last month, settled with rest within minutes. No fainting.',
    history:
      'Inferior myocardial infarction 6 years ago, stent in the right coronary artery at the regional hospital; ' +
      'no cardiology follow-up for the last 3 years. Type 2 diabetes for 10 years. Hypertension for 15 years. ' +
      'Stopped ramipril a year ago because of a dry cough and has not restarted anything instead. Ex-smoker, stopped after the infarction.',
    prevTreatment:
      'Aspirin 75 mg once daily, atorvastatin 40 mg at night, bisoprolol 5 mg in the morning, metformin 1000 mg twice daily, ' +
      'omeprazole 20 mg. Takes ibuprofen several times a week for knee pain.',
    medicalHistory:
      'Osteoarthritis of both knees. Benign prostatic hyperplasia. Cholecystectomy 12 years ago. ' +
      'Last echocardiography 4 years ago: ejection fraction 48%, hypokinesia of the inferior wall.',
    examNotes:
      'Mildly breathless when undressing. Jugular venous pressure raised 4 cm. Apex beat displaced to the anterior axillary line. ' +
      'Heart sounds regular, soft pansystolic murmur at the apex, no gallop rhythm heard. ' +
      'Fine inspiratory crackles at both lung bases up to the lower third. Liver edge 2 cm below the costal margin, tender. ' +
      'Pitting oedema of both lower legs to mid-shin. Feet warm, foot pulses weak but present.',
    diagnosis:
      'Chronic heart failure, NYHA class II–III, worsening; reduced ejection fraction suspected (ischaemic cardiomyopathy). ' +
      'Mitral regurgitation, probably functional. Coronary artery disease: old inferior myocardial infarction, stent in the right coronary artery; ' +
      'exertional angina. Hypertension. Type 2 diabetes. Regular NSAID use as an aggravating factor.',
    lifestyle:
      'Weigh every morning after the toilet and before breakfast, write it down; call the clinic if weight goes up by more than 2 kg in 3 days ' +
      'or breathlessness gets worse. Fluids up to 1.5 litres a day, salt under 5 g. No ibuprofen or other NSAIDs; paracetamol for the knees. ' +
      'Short walks at a comfortable pace every day. Flu and pneumococcal vaccination. ' +
      'Call an ambulance for chest pain at rest lasting over 15 minutes or breathlessness at rest.',
    drugs:
      'Furosemide 40 mg in the morning; may take an extra 40 mg at lunchtime if weight rises by 2 kg. ' +
      'Start sacubitril/valsartan 24/26 mg twice daily once the echocardiography confirms a reduced ejection fraction (not together with any ACE inhibitor). ' +
      'Continue bisoprolol 5 mg; increase to 7.5 mg at the next review if heart rate stays above 70. ' +
      'Start dapagliflozin 10 mg once daily in the morning. Continue aspirin 75 mg and atorvastatin 40 mg. Stop ibuprofen.',
    followUp:
      'Echocardiography this week; review in 7 days with weight diary, kidney function and electrolytes; nurse phone call in 3 days.',
  },
}

// ============ Gynaecology ============

const gynPregnancy: Scenario = {
  id: 'gyn-pregnancy', template: 'gyn', doctor: 'gyn', ages: [22, 40], sex: 'female', completion: 0.9,
  complaints: 'Missed period, positive home pregnancy test. Mild nausea in the mornings.',
  history: 'Planned pregnancy. Taking folic acid for 2 months.',
  extra: {
    lmp: ({ date }) => {
      const d = new Date(`${date}T00:00:00Z`)
      d.setUTCDate(d.getUTCDate() - 49)
      return d.toISOString().slice(0, 10).split('-').reverse().join('/')
    },
    cycle: '28 days, regular',
    obstetric: oneOf('First pregnancy.', 'One previous birth (vaginal, 2022).', 'One previous birth (caesarean section, 2021).'),
    contraception: 'none',
    breasts: 'no abnormalities',
    speculum: 'Cervix clean, closed, bluish. Discharge normal.',
    bimanual: 'Uterus enlarged to about 7 weeks, soft, non-tender. Adnexa normal.',
  },
  examNotes: '',
  diagnosis: 'Intrauterine pregnancy, about 7 weeks by the last menstrual period.',
  lab: { always: ['3015', '3001', '3017', 'CL-214', 'CL-215', '3005', 'CL-213'], maybe: [['3013', 0.6]] },
  instrumental: { always: ['2009'] },
  external: { instrumental: [['Combined first-trimester screening (11–14 weeks)', 0.8]] },
  lifestyle: 'No alcohol or smoking, avoid raw meat and unpasteurised cheese, moderate activity.',
  drugs: 'Folic acid 400 micrograms daily until 12 weeks. Vitamin D 10 micrograms daily.',
  followUp: 'Review with the ultrasound and results in 2 weeks.',
}

const gynScreening: Scenario = {
  id: 'gyn-screening', template: 'gyn', doctor: 'gyn', ages: [25, 64], sex: 'female', completion: 0.85,
  complaints: 'No complaints. Attends for routine cervical screening and a gynaecological check-up.',
  history: 'Last cervical screening 3 years ago, normal.',
  extra: {
    cycle: '28–30 days, regular',
    obstetric: oneOf('Two births (2016, 2019), vaginal.', 'One birth (2018), caesarean section.', 'No pregnancies.'),
    contraception: oneOf('IUD', 'combined pill', 'condoms', 'none'),
    breasts: 'no abnormalities',
    speculum: 'Cervix clean, no visible lesions. Smear and HPV sample taken.',
    bimanual: 'Uterus normal size, mobile, non-tender. Adnexa not palpable.',
  },
  diagnosis: 'Routine cervical screening. No abnormalities on examination.',
  lab: { always: ['NL-117', 'NL-116', '3001'] },
  instrumental: { always: ['2008'], maybe: [['2010', 0.7]] },
  lifestyle: 'Breast self-examination once a month.',
  drugs: 'None.',
  followUp: 'Results by phone in 2 weeks; next screening in 3 years if normal.',
}

const gynHeavyBleeding: Scenario = {
  id: 'gyn-hmb', template: 'gyn', doctor: 'gyn', ages: [28, 50], sex: 'female', completion: 0.65,
  durations: ['half a year', 'a year', '8 months'],
  complaints: 'Heavy periods lasting 7–9 days with clots for {d}; on the heaviest days changes pads every 1–2 hours. Tiredness.',
  history: 'Referred by the GP with low ferritin. No bleeding between periods.',
  extra: {
    cycle: '26–28 days, regular',
    obstetric: oneOf('Two births, vaginal.', 'One birth, vaginal.'),
    contraception: 'condoms',
    breasts: 'no abnormalities',
    speculum: 'Cervix clean, no contact bleeding.',
    bimanual: 'Uterus slightly enlarged, irregular, non-tender. Adnexa normal.',
  },
  diagnosis: 'Heavy menstrual bleeding; uterine fibroids suspected. Iron-deficiency anaemia.',
  lab: { always: ['3001', '3011'], maybe: [['3013', 0.5], ['3016', 0.5]] },
  instrumental: { always: ['2008'] },
  consultation: { maybe: [['1010', 0.4]] },
  lifestyle: 'Iron-rich diet.',
  drugs: 'Tranexamic acid 1 g three times a day on heavy days, up to 4 days per cycle. Continue the iron tablets.',
  followUp: 'Review with the ultrasound results.',
}

const gynPcos: Scenario = {
  id: 'gyn-pcos', template: 'gyn', doctor: 'gyn', ages: [18, 36], sex: 'female', completion: 0.55,
  durations: ['a year', '2 years', '18 months'],
  complaints: 'Periods every 35–60 days for {d}, acne and excess hair on the chin. Planning a pregnancy next year.',
  history: 'Periods were regular as a teenager. Weight gain of 7 kg over 2 years.',
  extra: {
    cycle: '35–60 days, irregular',
    obstetric: 'No pregnancies.',
    contraception: 'none',
    breasts: 'no abnormalities',
    speculum: 'Cervix clean.',
    bimanual: 'Uterus normal size; ovaries felt slightly enlarged on both sides, non-tender.',
  },
  diagnosis: 'Polycystic ovary syndrome, suspected.',
  lab: { always: ['NL-108', 'NL-109', 'NL-110', 'NL-111', 'NL-107', '3013', '3010'], maybe: [['NL-112', 0.5]] },
  instrumental: { always: ['2008'] },
  consultation: { maybe: [['1003', 0.5]] },
  lifestyle: 'Losing 5% of body weight often makes cycles more regular; exercise most days.',
  drugs: 'None until the results are back.',
  followUp: 'Hormone tests on day 3–5 of the cycle; review with the results.',
}

// ============ Neurology ============

const neuroMigraine: Scenario = {
  id: 'neuro-migraine', template: 'neuro', doctor: 'neuro', ages: [18, 52], completion: 0.55,
  durations: ['half a year', 'a year', '2 years'],
  cases: [
    {
      complaints: 'One-sided throbbing headaches 4–6 times a month with nausea and light sensitivity, some with a visual aura.',
      history: 'Since adolescence, more frequent over the last {d}; painkillers up to 12 days a month.',
      prevTreatment: 'Ibuprofen 400 mg, paracetamol 1 g, with partial effect.',
    },
    {
      complaints: 'Review after 2 months of prevention. Attacks down to 2–3 a month and shorter; sumatriptan helps within an hour.',
      history: 'Migraine with aura; propranolol started at the last visit. Headache diary kept.',
      prevTreatment: 'Propranolol 40 mg twice daily, sumatriptan 50 mg for attacks.',
      diagnosis: 'Migraine with aura, episodic; good response to prevention.',
      drugs: 'Continue propranolol 40 mg twice daily for 6 months in total, then taper. Sumatriptan 50 mg for attacks.',
      followUp: 'Review in 4 months.',
      lab: {},
      consultation: {},
    },
  ],
  extra: {
    cranial_nerves: 'intact', reflexes: 'normal, symmetrical', sensation: 'intact', coordination: 'normal',
    motor: 'Tone and power normal in all limbs.',
    spine: 'Tender pericranial and neck muscles.',
  },
  examNotes: 'No focal neurological signs.',
  diagnosis: 'Migraine with aura, episodic, high frequency. Possible medication-overuse headache.',
  lab: { maybe: [['3001', 0.3], ['NL-101', 0.35], ['CL-205', 0.35]] },
  consultation: { always: ['1011'] },
  external: { instrumental: [['Brain MRI', 0.45]] },
  lifestyle: 'Headache diary; regular sleep and meals, enough fluids, limit caffeine.',
  drugs: 'Sumatriptan 50 mg at onset (2 a day at most); propranolol 40 mg twice daily for prevention.',
  followUp: 'Review in 2 months with the headache diary.',
  long: {
    complaints:
      'Headaches for many years, much worse over the last {d}. Now a headache on 18–20 days a month: on most days a dull, pressing headache from waking, ' +
      'and 6–8 times a month a severe throbbing attack on one side (more often the left), with nausea, vomiting twice in the last month, ' +
      'sensitivity to light and noise, needing to lie down in a dark room. About a third of the severe attacks start with zigzag lines spreading across ' +
      'the vision for 20–30 minutes, once with tingling of the right hand and lips. Attacks are triggered by missed meals, poor sleep, red wine and the days before a period. ' +
      'Has missed 5 working days in the last 3 months. Mood low because of the headaches; sleep broken.',
    history:
      'Migraine since the age of 14; mother and sister also have migraine. Attacks were 2–3 a month until a change of job with long screen hours 2 years ago. ' +
      'Takes painkillers on 15–18 days a month: ibuprofen 400–800 mg, paracetamol 1 g, combination tablets with codeine from the pharmacy 2–3 times a week. ' +
      'Tried amitriptyline 10 mg for a month a year ago, stopped because of morning drowsiness. No head injury. No fever, weight loss or night-time waking with headache.',
    prevTreatment:
      'Ibuprofen, paracetamol and co-codamol on most days; sumatriptan has never been tried. Combined contraceptive pill was stopped 2 years ago because of aura.',
    medicalHistory: 'No chronic conditions. No high blood pressure. Not pregnant, uses condoms.',
    examNotes:
      'Alert, oriented. Speech normal. Fundoscopy: discs sharp, no papilloedema. Visual fields full to confrontation. ' +
      'No focal neurological deficit. Gait normal, tandem walking normal, Romberg negative. ' +
      'Marked tenderness of the temporal, occipital and trapezius muscles. Blood pressure normal.',
    diagnosis:
      'Chronic migraine with and without aura (headache on 15 or more days a month, migraine features on at least 8). ' +
      'Medication-overuse headache (simple analgesics and codeine combinations on more than 15 days a month). ' +
      'Tension-type component with pericranial muscle tenderness. No red flags for a secondary headache at present.',
    lifestyle:
      'Headache diary every day (headache days, severity, medication, triggers, period). Regular meals, no skipped breakfast; ' +
      '7–8 hours of sleep at fixed times, including weekends. Screen breaks every hour; workstation set-up. ' +
      'Aerobic exercise 3 times a week, 30 minutes. Limit caffeine to 2 cups a day, no red wine. ' +
      'Painkillers and triptans together no more than 8 days a month; no codeine combinations.',
    drugs:
      'Stop codeine-containing painkillers now. For severe attacks: sumatriptan 50 mg at the start of the headache (not during the aura), ' +
      'may repeat once after 2 hours, no more than 2 tablets in 24 hours, plus naproxen 500 mg and metoclopramide 10 mg for nausea. ' +
      'Prevention: topiramate 25 mg at night for a week, then 25 mg twice daily, then 50 mg twice daily from week 3; ' +
      'it lowers the effect of hormonal contraception — use condoms. Magnesium 400 mg daily.',
    followUp: 'Phone review in 4 weeks about side effects; clinic review in 3 months with the headache diary.',
  },
}

const neuroCarpalTunnel: Scenario = {
  id: 'neuro-carpal-tunnel', template: 'neuro', doctor: 'neuro', ages: [34, 70], completion: 0.65,
  complaints: 'Numbness and tingling in the thumb, index and middle fingers of the right hand, worse at night and waking from sleep, for {d}.',
  history: ['Works at a computer. Hypothyroidism on treatment.', 'Type 2 diabetes for several years. Uses hand tools at work.'],
  extra: {
    cranial_nerves: 'intact', reflexes: 'normal, symmetrical', sensation: 'reduced', coordination: 'normal',
    motor: 'Mild weakness of thumb abduction on the right, no wasting.',
    spine: 'Neck movements full and painless.',
  },
  examNotes: "Tinel's and Phalen's tests positive on the right.",
  diagnosis: 'Carpal tunnel syndrome on the right, moderate.',
  lab: { always: ['3004', '3010', '3013'], maybe: [['NL-102', 0.6]] },
  instrumental: { always: ['2021'] },
  consultation: { maybe: [['1014', 0.4]] },
  external: { consultation: [['Hand surgeon consultation', 0.3]] },
  lifestyle: 'Wrist splint at night, a break from typing every hour.',
  drugs: 'None at this stage.',
  followUp: 'Review with the nerve conduction results.',
}

const neuroTension: Scenario = {
  id: 'neuro-tension', template: 'neuro', doctor: 'neuro', ages: [24, 62], completion: 0.6,
  complaints: 'Dull, pressing headache around the head and neck pain at the end of the working day, almost daily for {d}. Stiff neck.',
  history: 'Long hours at a laptop. Sleep 5–6 hours. Painkillers 2–3 times a week.',
  extra: {
    cranial_nerves: 'intact', reflexes: 'normal, symmetrical', sensation: 'intact', coordination: 'normal',
    motor: 'Tone and power normal.',
    spine: 'Limited neck rotation, tender trapezius and suboccipital muscles.',
  },
  diagnosis: 'Chronic tension-type headache with a cervicogenic component.',
  instrumental: { maybe: [['2012', 0.35]] },
  consultation: { always: ['1014'] },
  external: { instrumental: [['Cervical spine MRI', 0.35]] },
  lifestyle: 'Workstation set-up, daily neck exercises, regular breaks, 7–8 hours of sleep.',
  drugs: 'Amitriptyline 10 mg at night for 2 months. Ibuprofen no more than 2 days a week.',
  followUp: 'Review in 6–8 weeks.',
}

const neuroRadiculopathy: Scenario = {
  id: 'neuro-radiculopathy', template: 'neuro', doctor: 'neuro', ages: [28, 66], completion: 0.5,
  durations: ['3 weeks', 'a month', '6 weeks'],
  complaints: 'Low back pain spreading down the back of the left leg to the foot, with numbness of the outer foot, for {d}.',
  history: 'Started after lifting. GP prescribed ibuprofen and physiotherapy with little effect. No bladder or bowel problems.',
  extra: {
    cranial_nerves: 'intact', reflexes: 'asymmetrical', sensation: 'reduced', coordination: 'normal',
    motor: 'Weakness of left foot plantar flexion, 4/5.',
    spine: 'Lumbar lordosis flattened, paraspinal spasm. Straight leg raise positive on the left at 45°. Left ankle reflex reduced.',
  },
  diagnosis: 'Left S1 radiculopathy, probably due to an L5–S1 disc herniation.',
  lab: { maybe: [['3003', 0.3]] },
  consultation: { always: ['1014'], maybe: [['1011', 0.5]] },
  external: { instrumental: [['Lumbar spine MRI', 0.9]] },
  lifestyle: 'Keep moving, avoid lifting and long sitting.',
  drugs: 'Naproxen 500 mg twice daily with food for 10 days, with omeprazole 20 mg. Pregabalin 75 mg at night for nerve pain.',
  followUp: 'Review with the MRI. Seek help urgently if bladder or bowel control changes or the leg gets weaker.',
}

// ============ Ultrasound ============

const thyroidSizes = (min: number, max: number) => ({
  vol_right: between(min, max, 1),
  vol_left: between(min * 0.85, max * 0.85, 1),
  isthmus: between(2.5, 4.5, 1),
  vol_total: between(min * 1.85, max * 1.85, 1),
})

const usThyroidDiffuse: Scenario = {
  id: 'us-thyroid-diffuse', template: 'usThyroid', doctor: 'us', ages: [20, 76], completion: 0.8,
  cases: [
    {
      extra: {
        thyroid_contour: 'clear, uneven', thyroid_echogenicity: 'reduced', thyroid_structure: 'heterogeneous',
        thyroid_vascularity: 'increased', lymph_nodes: 'not enlarged', ...thyroidSizes(7, 10),
        nodules: 'No nodules. Hypoechoic areas up to 3 mm and fibrous septa throughout both lobes.',
      },
      diagnosis: 'Diffuse changes of the thyroid typical of autoimmune thyroiditis. Thyroid volume within normal limits.',
      consultation: { always: ['1003'] },
      lab: { maybe: [['NL-104', 0.4]] },
    },
    {
      extra: {
        thyroid_contour: 'clear, smooth', thyroid_echogenicity: 'normal', thyroid_structure: 'homogeneous',
        thyroid_vascularity: 'normal', lymph_nodes: 'not enlarged', ...thyroidSizes(5, 8),
        nodules: 'No nodules.',
      },
      diagnosis: 'No ultrasound abnormalities of the thyroid gland.',
    },
  ],
}

const usThyroidNodule: Scenario = {
  id: 'us-thyroid-nodule', template: 'usThyroid', doctor: 'us', ages: [28, 74], completion: 0.7,
  extra: {
    thyroid_contour: 'clear, uneven', thyroid_echogenicity: 'normal', thyroid_structure: 'with nodules',
    thyroid_vascularity: 'normal', lymph_nodes: 'not enlarged', ...thyroidSizes(8, 12),
    nodules: 'Right lobe, middle third: solid isoechoic nodule 14 × 11 × 10 mm, smooth margins, wider than tall, no calcifications, peripheral blood flow. TI-RADS 3.',
  },
  diagnosis: 'Nodular goitre: nodule in the right lobe, TI-RADS 3.',
  consultation: { always: ['1003'] },
  instrumental: { maybe: [['2018', 0.35]] },
  lab: { maybe: [['3013', 0.4]] },
}

const kidneys = {
  kidney_right: oneOf('104 × 48 mm, parenchyma 17 mm, collecting system not dilated', '110 × 50 mm, parenchyma 18 mm, no stones'),
  kidney_left: oneOf('108 × 50 mm, parenchyma 18 mm, collecting system not dilated', '112 × 52 mm, parenchyma 17 mm, no stones'),
}

const usAbdoNormal: Scenario = {
  id: 'us-abdo-normal', template: 'usAbdo', doctor: 'us', ages: [18, 88], completion: 0,
  extra: {
    liver_right: between(128, 146), liver_left: between(52, 64), portal_vein: between(9, 12), liver_echo: 'normal', liver_structure: 'homogeneous',
    gallbladder: 'normal', gb_wall: between(2, 3), cbd: between(3, 5), pancreas: 'no changes', spleen: between(94, 112), ...kidneys,
  },
  diagnosis: 'No abnormalities of the abdominal organs on ultrasound.',
}

const usAbdoSteatosis: Scenario = {
  id: 'us-abdo-steatosis', template: 'usAbdo', doctor: 'us', ages: [30, 74], completion: 0.6,
  extra: {
    liver_right: between(156, 172), liver_left: between(66, 78), portal_vein: between(11, 13), liver_echo: 'increased', liver_structure: 'homogeneous',
    gallbladder: 'normal', gb_wall: between(2, 3), cbd: between(4, 6), pancreas: 'increased echogenicity', spleen: between(102, 118), ...kidneys,
  },
  diagnosis: 'Diffuse liver changes consistent with fatty liver (steatosis). Mild hepatomegaly.',
  lab: { always: ['3007', '3006'] },
  consultation: { maybe: [['1007', 0.6]] },
}

const usAbdoGallstones: Scenario = {
  id: 'us-abdo-gallstones', template: 'usAbdo', doctor: 'us', ages: [32, 76], completion: 0.6,
  extra: {
    liver_right: between(132, 148), liver_left: between(54, 66), portal_vein: between(10, 12), liver_echo: 'normal', liver_structure: 'homogeneous',
    gallbladder: 'stones', gb_wall: between(2, 3), cbd: between(4, 6),
    gb_notes: 'Several mobile echogenic stones up to 12 mm with acoustic shadows. No pericholecystic fluid.',
    pancreas: 'no changes', spleen: between(96, 110), ...kidneys,
  },
  diagnosis: 'Gallstones, no signs of acute cholecystitis. Common bile duct not dilated.',
  lab: { always: ['3007'], maybe: [['3001', 0.5]] },
  external: { consultation: [['Surgical consultation', 1]] },
}

export const SCENARIOS: Scenario[] = [
  gpHypothyroid, gpHypertension, gpAnaemia, gpAnnual, gpUrti, gpBackPain, gpGerd, gpDiabetes, gpUti, gpPreop, gpCertificate,
  gastroIbs, gastroDyspepsia, gastroFattyLiver,
  endoDiabetes, endoHypothyroid, endoNodule, endoObesity,
  cardioAngina, cardioPalpitations, cardioHypertension, cardioHeartFailure,
  gynPregnancy, gynScreening, gynHeavyBleeding, gynPcos,
  neuroMigraine, neuroCarpalTunnel, neuroTension, neuroRadiculopathy,
  usThyroidDiffuse, usThyroidNodule, usAbdoNormal, usAbdoSteatosis, usAbdoGallstones,
]

export const scenarioById = new Map(SCENARIOS.map((s) => [s.id, s]))

// ============ Episodes ============
// A patient's story across visits: e.g. the GP suspects hypothyroidism, the ultrasound doctor scans the thyroid,
// the endocrinologist starts treatment and reviews it. gap — days after the previous step.

/** cases — allowed case indices of the scenario; sameCase — the case of the previous step (e.g. the same drugs). */
export type EpisodeStep = {
  scenario: string
  gap?: readonly [number, number]
  chance?: number
  cases?: readonly number[]
  sameCase?: boolean
}
export type Episode = { id: string; count: number; steps: readonly EpisodeStep[] }

/** A patient has at most one episode of each group (e.g. not both a new and a known diabetes). */
export const EPISODE_GROUPS: readonly (readonly string[])[] = [
  ['diabetes', 'diabetes-known', 'obesity'],
  ['hypothyroid', 'hypothyroid-known', 'thyroid-nodule'],
  ['annual', 'annual-steatosis'],
  ['pregnancy', 'pcos'],
  ['gallstones', 'preop'],
  ['hypertension', 'heart-failure'],
]

/** Episodes a patient may have more than once in half a year. */
export const REPEATABLE_EPISODES: readonly string[] = ['urti', 'uti', 'certificate']

export const EPISODES: Episode[] = [
  { id: 'hypothyroid', count: 7, steps: [{ scenario: 'gp-hypothyroid' }, { scenario: 'us-thyroid-diffuse', gap: [3, 10], cases: [0] }, { scenario: 'endo-hypothyroid', gap: [5, 14], cases: [0] }, { scenario: 'endo-hypothyroid', gap: [45, 62], cases: [2] }] },
  { id: 'hypothyroid-known', count: 4, steps: [{ scenario: 'endo-hypothyroid', cases: [1] }] },
  { id: 'thyroid-nodule', count: 4, steps: [{ scenario: 'us-thyroid-nodule' }, { scenario: 'endo-nodule', gap: [4, 14] }] },
  { id: 'hypertension', count: 8, steps: [{ scenario: 'gp-hypertension' }, { scenario: 'cardio-hypertension', gap: [14, 30], chance: 0.85, sameCase: true }] },
  { id: 'diabetes', count: 6, steps: [{ scenario: 'gp-t2dm' }, { scenario: 'endo-t2dm', gap: [5, 12], cases: [2] }, { scenario: 'endo-t2dm', gap: [80, 100], cases: [0, 1] }] },
  { id: 'diabetes-known', count: 4, steps: [{ scenario: 'endo-t2dm', cases: [0, 1] }, { scenario: 'endo-t2dm', gap: [85, 100], cases: [0, 1] }] },
  { id: 'obesity', count: 3, steps: [{ scenario: 'endo-obesity' }] },
  { id: 'anaemia', count: 5, steps: [{ scenario: 'gp-anaemia' }, { scenario: 'gyn-hmb', gap: [7, 21], chance: 0.8 }] },
  { id: 'annual', count: 10, steps: [{ scenario: 'gp-annual' }, { scenario: 'us-abdo-normal', gap: [1, 7], chance: 0.6 }] },
  { id: 'annual-steatosis', count: 4, steps: [{ scenario: 'gp-annual' }, { scenario: 'us-abdo-steatosis', gap: [1, 7] }, { scenario: 'gastro-fatty-liver', gap: [7, 21], chance: 0.8 }] },
  { id: 'urti', count: 11, steps: [{ scenario: 'gp-urti' }] },
  { id: 'back-pain', count: 7, steps: [{ scenario: 'gp-back-pain' }, { scenario: 'neuro-radiculopathy', gap: [7, 20], chance: 0.55 }] },
  { id: 'gerd', count: 6, steps: [{ scenario: 'gp-gerd' }, { scenario: 'gastro-dyspepsia', gap: [10, 30], chance: 0.6 }] },
  { id: 'ibs', count: 4, steps: [{ scenario: 'gastro-ibs' }] },
  { id: 'uti', count: 6, steps: [{ scenario: 'gp-uti' }] },
  { id: 'gallstones', count: 3, steps: [{ scenario: 'us-abdo-gallstones' }, { scenario: 'gp-preop', gap: [20, 40], cases: [0] }] },
  { id: 'preop', count: 2, steps: [{ scenario: 'gp-preop', cases: [1] }] },
  { id: 'angina', count: 4, steps: [{ scenario: 'cardio-angina' }] },
  { id: 'palpitations', count: 4, steps: [{ scenario: 'cardio-palpitations' }] },
  { id: 'heart-failure', count: 2, steps: [{ scenario: 'cardio-hf' }] },
  { id: 'pregnancy', count: 4, steps: [{ scenario: 'gyn-pregnancy' }] },
  { id: 'screening', count: 7, steps: [{ scenario: 'gyn-screening' }] },
  { id: 'pcos', count: 3, steps: [{ scenario: 'gyn-pcos' }] },
  { id: 'migraine', count: 6, steps: [{ scenario: 'neuro-migraine', cases: [0] }, { scenario: 'neuro-migraine', gap: [50, 70], chance: 0.6, cases: [1] }] },
  { id: 'carpal-tunnel', count: 4, steps: [{ scenario: 'neuro-carpal-tunnel' }] },
  { id: 'tension-headache', count: 6, steps: [{ scenario: 'neuro-tension' }] },
  { id: 'certificate', count: 12, steps: [{ scenario: 'gp-certificate' }] },
]
