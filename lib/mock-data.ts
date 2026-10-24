// Фейковые данные. Позже станут seed-файлом для staging.
import type {
  Staff, Patient, Service, ServicePackage, Folder, Template, TemplateVersion,
  MedDocument, FileRecord, Prescription, PrescriptionItem, PrescriptionFulfillment,
  CrmVisit, ClinicSettings, AuditEntry, Letterhead,
} from './types';

const today = new Date().toISOString().slice(0, 10);
const at = (time: string) => `${today}T${time}:00`;

// Дата в поточному (0) або попередньому (-1) місяці; день обмежується, щоб не виходити в майбутнє / за межі місяця
const inMonth = (monthOffset: 0 | -1, day: number, time = '10:30') => {
  const [y, m, d] = today.split('-').map(Number);
  const first = new Date(y, m - 1 + monthOffset, 1);
  const dd = Math.min(day, monthOffset === 0 ? d : 28);
  const mm = String(first.getMonth() + 1).padStart(2, '0');
  return `${first.getFullYear()}-${mm}-${String(dd).padStart(2, '0')}T${time}:00`;
};

// ============ Сотрудники ============
export const staff: Staff[] = [
  { id: 'st-1', full_name: 'Коваленко Олег Петрович', role: 'manager', specialty: null, crm_master_id: null, is_active: true, photo_url: null },
  { id: 'st-2', full_name: 'Мельник Ірина Василівна', role: 'doctor', specialty: 'Терапевт', crm_master_id: 101, is_active: true, photo_url: null },
  { id: 'st-3', full_name: 'Бондар Андрій Сергійович', role: 'doctor', specialty: 'Ендокринолог', crm_master_id: 102, is_active: true, photo_url: null },
  { id: 'st-4', full_name: 'Ткачук Наталія Ігорівна', role: 'medical_staff', specialty: 'Лікар УЗД', crm_master_id: 103, is_active: true, photo_url: null },
  { id: 'st-5', full_name: 'Савчук Олена Миколаївна', role: 'reception', specialty: null, crm_master_id: null, is_active: true, photo_url: null },
];

// Текущий пользователь (мок). Меняй id, чтобы смотреть интерфейс разных ролей.
export const currentUserId = 'st-1';

// ============ Пациенты ============
export const patients: Patient[] = [
  { id: 'p-1', crm_client_id: 5001, full_name: 'Шевчук Андрій Олександрович', birth_date: '1978-03-14', sex: 'male' },
  { id: 'p-2', crm_client_id: 5002, full_name: 'Литвиненко Марія Іванівна', birth_date: '1991-07-22', sex: 'female' },
  { id: 'p-3', crm_client_id: 5003, full_name: 'Гончаренко Віктор Миколайович', birth_date: '1955-11-02', sex: 'male' },
  { id: 'p-4', crm_client_id: 5004, full_name: 'Кравченко Оксана Петрівна', birth_date: '1984-01-30', sex: 'female' },
  { id: 'p-5', crm_client_id: 5005, full_name: 'Поліщук Дмитро Андрійович', birth_date: '2001-05-09', sex: 'male' },
  { id: 'p-6', crm_client_id: 5006, full_name: 'Руденко Тетяна Василівна', birth_date: '1969-09-18', sex: 'female' },
  { id: 'p-7', crm_client_id: 5007, full_name: 'Мороз Сергій Ігорович', birth_date: '1973-12-25', sex: 'male' },
  { id: 'p-8', crm_client_id: 5008, full_name: 'Ковальчук Юлія Олегівна', birth_date: '1996-02-11', sex: 'female' },
];

