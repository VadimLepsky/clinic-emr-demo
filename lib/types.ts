// Entity types mirror the database tables (snake_case), so nothing needs mapping once Supabase is connected.
// JSON inside a template and a document is camelCase.

// ============ Entities ============

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
  price: number; // current price (in the database — from service_prices)
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
  header_id: string | null; // header from the letterhead library (Settings → Headers & footers); null — no header
  footer_id: string | null; // footer from the letterhead library; null — no footer
  footer_text: string | null; // this template's own footer text (device, disclaimer), may contain variables
  show_signature: boolean; // a «Doctor: Name ____ (signature)» line at the end
  banner_image_url: string | null; // banner to the right of the title (promo, QR); a data URL in the mocks
  footer_image_url: string | null; // logo at the right of the footer (device, partner); a data URL in the mocks
  package_ids: string[]; // service bundles shown as buttons while filling in; empty — no bundle row
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
  url: string; // a placeholder in the mocks
  created_at: string;
};

export type PrescriptionStatus = 'active' | 'completed' | 'cancelled';

export type Prescription = {
  id: string;
  patient_id: string;
  doctor_id: string;
  source_document_id: string | null;
  title: string;
  valid_until: string | null; // internal completion term (+30 days), not shown to users
  external_recommendations: string | null; // legacy: old care plans; new ones keep External services as items
  status: PrescriptionStatus;
  locked_at: string | null; // not null = a payment was made, editing is closed
  created_at: string;
  deleted_at: string | null; // soft delete: hidden from lists, the financial history is kept
  deleted_by: string | null;
};

// An item is either a service from the catalogue (service_id) or an External one (custom_name: a name only,
// no code or price; it counts in neither the totals nor the completion %, and has no fulfilment).
export type PrescriptionItem = {
  id: string;
  prescription_id: string;
  service_id: string | null;
  custom_name: string | null;
  section: ServiceCategory;
  quantity: number;
  unit_price: number; // price at creation time; 0 for an External service
  discount_pct: number;
};

export type PrescriptionFulfillment = {
  id: string;
  prescription_item_id: string;
  quantity: number;
  amount_paid: number;
  fulfilled_at: string;
};

// Computed view for the care plan tables
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

// Care plan letterhead — separate from the library: the care plan header and footer, images across the sheet
// (a /letterheads/… path or a data URL); null — no header / no footer.
export type ClinicSettings = {
  prescription_header_image_url: string | null;
  prescription_footer_image_url: string | null;
};

export type LetterheadKind = 'header' | 'footer';

// Library letterhead (for templates): the header or footer of an A4 sheet — an image across the content width.
// is_default — the header of new templates and of documents without a template; one among the headers.
export type Letterhead = {
  id: string;
  kind: LetterheadKind;
  name: string;
  image_url: string; // /letterheads/… (preloaded) or a data URL (new ones); Supabase Storage later
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

// ============ Template (template_versions.schema) ============

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
  description: string; // hint for the doctor (and for AI in phase 2)
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
  text: string; // may contain {patient.full_name} etc.
};

export type ImageBlock = {
  kind: 'image';
  id: string;
  src: string; // a data URL in the mocks, Supabase Storage later
  alt: string; // description for print / accessibility
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

// ============ Document values (documents.values) ============

// A catalogue service or an External one (a typed-in name) — one of the two.
export type ServiceSelection =
  | { serviceId: string; customName?: never; quantity: number }
  | { customName: string; serviceId?: never; quantity: number };

export type FieldValue = string | number | boolean | string[] | ServiceSelection[];

export type DocumentValues = Record<string, FieldValue>; // key = block.id
