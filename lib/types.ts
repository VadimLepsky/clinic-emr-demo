// Типы сущностей повторяют таблицы БД (snake_case), чтобы при подключении Supabase ничего не мапить.
// JSON внутри шаблона и документа — camelCase.

// ============ Сущности ============

export type StaffRole = 'manager' | 'doctor' | 'medical_staff' | 'contact_center' | 'reception';

export type Staff = {
  id: string;
  full_name: string;
  role: StaffRole;
  specialty: string | null;
  crm_master_id: number | null;
  is_active: boolean;
  photo_url: string | null;
};

export type Patient = {
  id: string;
  crm_client_id: number;
  full_name: string;
  birth_date: string | null; // ISO date
  sex: 'male' | 'female' | null;
};

export type ServiceSource = 'crm' | 'lab';
export type ServiceCategory = 'lab' | 'instrumental' | 'consultation' | 'other';

export type Service = {
  id: string;
  source: ServiceSource;
  lab_name: string | null;
  code: string | null;
  name: string;
  category: ServiceCategory;
  price: number; // текущая цена (в БД — из service_prices)
  is_active: boolean;
};

export type ServicePackage = {
  id: string;
  name: string;
  items: { service_id: string; quantity: number }[];
};

export type Folder = {
  id: string;
  name: string;
  sort_order: number;
};

export type TemplateKind = 'consultation' | 'ultrasound' | 'lab' | 'certificate' | 'other';

export type Template = {
  id: string;
  name: string;
  kind: TemplateKind;
  folder_id: string;
  specialty: string | null;
  current_version_id: string;
  is_active: boolean;
  header_id: string | null; // шапка з бібліотеки бланків (Налаштування → Шапки і підвали); null — без шапки
  footer_id: string | null; // підвал з бібліотеки бланків; null — без підвалу
  footer_text: string | null; // підвал конкретного шаблону (апарат, дисклеймер), може містити змінні
  show_signature: boolean; // рядок «Лікар: ПІБ ____ (підпис)» наприкінці
  banner_image_url: string | null; // банер праворуч від заголовка (реклама, QR); у моках — data URL
  footer_image_url: string | null; // логотип у підвалі праворуч (апарат, партнер); у моках — data URL
  package_ids: string[]; // пакети послуг, що показуються кнопками при заповненні; порожньо — рядка пакетів немає
};

export type TemplateVersion = {
  id: string;
  template_id: string;
  version: number;
  schema: TemplateSchema;
  created_at: string;
};

export type DocumentKind = 'template' | 'upload';

export type MedDocument = {
  id: string;
  patient_id: string;
  kind: DocumentKind;
  template_version_id: string | null;
  folder_id: string;
  title: string;
  number: string | null;
  document_date: string; // ISO date
  values: DocumentValues | null;
  author_id: string | null;
  created_at: string;
  updated_at: string;
};

export type FileRecord = {
  id: string;
  document_id: string;
  patient_id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  url: string; // в моках — заглушка
  created_at: string;
};

export type PrescriptionStatus = 'active' | 'completed' | 'cancelled';

export type Prescription = {
  id: string;
  patient_id: string;
  doctor_id: string;
  source_document_id: string | null;
  title: string;
  valid_until: string | null; // внутрішній строк виконання (+30 днів), користувачу не показується
  external_recommendations: string | null; // устаревшее: старые призначення; новые кладут услуги вне клиники в позиции
  status: PrescriptionStatus;
  locked_at: string | null; // не null = была оплата, редактировать нельзя
  created_at: string;
  deleted_at: string | null; // мягкое удаление: скрыто из списков, финансовая история сохраняется
  deleted_by: string | null;
};

// Позиция — либо услуга из справочника (service_id), либо услуга вне клиники (custom_name: только название,
// без кода и цены; в суммы и % выполнения не входит, выполнения у неё нет).
export type PrescriptionItem = {
  id: string;
  prescription_id: string;
  service_id: string | null;
  custom_name: string | null;
  section: ServiceCategory;
  quantity: number;
  unit_price: number; // цена на момент создания; 0 у услуги вне клиники
  discount_pct: number;
};