// ============ Услуги ============
export const services: Service[] = [
  // консультации (CRM)
  { id: 'sv-1', source: 'crm', lab_name: null, code: '1001', name: 'Консультація терапевта', category: 'consultation', price: 900, is_active: true },
  { id: 'sv-2', source: 'crm', lab_name: null, code: '1003', name: 'Консультація гінеколога', category: 'consultation', price: 1000, is_active: true },
  { id: 'sv-3', source: 'crm', lab_name: null, code: '1006', name: 'Консультація ендокринолога', category: 'consultation', price: 1000, is_active: true },
  { id: 'sv-4', source: 'crm', lab_name: null, code: '1007', name: 'Консультація гастроентеролога', category: 'consultation', price: 1000, is_active: true },
  { id: 'sv-5', source: 'crm', lab_name: null, code: '1008', name: 'Консультація вертебролога', category: 'consultation', price: 1000, is_active: true },
  // инструментальная (CRM)
  { id: 'sv-6', source: 'crm', lab_name: null, code: '2001', name: 'УЗД органів черевної порожнини', category: 'instrumental', price: 750, is_active: true },
  { id: 'sv-7', source: 'crm', lab_name: null, code: '2002', name: 'УЗД щитоподібної залози', category: 'instrumental', price: 550, is_active: true },
  { id: 'sv-8', source: 'crm', lab_name: null, code: '2005', name: 'ЕКГ з розшифровкою', category: 'instrumental', price: 400, is_active: true },
  { id: 'sv-9', source: 'crm', lab_name: null, code: '2010', name: 'Доплерографія артерій нижніх кінцівок', category: 'instrumental', price: 900, is_active: true },
  // анализы (CRM + внешние лаборатории)
  { id: 'sv-10', source: 'crm', lab_name: null, code: '3001', name: 'Загальний аналіз крові', category: 'lab', price: 250, is_active: true },
  { id: 'sv-11', source: 'lab', lab_name: 'Northlab', code: 'ML-114', name: 'ТТГ (тиреотропний гормон)', category: 'lab', price: 320, is_active: true },
  { id: 'sv-12', source: 'lab', lab_name: 'Northlab', code: 'ML-115', name: 'Т4 вільний', category: 'lab', price: 310, is_active: true },
  { id: 'sv-13', source: 'lab', lab_name: 'CityLab', code: 'ES-021', name: 'Глікований гемоглобін (HbA1c)', category: 'lab', price: 420, is_active: true },
  { id: 'sv-14', source: 'lab', lab_name: 'CityLab', code: 'ES-040', name: 'Ліпідограма', category: 'lab', price: 480, is_active: true },
  { id: 'sv-15', source: 'lab', lab_name: 'Northlab', code: 'ML-201', name: 'Вітамін D (25-OH)', category: 'lab', price: 650, is_active: true },
];

export const servicePackages: ServicePackage[] = [
  { id: 'pk-1', name: 'Кардіо чек-ап', items: [{ service_id: 'sv-8', quantity: 1 }, { service_id: 'sv-14', quantity: 1 }, { service_id: 'sv-10', quantity: 1 }] },
  { id: 'pk-2', name: 'Щитоподібна залоза', items: [{ service_id: 'sv-7', quantity: 1 }, { service_id: 'sv-11', quantity: 1 }, { service_id: 'sv-12', quantity: 1 }] },
];

// ============ Папки ============
export const folders: Folder[] = [
  { id: 'f-1', name: 'Консультативні висновки', sort_order: 1 },
  { id: 'f-2', name: 'Результати аналізів', sort_order: 2 },
  { id: 'f-3', name: 'Результати аналізів клініки', sort_order: 3 },
  { id: 'f-4', name: 'Результати аналізів Northlab', sort_order: 4 },
  { id: 'f-5', name: 'Результати аналізів CityLab', sort_order: 5 },
  { id: 'f-6', name: 'Ультразвукова діагностика', sort_order: 6 },
  { id: 'f-7', name: 'Ендоскопічні обстеження', sort_order: 7 },
  { id: 'f-8', name: 'Довідки', sort_order: 8 },
  { id: 'f-9', name: 'Інші файли', sort_order: 9 },
];

// ============ Шаблоны ============
export const templates: Template[] = [
  { id: 'tpl-1', name: 'Консультативний висновок терапевта', kind: 'consultation', folder_id: 'f-1', specialty: 'Терапевт', current_version_id: 'tv-5', is_active: true, header_id: 'lh-028o', footer_id: 'lh-signature-qr', footer_text: null, show_signature: false, banner_image_url: null, footer_image_url: null, package_ids: ['pk-1', 'pk-2'] },
  { id: 'tpl-2', name: 'УЗД щитоподібної залози', kind: 'ultrasound', folder_id: 'f-6', specialty: 'Лікар УЗД', current_version_id: 'tv-2', is_active: true, header_id: 'lh-028o', footer_id: null, footer_text: null, show_signature: true, banner_image_url: null, footer_image_url: null, package_ids: ['pk-2'] },
  { id: 'tpl-3', name: 'Консультативний висновок ендокринолога', kind: 'consultation', folder_id: 'f-1', specialty: 'Ендокринолог', current_version_id: 'tv-3', is_active: true, header_id: 'lh-028o', footer_id: 'lh-signature-qr', footer_text: null, show_signature: false, banner_image_url: null, footer_image_url: null, package_ids: ['pk-2'] },
  { id: 'tpl-4', name: 'Консультативний висновок невролога', kind: 'consultation', folder_id: 'f-1', specialty: 'Невролог', current_version_id: 'tv-4', is_active: true, header_id: 'lh-028o', footer_id: 'lh-signature-qr', footer_text: null, show_signature: false, banner_image_url: null, footer_image_url: null, package_ids: [] },
];

export const templateVersions: TemplateVersion[] = [
  {
    id: 'tv-1',
    template_id: 'tpl-1',
    version: 1,
    created_at: '2026-09-01T10:00:00',
    schema: {
      sections: [
        {
          id: 'sec_complaints',
          title: 'Скарги',
          blocks: [
            { kind: 'field', id: 'complaints', type: 'textarea', label: '', description: 'Усі симптоми, які відчуває пацієнт, включаючи основну причину звернення' },
          ],
        },
        {
          id: 'sec_anamnesis',
          title: 'Анамнез',
          blocks: [
            { kind: 'field', id: 'disease_history', type: 'textarea', label: '', description: 'Коли почалося захворювання, як прогресувало, тривалість' },
            { kind: 'field', id: 'prev_treatment', type: 'textarea', label: 'Попереднє лікування', description: 'Препарати, дози, тривалість — самостійно або за призначенням' },
            { kind: 'field', id: 'allergies', type: 'select', label: 'Алергоанамнез', description: 'Наявність алергічних реакцій', options: ['не обтяжений', 'обтяжений'], defaultValue: 'не обтяжений' },
            { kind: 'field', id: 'habits', type: 'multiselect', label: 'Шкідливі звички', description: 'Куріння, алкоголь', options: ['куріння', 'алкоголь'] },
          ],
        },
        {
          id: 'sec_exam',
          title: "Об'єктивний огляд",
          blocks: [
            { kind: 'field', id: 'general_state', type: 'select', label: 'Загальний стан', description: 'Оцінка загального стану', options: ['задовільний', 'середньої тяжкості', 'тяжкий'], defaultValue: 'задовільний' },
            {
              kind: 'group',
              id: 'vitals',
              title: 'Показники',
              blocks: [
                { kind: 'field', id: 'bp', type: 'text', label: 'АТ', description: 'Артеріальний тиск', unit: 'мм рт. ст.' },
                { kind: 'field', id: 'hr', type: 'number', label: 'ЧСС', description: 'Частота серцевих скорочень', unit: 'уд/хв' },
                { kind: 'field', id: 'temp', type: 'number', label: 'Температура', description: 'Температура тіла', unit: '°C' },
              ],
            },
            { kind: 'field', id: 'exam_notes', type: 'textarea', label: 'Додатково', description: 'Інші дані огляду' },
          ],
        },
        {
          id: 'sec_conclusion',
          title: 'Висновок',
          blocks: [
            { kind: 'field', id: 'diagnosis', type: 'textarea', label: 'Діагноз', description: 'Основний та супутні діагнози', required: true },
          ],
        },
        {
          id: 'sec_recommendations',
          title: 'Рекомендації',
          blocks: [
            { kind: 'services', id: 'rec_lab', label: 'Аналізи', category: 'lab' },
            { kind: 'services', id: 'rec_instrumental', label: 'Інструментальна діагностика', category: 'instrumental' },
            { kind: 'services', id: 'rec_consultation', label: 'Консультації спеціалістів', category: 'consultation' },
            { kind: 'field', id: 'rec_external', type: 'textarea', label: 'Рекомендовані послуги поза клінікою', description: 'Обстеження, які не надаються в клініці' },
            { kind: 'field', id: 'rec_lifestyle', type: 'textarea', label: 'Спосіб життя', description: 'Харчування, режим, фізична активність' },
            { kind: 'field', id: 'rec_drugs', type: 'textarea', label: 'Медикаментозне лікування', description: 'Препарати, дозування, тривалість' },
          ],
        },
      ],
    },
  },
  {
    id: 'tv-2',
    template_id: 'tpl-2',
    version: 1,
    created_at: '2026-10-17T10:00:00',
    schema: {
      sections: [
        {
          id: 'sec_thyroid',
          title: 'Щитоподібна залоза',
          blocks: [
            { kind: 'field', id: 'thyroid_contour', type: 'select', label: 'Контур', description: 'Контур залози', options: ['чіткий, рівний', 'чіткий, нерівний', 'нечіткий'], defaultValue: 'чіткий, рівний' },
            { kind: 'field', id: 'thyroid_echogenicity', type: 'select', label: 'Ехогенність', description: 'Ехогенність паренхіми', options: ['звичайна', 'знижена', 'підвищена', 'неоднорідна'], defaultValue: 'звичайна' },
            { kind: 'field', id: 'thyroid_structure', type: 'select', label: 'Структура', description: 'Структура паренхіми', options: ['однорідна', 'неоднорідна', 'дрібнозерниста', 'з вузловими утвореннями'], defaultValue: 'однорідна' },
          ],
        },
        {
          id: 'sec_thyroid_sizes',
          title: 'Розміри',
          blocks: [
            {
              kind: 'group',
              id: 'thyroid_sizes',
              title: 'Розміри часток',
              blocks: [
                { kind: 'field', id: 'size_right_lobe', type: 'number', label: 'Права частка', description: 'Товщина правої частки', unit: 'мм' },
                { kind: 'field', id: 'size_left_lobe', type: 'number', label: 'Ліва частка', description: 'Товщина лівої частки', unit: 'мм' },
                { kind: 'field', id: 'size_isthmus', type: 'number', label: 'Перешийок', description: 'Товщина перешийка', unit: 'мм' },
              ],
            },
          ],
        },
        {
          id: 'sec_us_conclusion',
          title: 'Висновок',
          blocks: [
            { kind: 'field', id: 'us_conclusion', type: 'textarea', label: 'Заключення', description: 'Ультразвукове заключення: норма або виявлені зміни', required: true },
          ],
        },
        {
          id: 'sec_us_recommendations',
          title: 'Рекомендації',
          blocks: [
            { kind: 'services', id: 'rec_lab', label: 'Аналізи', category: 'lab' },
            { kind: 'services', id: 'rec_instrumental', label: 'Інструментальна діагностика', category: 'instrumental' },
            { kind: 'services', id: 'rec_consultation', label: 'Консультації спеціалістів', category: 'consultation' },
            { kind: 'field', id: 'rec_lifestyle', type: 'textarea', label: 'Спосіб життя', description: 'Харчування, режим, фізична активність' },
            { kind: 'field', id: 'rec_drugs', type: 'textarea', label: 'Медикаментозне лікування', description: 'Препарати, дозування, тривалість' },
          ],
        },
      ],
    },
  },
];