export type PrescriptionFulfillment = {
  id: string;
  prescription_item_id: string;
  quantity: number;
  amount_paid: number;
  fulfilled_at: string;
};

// Вычисляемое представление для таблицы призначень
export type PrescriptionSummary = Prescription & {
  doctor_name: string;
  patient_name: string;
  total_amount: number;
  used_amount: number;
  paid_amount: number;
  completion_pct: number; // 0–100
};

export type CrmVisit = {
  crm_visit_id: number;
  crm_client_id: number;
  crm_master_id: number;
  visit_at: string; // ISO datetime
  status: string;
};

// Бланк призначення — окремо від бібліотеки: шапка й підвал призначень, картинки на всю ширину листа
// (шлях /letterheads/… або data URL); null — без шапки / без підвалу.
export type ClinicSettings = {
  prescription_header_image_url: string | null;
  prescription_footer_image_url: string | null;
};

export type LetterheadKind = 'header' | 'footer';

// Бланк з бібліотеки (для шаблонів): шапка або підвал листа А4 — картинка на всю ширину вмісту листа.
// is_default — шапка нових шаблонів і документів без шаблону; одна серед шапок.
export type Letterhead = {
  id: string;
  kind: LetterheadKind;
  name: string;
  image_url: string; // /letterheads/… (заздалегідь завантажені) або data URL (нові); потім Supabase Storage
  is_default: boolean;
};

export type AuditEntry = {
  id: number;
  at: string;
  actor_type: 'staff' | 'system' | 'ai';
  actor_id: string | null;
  action: 'create' | 'update' | 'delete' | 'print';
  entity_type: string;
  entity_id: string | null;
  patient_id: string | null;
  description: string;
};

// ============ Шаблон (template_versions.schema) ============

export type TemplateSchema = {
  sections: Section[];
};

export type Section = {
  id: string;
  title: string;
  blocks: Block[];
};

export type Block = FieldBlock | GroupBlock | ServicesBlock | StaticTextBlock | ImageBlock;

export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'checkbox';

export type FieldBlock = {
  kind: 'field';
  id: string;
  type: FieldType;
  label: string;
  description: string; // подсказка врачу (и AI во 2-й фазе)
  options?: string[];
  unit?: string;
  defaultValue?: string | number | boolean | string[];
  required?: boolean;
};

export type GroupBlock = {
  kind: 'group';
  id: string;
  title: string;
  blocks: FieldBlock[];
};

export type ServicesBlock = {
  kind: 'services';
  id: string;
  label: string;
  category: 'lab' | 'instrumental' | 'consultation';
};

export type StaticTextBlock = {
  kind: 'static';
  id: string;
  text: string; // может содержать {patient.full_name} и т.п.
};

export type ImageBlock = {
  kind: 'image';
  id: string;
  src: string; // у моках — data URL, потім Supabase Storage
  alt: string; // опис для друку / доступності
  width: 'auto' | 'third' | 'half' | 'full';
  align: 'left' | 'center' | 'right';
};

export type TemplateVariable =
  | 'patient.full_name'
  | 'patient.age'
  | 'patient.birth_date'
  | 'patient.crm_client_id'
  | 'document.date'
  | 'document.number'
  | 'doctor.full_name'
  | 'doctor.specialty';

// ============ Значения документа (documents.values) ============

// Услуга из справочника или «поза клінікою» (введённое название) — одно из двух.
export type ServiceSelection =
  | { serviceId: string; customName?: never; quantity: number }
  | { customName: string; serviceId?: never; quantity: number };

export type FieldValue = string | number | boolean | string[] | ServiceSelection[];

export type DocumentValues = Record<string, FieldValue>; // ключ = block.id