// Версія 2 висновку терапевта: без поля «Рекомендовані послуги поза клінікою» (rec_external) — такі послуги тепер
// чипи в полях послуг. Старі документи лишаються на tv-1 і показують це поле як було.
// Як у бланку клініки, перше поле «Скарг» і «Анамнезу» без назви — на аркуші текст одразу під смугою (демо-дані:
// виправлено й у tv-1, щоб старі висновки виглядали так само).
templateVersions.push({
  id: 'tv-5', template_id: 'tpl-1', version: 2, created_at: '2026-10-20T09:00:00',
  schema: {
    sections: templateVersions[0].schema.sections.map((section) => ({
      ...structuredClone(section),
      blocks: section.blocks.filter((b) => b.id !== 'rec_external').map((b) => structuredClone(b)),
    })),
  },
});

// Консультації ендокринолога і невролога: схема — копія висновку терапевта (tv-5).
for (const [id, template_id] of [['tv-3', 'tpl-3'], ['tv-4', 'tpl-4']] as const) {
  templateVersions.push({
    id, template_id, version: 1, created_at: '2026-10-18T09:00:00',
    schema: structuredClone(templateVersions.find((v) => v.id === 'tv-5')!.schema),
  });
}

// ============ Документы ============
export const documents: MedDocument[] = [
  {
    id: 'd-1', patient_id: 'p-1', kind: 'template', template_version_id: 'tv-1', folder_id: 'f-1',
    title: 'Консультативний висновок терапевта', number: 'КВ-000124', document_date: '2026-09-22',
    author_id: 'st-2', created_at: '2026-09-22T10:40:00', updated_at: '2026-09-22T10:55:00',
    values: {
      complaints: 'Підвищена втомлюваність, сухість у роті, спрага протягом 2 місяців.',
      disease_history: 'Симптоми поступово наростають, раніше не обстежувався.',
      allergies: 'не обтяжений',
      habits: ['куріння'],
      general_state: 'задовільний',
      bp: '135/85', hr: 78, temp: 36.6,
      diagnosis: 'Підозра на порушення вуглеводного обміну. Дообстеження.',
      rec_lab: [{ serviceId: 'sv-13', quantity: 1 }, { serviceId: 'sv-10', quantity: 1 }],
      rec_instrumental: [{ serviceId: 'sv-6', quantity: 1 }],
      rec_consultation: [{ serviceId: 'sv-3', quantity: 1 }],
      rec_external: '',
      rec_lifestyle: 'Обмежити прості вуглеводи, ходьба 30 хв щодня.',
      rec_drugs: '',
    },
  },
  {
    id: 'd-2', patient_id: 'p-1', kind: 'upload', template_version_id: null, folder_id: 'f-4',
    title: 'Результати аналізів Northlab', number: null, document_date: '2026-09-25',
    author_id: 'st-5', created_at: '2026-09-25T15:10:00', updated_at: '2026-09-25T15:10:00', values: null,
  },
  {
    id: 'd-3', patient_id: 'p-1', kind: 'upload', template_version_id: null, folder_id: 'f-6',
    title: 'УЗД органів черевної порожнини', number: null, document_date: '2026-09-26',
    author_id: 'st-4', created_at: '2026-09-26T09:30:00', updated_at: '2026-09-26T09:30:00', values: null,
  },
  {
    id: 'd-4', patient_id: 'p-2', kind: 'template', template_version_id: 'tv-1', folder_id: 'f-1',
    title: 'Консультативний висновок терапевта', number: 'КВ-000131', document_date: '2026-10-02',
    author_id: 'st-2', created_at: '2026-10-02T12:00:00', updated_at: '2026-10-02T12:00:00',
    values: {
      complaints: 'Серцебиття, тремор рук, втрата ваги.',
      general_state: 'задовільний',
      bp: '128/80', hr: 96, temp: 36.8,
      diagnosis: 'Підозра на гіпертиреоз.',
      rec_lab: [{ serviceId: 'sv-11', quantity: 1 }, { serviceId: 'sv-12', quantity: 1 }],
      rec_instrumental: [{ serviceId: 'sv-7', quantity: 1 }, { serviceId: 'sv-8', quantity: 1 }],
      rec_consultation: [{ serviceId: 'sv-3', quantity: 1 }],
      rec_external: 'Сцинтиграфія щитоподібної залози',
    },
  },
  {
    id: 'd-5', patient_id: 'p-3', kind: 'upload', template_version_id: null, folder_id: 'f-8',
    title: 'Довідка для басейну', number: null, document_date: '2026-08-14',
    author_id: 'st-5', created_at: '2026-08-14T11:00:00', updated_at: '2026-08-14T11:00:00', values: null,
  },
  {
    id: 'd-6', patient_id: 'p-2', kind: 'template', template_version_id: 'tv-1', folder_id: 'f-1',
    title: 'Консультативний висновок терапевта', number: 'КВ-000140', document_date: today,
    author_id: 'st-2', created_at: at('09:35'), updated_at: at('09:35'),
    values: {
      complaints: 'Контрольний огляд після обстеження щитоподібної залози.',
      general_state: 'задовільний',
      diagnosis: 'Гіпертиреоз, початкова стадія. Лікування за призначенням ендокринолога.',
    },
  },
];

export const files: FileRecord[] = [
  { id: 'fl-1', document_id: 'd-2', patient_id: 'p-1', file_name: 'northlab_5001_250926.pdf', mime_type: 'application/pdf', size_bytes: 184_000, url: '/samples/sample.pdf', created_at: '2026-09-25T15:10:00' },
  { id: 'fl-2', document_id: 'd-3', patient_id: 'p-1', file_name: 'uzd_ocp_1.jpg', mime_type: 'image/jpeg', size_bytes: 420_000, url: '/samples/sample.jpg', created_at: '2026-09-26T09:30:00' },
  { id: 'fl-3', document_id: 'd-3', patient_id: 'p-1', file_name: 'uzd_ocp_2.jpg', mime_type: 'image/jpeg', size_bytes: 398_000, url: '/samples/sample.jpg', created_at: '2026-09-26T09:30:00' },
  { id: 'fl-4', document_id: 'd-5', patient_id: 'p-3', file_name: 'dovidka.png', mime_type: 'image/png', size_bytes: 210_000, url: '/samples/sample.jpg', created_at: '2026-08-14T11:00:00' },
];

// ============ Призначення ============
export const prescriptions: Prescription[] = [
  {
    id: 'rx-1', patient_id: 'p-1', doctor_id: 'st-2', source_document_id: 'd-1',
    title: 'Призначення з візиту від 22.09.2026', valid_until: '2026-10-22',
    external_recommendations: null, status: 'active', locked_at: '2026-09-25T14:50:00',
    created_at: '2026-09-22T10:55:00', deleted_at: null, deleted_by: null,
  },
  {
    id: 'rx-2', patient_id: 'p-2', doctor_id: 'st-2', source_document_id: 'd-4',
    title: 'Призначення з візиту від 02.10.2026', valid_until: '2026-11-02',
    external_recommendations: 'Сцинтиграфія щитоподібної залози', status: 'active', locked_at: null,
    created_at: '2026-10-02T12:00:00', deleted_at: null, deleted_by: null,
  },
  {
    id: 'rx-3', patient_id: 'p-4', doctor_id: 'st-3', source_document_id: null,
    title: `Призначення від ${today.split('-').reverse().join('.')}`, valid_until: null,
    external_recommendations: null, status: 'active', locked_at: null,
    created_at: at('09:20'), deleted_at: null, deleted_by: null,
  },
  // Поточний місяць
  {
    id: 'rx-4', patient_id: 'p-3', doctor_id: 'st-3', source_document_id: null,
    title: 'Призначення ендокринолога', valid_until: null,
    external_recommendations: null, status: 'active', locked_at: inMonth(0, 3, '14:10'),
    created_at: inMonth(0, 3, '11:15'), deleted_at: null, deleted_by: null,
  },
  {
    id: 'rx-5', patient_id: 'p-5', doctor_id: 'st-2', source_document_id: null,
    title: 'Призначення терапевта', valid_until: null,
    external_recommendations: null, status: 'completed', locked_at: inMonth(0, 5, '13:00'),
    created_at: inMonth(0, 4, '15:40'), deleted_at: null, deleted_by: null,
  },
  {
    id: 'rx-6', patient_id: 'p-6', doctor_id: 'st-4', source_document_id: null,
    title: 'Призначення з УЗД', valid_until: null,
    external_recommendations: null, status: 'active', locked_at: inMonth(0, 7, '12:20'),
    created_at: inMonth(0, 6, '10:05'), deleted_at: null, deleted_by: null,
  },
  // Попередній місяць
  {
    id: 'rx-7', patient_id: 'p-7', doctor_id: 'st-2', source_document_id: null,
    title: 'Призначення терапевта', valid_until: null,
    external_recommendations: null, status: 'completed', locked_at: inMonth(-1, 19, '12:00'),
    created_at: inMonth(-1, 18, '09:50'), deleted_at: null, deleted_by: null,
  },
  {
    id: 'rx-8', patient_id: 'p-8', doctor_id: 'st-3', source_document_id: null,
    title: 'Призначення ендокринолога', valid_until: null,
    external_recommendations: null, status: 'completed', locked_at: inMonth(-1, 22, '16:30'),
    created_at: inMonth(-1, 21, '12:10'), deleted_at: null, deleted_by: null,
  },
  {
    id: 'rx-9', patient_id: 'p-3', doctor_id: 'st-3', source_document_id: null,
    title: 'Призначення ендокринолога', valid_until: null,
    external_recommendations: null, status: 'active', locked_at: null,
    created_at: inMonth(-1, 9, '10:20'), deleted_at: null, deleted_by: null,
  },
  {
    id: 'rx-10', patient_id: 'p-6', doctor_id: 'st-2', source_document_id: null,
    title: 'Призначення терапевта', valid_until: null,
    external_recommendations: null, status: 'active', locked_at: null,
    created_at: inMonth(-1, 5, '13:45'), deleted_at: null, deleted_by: null,
  },
  {
    id: 'rx-11', patient_id: 'p-4', doctor_id: 'st-4', source_document_id: null,
    title: 'Призначення з УЗД', valid_until: null,
    external_recommendations: null, status: 'active', locked_at: inMonth(-1, 15, '11:30'),
    created_at: inMonth(-1, 14, '11:00'), deleted_at: null, deleted_by: null,
  },
];

export const prescriptionItems: PrescriptionItem[] = [
  // rx-1
  { id: 'ri-1', prescription_id: 'rx-1', service_id: 'sv-13', custom_name: null, section: 'lab', quantity: 1, unit_price: 420, discount_pct: 0 },
  { id: 'ri-2', prescription_id: 'rx-1', service_id: 'sv-10', custom_name: null, section: 'lab', quantity: 1, unit_price: 250, discount_pct: 0 },
  { id: 'ri-3', prescription_id: 'rx-1', service_id: 'sv-6', custom_name: null, section: 'instrumental', quantity: 1, unit_price: 750, discount_pct: 0 },
  { id: 'ri-4', prescription_id: 'rx-1', service_id: 'sv-3', custom_name: null, section: 'consultation', quantity: 1, unit_price: 1000, discount_pct: 0 },
  // rx-2
  { id: 'ri-5', prescription_id: 'rx-2', service_id: 'sv-11', custom_name: null, section: 'lab', quantity: 1, unit_price: 320, discount_pct: 0 },
  { id: 'ri-6', prescription_id: 'rx-2', service_id: 'sv-12', custom_name: null, section: 'lab', quantity: 1, unit_price: 310, discount_pct: 0 },
  { id: 'ri-7', prescription_id: 'rx-2', service_id: 'sv-7', custom_name: null, section: 'instrumental', quantity: 1, unit_price: 550, discount_pct: 0 },
  { id: 'ri-8', prescription_id: 'rx-2', service_id: 'sv-8', custom_name: null, section: 'instrumental', quantity: 1, unit_price: 400, discount_pct: 0 },
  { id: 'ri-9', prescription_id: 'rx-2', service_id: 'sv-3', custom_name: null, section: 'consultation', quantity: 1, unit_price: 1000, discount_pct: 0 },
  // rx-3
  { id: 'ri-10', prescription_id: 'rx-3', service_id: 'sv-15', custom_name: null, section: 'lab', quantity: 1, unit_price: 650, discount_pct: 0 },
  // rx-4
  { id: 'ri-11', prescription_id: 'rx-4', service_id: 'sv-13', custom_name: null, section: 'lab', quantity: 1, unit_price: 420, discount_pct: 0 },
  { id: 'ri-12', prescription_id: 'rx-4', service_id: 'sv-14', custom_name: null, section: 'lab', quantity: 1, unit_price: 480, discount_pct: 0 },
  { id: 'ri-13', prescription_id: 'rx-4', service_id: 'sv-3', custom_name: null, section: 'consultation', quantity: 1, unit_price: 1000, discount_pct: 0 },
  // rx-5
  { id: 'ri-14', prescription_id: 'rx-5', service_id: 'sv-1', custom_name: null, section: 'consultation', quantity: 1, unit_price: 900, discount_pct: 0 },
  { id: 'ri-15', prescription_id: 'rx-5', service_id: 'sv-8', custom_name: null, section: 'instrumental', quantity: 1, unit_price: 400, discount_pct: 0 },
  // rx-6
  { id: 'ri-16', prescription_id: 'rx-6', service_id: 'sv-6', custom_name: null, section: 'instrumental', quantity: 1, unit_price: 750, discount_pct: 0 },
  { id: 'ri-17', prescription_id: 'rx-6', service_id: 'sv-9', custom_name: null, section: 'instrumental', quantity: 1, unit_price: 900, discount_pct: 0 },
  // rx-7
  { id: 'ri-18', prescription_id: 'rx-7', service_id: 'sv-10', custom_name: null, section: 'lab', quantity: 1, unit_price: 250, discount_pct: 0 },
  { id: 'ri-19', prescription_id: 'rx-7', service_id: 'sv-15', custom_name: null, section: 'lab', quantity: 1, unit_price: 650, discount_pct: 0 },
  { id: 'ri-20', prescription_id: 'rx-7', service_id: 'sv-1', custom_name: null, section: 'consultation', quantity: 1, unit_price: 900, discount_pct: 0 },
  // rx-8
  { id: 'ri-21', prescription_id: 'rx-8', service_id: 'sv-3', custom_name: null, section: 'consultation', quantity: 1, unit_price: 1000, discount_pct: 0 },
  { id: 'ri-22', prescription_id: 'rx-8', service_id: 'sv-11', custom_name: null, section: 'lab', quantity: 1, unit_price: 320, discount_pct: 0 },
  { id: 'ri-23', prescription_id: 'rx-8', service_id: 'sv-12', custom_name: null, section: 'lab', quantity: 1, unit_price: 310, discount_pct: 0 },
  // rx-9 (без виконання)
  { id: 'ri-24', prescription_id: 'rx-9', service_id: 'sv-9', custom_name: null, section: 'instrumental', quantity: 1, unit_price: 900, discount_pct: 0 },
  { id: 'ri-25', prescription_id: 'rx-9', service_id: 'sv-4', custom_name: null, section: 'consultation', quantity: 1, unit_price: 1000, discount_pct: 0 },
  // rx-10 (без виконання)
  { id: 'ri-26', prescription_id: 'rx-10', service_id: 'sv-14', custom_name: null, section: 'lab', quantity: 1, unit_price: 480, discount_pct: 0 },
  { id: 'ri-27', prescription_id: 'rx-10', service_id: 'sv-8', custom_name: null, section: 'instrumental', quantity: 1, unit_price: 400, discount_pct: 0 },
  { id: 'ri-28', prescription_id: 'rx-10', service_id: 'sv-1', custom_name: null, section: 'consultation', quantity: 1, unit_price: 900, discount_pct: 0 },
  // rx-11
  { id: 'ri-29', prescription_id: 'rx-11', service_id: 'sv-6', custom_name: null, section: 'instrumental', quantity: 1, unit_price: 750, discount_pct: 0 },
  { id: 'ri-30', prescription_id: 'rx-11', service_id: 'sv-7', custom_name: null, section: 'instrumental', quantity: 1, unit_price: 550, discount_pct: 0 },
  { id: 'ri-31', prescription_id: 'rx-11', service_id: 'sv-8', custom_name: null, section: 'instrumental', quantity: 1, unit_price: 400, discount_pct: 0 },
];

export const prescriptionFulfillments: PrescriptionFulfillment[] = [
  { id: 'pf-1', prescription_item_id: 'ri-1', quantity: 1, amount_paid: 420, fulfilled_at: '2026-09-25T14:50:00' },
  { id: 'pf-2', prescription_item_id: 'ri-2', quantity: 1, amount_paid: 250, fulfilled_at: '2026-09-25T14:50:00' },
  { id: 'pf-3', prescription_item_id: 'ri-3', quantity: 1, amount_paid: 750, fulfilled_at: '2026-09-26T09:00:00' },
  // rx-4: 2 з 3
  { id: 'pf-4', prescription_item_id: 'ri-11', quantity: 1, amount_paid: 420, fulfilled_at: inMonth(0, 3, '14:10') },
  { id: 'pf-5', prescription_item_id: 'ri-12', quantity: 1, amount_paid: 480, fulfilled_at: inMonth(0, 3, '14:10') },
  // rx-5: 2 з 2
  { id: 'pf-6', prescription_item_id: 'ri-14', quantity: 1, amount_paid: 900, fulfilled_at: inMonth(0, 5, '13:00') },
  { id: 'pf-7', prescription_item_id: 'ri-15', quantity: 1, amount_paid: 400, fulfilled_at: inMonth(0, 5, '13:00') },
  // rx-6: 1 з 2
  { id: 'pf-8', prescription_item_id: 'ri-16', quantity: 1, amount_paid: 750, fulfilled_at: inMonth(0, 7, '12:20') },
  // rx-7: 3 з 3
  { id: 'pf-9', prescription_item_id: 'ri-18', quantity: 1, amount_paid: 250, fulfilled_at: inMonth(-1, 19, '12:00') },
  { id: 'pf-10', prescription_item_id: 'ri-19', quantity: 1, amount_paid: 650, fulfilled_at: inMonth(-1, 19, '12:00') },
  { id: 'pf-11', prescription_item_id: 'ri-20', quantity: 1, amount_paid: 900, fulfilled_at: inMonth(-1, 19, '12:00') },
  // rx-8: 3 з 3
  { id: 'pf-12', prescription_item_id: 'ri-21', quantity: 1, amount_paid: 1000, fulfilled_at: inMonth(-1, 22, '16:30') },
  { id: 'pf-13', prescription_item_id: 'ri-22', quantity: 1, amount_paid: 320, fulfilled_at: inMonth(-1, 22, '16:30') },
  { id: 'pf-14', prescription_item_id: 'ri-23', quantity: 1, amount_paid: 310, fulfilled_at: inMonth(-1, 22, '16:30') },
  // rx-11: 1 з 3
  { id: 'pf-15', prescription_item_id: 'ri-30', quantity: 1, amount_paid: 550, fulfilled_at: inMonth(-1, 15, '11:30') },
];

// ============ Записи на сегодня (кеш CRM) ============
export const crmVisits: CrmVisit[] = [
  { crm_visit_id: 90001, crm_client_id: 5002, crm_master_id: 101, visit_at: at('09:00'), status: 'confirmed' },
  { crm_visit_id: 90002, crm_client_id: 5005, crm_master_id: 101, visit_at: at('09:40'), status: 'confirmed' },
  { crm_visit_id: 90003, crm_client_id: 5006, crm_master_id: 101, visit_at: at('10:20'), status: 'confirmed' },
  { crm_visit_id: 90004, crm_client_id: 5007, crm_master_id: 101, visit_at: at('11:00'), status: 'new' },
  { crm_visit_id: 90005, crm_client_id: 5004, crm_master_id: 102, visit_at: at('09:00'), status: 'confirmed' },
  { crm_visit_id: 90006, crm_client_id: 5008, crm_master_id: 103, visit_at: at('10:00'), status: 'confirmed' },
];

// ============ Настройки и аудит ============
// Бланк призначення: окрема шапка, без підвалу — підписів у призначенні немає.
export const clinicSettings: ClinicSettings = {
  prescription_header_image_url: '/letterheads/header-plan.png',
  prescription_footer_image_url: null,
};

// ============ Бланки: шапки і підвали (для шаблонів) ============
// Файли лежать у public/letterheads/.
export const letterheads: Letterhead[] = [
  { id: 'lh-028o', kind: 'header', name: 'Медична документація', image_url: '/letterheads/header-consultation.png', is_default: true },
  { id: 'lh-tov-235o', kind: 'header', name: 'Лабораторія', image_url: '/letterheads/header-lab.png', is_default: false },
  { id: 'lh-fop-license', kind: 'header', name: 'Загальна', image_url: '/letterheads/header-plan.png', is_default: false },
  { id: 'lh-signature-qr', kind: 'footer', name: 'Підпис і запис онлайн', image_url: '/letterheads/footer-signature.png', is_default: false },
];

export const auditLog: AuditEntry[] = [
  { id: 1, at: '2026-09-22T10:55:00', actor_type: 'staff', actor_id: 'st-2', action: 'create', entity_type: 'document', entity_id: 'd-1', patient_id: 'p-1', description: 'Створено консультативний висновок' },
  { id: 2, at: '2026-09-22T10:55:01', actor_type: 'system', actor_id: null, action: 'create', entity_type: 'prescription', entity_id: 'rx-1', patient_id: 'p-1', description: 'Створено призначення з висновку' },
  { id: 3, at: '2026-09-25T14:50:00', actor_type: 'system', actor_id: null, action: 'update', entity_type: 'prescription', entity_id: 'rx-1', patient_id: 'p-1', description: 'Зафіксовано оплату, призначення заблоковано' },
  { id: 4, at: '2026-09-25T15:10:00', actor_type: 'staff', actor_id: 'st-5', action: 'create', entity_type: 'document', entity_id: 'd-2', patient_id: 'p-1', description: 'Завантажено результати аналізів Northlab' },
];
