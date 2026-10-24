// Единственная точка доступа к данным. Сейчас — моки, потом — Supabase.
// Компоненты импортируют только отсюда и никогда напрямую из mock-data.
import * as db from './mock-data';
import type {
  Staff, Patient, Service, ServiceCategory, ServicePackage, Folder, Template, TemplateVersion,
  MedDocument, FileRecord, PrescriptionSummary, PrescriptionItem, CrmVisit, ClinicSettings,
  AuditEntry, DocumentValues, ServiceSelection, ServicesBlock, StaffRole, TemplateKind, TemplateSchema,
  Letterhead, LetterheadKind,
} from './types';

const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms));
const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;

// ============ Журнал змін ============

type AuditInput = Pick<AuditEntry, 'action' | 'entity_type' | 'entity_id' | 'patient_id' | 'description'> & {
  actor_type?: 'staff' | 'system';
};

// ============ Демо: «Увійти як…» (лише при NEXT_PUBLIC_DEMO=1) ============
// Обраний співробітник живе в cookie, тож серверні компоненти (cookies()) і клієнт (document.cookie)
// бачать одного й того самого користувача. Без прапорця — завжди db.currentUserId.

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO === '1';
export const DEMO_USER_COOKIE = 'emr-demo-user';

function demoIdFromCookieString(cookies: string): string | undefined {
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${DEMO_USER_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function validUserId(id: string | undefined): string {
  return id && db.staff.some((s) => s.id === id && s.is_active) ? id : db.currentUserId;
}

/** Client-side (and synchronous): the demo cookie from document.cookie. */
function currentUserIdSync(): string {
  if (!DEMO_MODE || typeof document === 'undefined') return db.currentUserId;
  return validUserId(demoIdFromCookieString(document.cookie));
}

async function currentUserId(): Promise<string> {
  if (!DEMO_MODE) return db.currentUserId;
  if (typeof window !== 'undefined') return currentUserIdSync();
  const { cookies } = await import('next/headers');
  return validUserId((await cookies()).get(DEMO_USER_COOKIE)?.value);
}

/** Demo only: act as another staff member. The caller refreshes server components and SWR data. */
export async function loginAsDemoUser(staffId: string): Promise<Staff> {
  if (!DEMO_MODE) throw new Error('Перемикання користувача доступне лише в демо-режимі');
  const member = db.staff.find((s) => s.id === staffId && s.is_active);
  if (!member) throw new Error('Співробітника не знайдено');
  document.cookie = `${DEMO_USER_COOKIE}=${encodeURIComponent(staffId)}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
  return { ...member };
}

// Дописує запис до журналу. Автор — поточний користувач, якщо не вказано actor_type: 'system'.
function addAudit({ actor_type = 'staff', ...entry }: AuditInput) {
  db.auditLog.push({
    id: db.auditLog.reduce((max, a) => Math.max(max, a.id), 0) + 1,
    at: new Date().toISOString(),
    actor_type,
    actor_id: actor_type === 'staff' ? currentUserIdSync() : null,
    ...entry,
  });
}

function auditTitleOf(entityType: string, entityId: string): string | null {
  if (entityType === 'document') return db.documents.find((d) => d.id === entityId)?.title ?? null;
  if (entityType === 'prescription') return db.prescriptions.find((p) => p.id === entityId)?.title ?? null;
  return null;
}

function auditEntityLabel(entityType: string) {
  return entityType === 'prescription' ? 'призначення' : 'документ';
}

export async function logPrint(entityType: string, entityId: string, patientId: string | null): Promise<void> {
  const title = auditTitleOf(entityType, entityId);
  addAudit({
    action: 'print', entity_type: entityType, entity_id: entityId, patient_id: patientId,
    description: `Надруковано ${auditEntityLabel(entityType)}${title ? ` «${title}»` : ''}`,
  });
}

// ============ Утилиты ============

export function calcAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now < new Date(now.getFullYear(), b.getMonth(), b.getDate())) age--;
  return age;
}

// ============ Сотрудники ============

export async function getCurrentUser(): Promise<Staff> {
  await delay();
  const id = await currentUserId();
  return db.staff.find((s) => s.id === id)!;
}

export async function listStaff(): Promise<Staff[]> {
  await delay();
  return db.staff.map((s) => ({ ...s }));
}

type StaffInput = Pick<Staff, 'full_name' | 'role' | 'specialty' | 'crm_master_id' | 'is_active'>;

function normalizeStaffInput(input: StaffInput, ownId?: string): StaffInput {
  const full_name = input.full_name.trim();
  if (!full_name) throw new Error('Вкажіть ПІБ');
  const crm = input.crm_master_id;
  if (crm !== null) {
    if (!Number.isInteger(crm) || crm <= 0) throw new Error('ID в CRM має бути додатним цілим числом');
    if (db.staff.some((s) => s.id !== ownId && s.crm_master_id === crm)) {
      throw new Error('Цей ID в CRM вже закріплений за іншим співробітником');
    }
  }
  return { full_name, role: input.role, specialty: input.specialty?.trim() || null, crm_master_id: crm, is_active: input.is_active };
}

export async function createStaff(input: StaffInput): Promise<Staff> {
  await delay();
  const member: Staff = { id: uid('st'), ...normalizeStaffInput(input), photo_url: null };
  db.staff.push(member);
  addAudit({
    action: 'create', entity_type: 'staff', entity_id: member.id, patient_id: null,
    description: `Додано співробітника «${member.full_name}»`,
  });
  return { ...member };
}

// Співробітників не видаляють, лише деактивують: історія має зберігати автора.
export async function updateStaff(id: string, input: StaffInput): Promise<Staff> {
  await delay();
  const member = db.staff.find((s) => s.id === id);
  if (!member) throw new Error('Співробітника не знайдено');
  const next = normalizeStaffInput(input, id);
  if (id === (await currentUserId()) && (!next.is_active || next.role !== 'manager')) {
    throw new Error('Не можна деактивувати себе або забрати у себе роль керівника');
  }
  Object.assign(member, next);
  addAudit({
    action: 'update', entity_type: 'staff', entity_id: member.id, patient_id: null,
    description: `Змінено дані співробітника «${member.full_name}»`,
  });
  return { ...member };
}

// Фото необов'язкове: null повертає іконку ролі. Значення — data URL.
export async function updateStaffPhoto(staffId: string, dataUrl: string | null): Promise<Staff> {
  await delay();
  const member = db.staff.find((s) => s.id === staffId);
  if (!member) throw new Error('Співробітника не знайдено');
  member.photo_url = dataUrl;
  addAudit({
    action: 'update', entity_type: 'staff', entity_id: member.id, patient_id: null,
    description: dataUrl ? `Оновлено фото співробітника «${member.full_name}»` : `Видалено фото співробітника «${member.full_name}»`,
  });
  return { ...member };
}

// Кількість висновків, створених співробітником сьогодні
export async function countTodayDocuments(staffId: string): Promise<number> {
  await delay();
  const today = new Date().toISOString().slice(0, 10);
  return db.documents.filter((d) => d.author_id === staffId && d.created_at.startsWith(today)).length;
}

// ============ Пациенты ============

export async function searchPatients(query: string): Promise<Patient[]> {
  await delay();
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return db.patients.filter(
    (p) => p.full_name.toLowerCase().includes(q) || String(p.crm_client_id).includes(q),
  );
}

export async function getPatient(id: string): Promise<Patient | null> {
  await delay();
  return db.patients.find((p) => p.id === id) ?? null;
}

// ============ Документы ============

export async function listFolders(): Promise<Folder[]> {
  await delay();
  return [...db.folders].sort((a, b) => a.sort_order - b.sort_order);
}

export type FolderUsage = { documents: number; templates: { id: string; name: string }[] };

// Скільки документів (по всіх пацієнтах) і які шаблони прив'язані до кожної папки.
export async function getFolderUsage(): Promise<Record<string, FolderUsage>> {
  await delay();
  const usage: Record<string, FolderUsage> = {};
  for (const f of db.folders) usage[f.id] = { documents: 0, templates: [] };
  for (const d of db.documents) if (usage[d.folder_id]) usage[d.folder_id].documents++;
  for (const t of db.templates) usage[t.folder_id]?.templates.push({ id: t.id, name: t.name });
  return usage;
}

function folderNameOrThrow(name: string, ownId?: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Вкажіть назву папки');
  if (db.folders.some((f) => f.id !== ownId && f.name.toLowerCase() === trimmed.toLowerCase())) {
    throw new Error('Папка з такою назвою вже існує');
  }
  return trimmed;
}

export async function createFolder(name: string): Promise<Folder> {
  await delay();
  const folder: Folder = {
    id: uid('f'),
    name: folderNameOrThrow(name),
    sort_order: Math.max(0, ...db.folders.map((f) => f.sort_order)) + 1,
  };
  db.folders.push(folder);
  addAudit({
    action: 'create', entity_type: 'folder', entity_id: folder.id, patient_id: null,
    description: `Створено папку «${folder.name}»`,
  });
  return { ...folder };
}

export async function updateFolder(id: string, input: { name: string }): Promise<Folder> {
  await delay();
  const folder = db.folders.find((f) => f.id === id);
  if (!folder) throw new Error('Папку не знайдено');
  const previousName = folder.name;
  folder.name = folderNameOrThrow(input.name, id);
  addAudit({
    action: 'update', entity_type: 'folder', entity_id: folder.id, patient_id: null,
    description: `Папк�� «${previousName}» перейменовано на «${folder.name}»`,
  });
  return { ...folder };
}

export async function reorderFolders(orderedIds: string[]): Promise<Folder[]> {
  await delay();
  const known = new Set(db.folders.map((f) => f.id));
  if (orderedIds.length !== known.size || !orderedIds.every((id) => known.has(id))) {
    throw new Error('Некоректний порядок папок');
  }
  orderedIds.forEach((id, index) => {
    db.folders.find((f) => f.id === id)!.sort_order = index + 1;
  });
  addAudit({
    action: 'update', entity_type: 'folder', entity_id: null, patient_id: null,
    description: 'Змінено порядок папок',
  });
  return [...db.folders].sort((a, b) => a.sort_order - b.sort_order).map((f) => ({ ...f }));
}

export async function deleteFolder(id: string): Promise<void> {
  await delay();
  const index = db.folders.findIndex((f) => f.id === id);
  if (index === -1) throw new Error('Папку не знайдено');
  if (db.documents.some((d) => d.folder_id === id)) throw new Error('У папці є документи');
  if (db.templates.some((t) => t.folder_id === id)) throw new Error('До папки прив\u2019язані шаблони');
  const [removed] = db.folders.splice(index, 1);
  addAudit({
    action: 'delete', entity_type: 'folder', entity_id: removed.id, patient_id: null,
    description: `Видалено папку «${removed.name}»`,
  });
}

export async function getFolderCounts(patientId: string): Promise<Record<string, number>> {
  await delay();
  const counts: Record<string, number> = {};
  for (const d of db.documents.filter((d) => d.patient_id === patientId)) {
    counts[d.folder_id] = (counts[d.folder_id] ?? 0) + 1;
  }
  return counts;
}

export async function listDocuments(patientId: string, folderId?: string): Promise<MedDocument[]> {
  await delay();
  return db.documents
    .filter((d) => d.patient_id === patientId && (!folderId || d.folder_id === folderId))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getDocument(id: string): Promise<MedDocument | null> {
  await delay();
  return db.documents.find((d) => d.id === id) ?? null;
}

export async function listDocumentFiles(documentId: string): Promise<FileRecord[]> {
  await delay();
  return db.files.filter((f) => f.document_id === documentId);
}

// Mock: the file stays in the browser as an object URL (valid until page reload) until Supabase Storage.
export async function uploadDocument(input: {
  patientId: string; folderId: string; title: string; documentDate: string;
  files: File[];
}): Promise<MedDocument> {
  await delay();
  const user = await getCurrentUser();
  const now = new Date().toISOString();
  const doc: MedDocument = {
    id: uid('d'), patient_id: input.patientId, kind: 'upload', template_version_id: null,
    folder_id: input.folderId, title: input.title, number: null, document_date: input.documentDate,
    values: null, author_id: user.id, created_at: now, updated_at: now,
  };
  db.documents.push(doc);
  for (const f of input.files) {
    db.files.push({
      id: uid('fl'), document_id: doc.id, patient_id: input.patientId, file_name: f.name,
      mime_type: f.type, size_bytes: f.size, url: URL.createObjectURL(f), created_at: now,
    });
  }
  addAudit({
    action: 'create', entity_type: 'document', entity_id: doc.id, patient_id: doc.patient_id,
    description: `Завантажено «${doc.title}», ${input.files.length} файл(ів)`,
  });
  return doc;
}

// ============ Шаблоны ============

// Хто створює документи за шаблонами кожного типу. Ресепшн і контакт-центр документів за шаблонами не створюють.
const TEMPLATE_KIND_CREATORS: Record<TemplateKind, readonly StaffRole[]> = {
  consultation: ['doctor', 'medical_staff', 'manager'],
  ultrasound: ['doctor', 'medical_staff', 'manager'],
  lab: ['doctor', 'medical_staff', 'manager'],
  certificate: ['doctor', 'manager'],
  other: ['doctor', 'medical_staff', 'manager'],
};

export function canCreateKind(role: StaffRole, kind: TemplateKind): boolean {
  return TEMPLATE_KIND_CREATORS[kind].includes(role);
}

// Папка за замовчуванням для нового шаблону цього типу (за назвою папки).
const DEFAULT_FOLDER_NAMES: Record<TemplateKind, string> = {
  consultation: 'Консультативні висновки',
  ultrasound: 'Ультразвукова діагностика',
  lab: 'Результати аналізів',
  certificate: 'Довідки',
  other: 'Інші файли',
};

export function defaultFolderForKind(folders: Folder[], kind: TemplateKind): Folder | undefined {
  return folders.find((f) => f.name === DEFAULT_FOLDER_NAMES[kind]);
}

export async function listTemplates(): Promise<Template[]> {
  await delay();
  return db.templates.filter((t) => t.is_active);
}

export async function getTemplateVersion(id: string): Promise<TemplateVersion | null> {
  await delay();
  return db.templateVersions.find((v) => v.id === id) ?? null;
}

function currentVersionOf(template: Template) {
  return db.templateVersions.find((v) => v.id === template.current_version_id)!;
}

// Для керівника: усі шаблони, включно з неактивними, з номером поточної версії.
export async function listAllTemplates(): Promise<(Template & { version: number })[]> {
  await delay();
  return db.templates
    .map((t) => ({ ...t, version: currentVersionOf(t).version }))
    .sort((a, b) => a.name.localeCompare(b.name, 'uk'));
}

export async function getTemplate(id: string): Promise<{ template: Template; version: TemplateVersion } | null> {
  await delay();
  const template = db.templates.find((t) => t.id === id);
  return template ? { template: { ...template }, version: currentVersionOf(template) } : null;
}

export async function getTemplateByVersion(versionId: string): Promise<Template | null> {
  await delay();
  const version = db.templateVersions.find((v) => v.id === versionId);
  return (version && db.templates.find((t) => t.id === version.template_id)) || null;
}

// Кожне збереження створює нову версію; вже створені документи посилаються на свою версію і не змінюються.
export async function saveTemplate(input: {
  templateId?: string; name: string; kind: TemplateKind; specialty: string | null; folder_id: string;
  header_id: string | null; footer_id: string | null; footer_text: string | null; show_signature: boolean;
  schema: TemplateSchema; banner_image_url: string | null; footer_image_url: string | null; package_ids: string[];
}): Promise<Template> {
  await delay();
  const name = input.name.trim();
  if (!name) throw new Error('Вкажіть назву шаблону');
  if (!db.folders.some((f) => f.id === input.folder_id)) throw new Error('Папку не знайдено');
  if (input.header_id && !db.letterheads.some((l) => l.id === input.header_id && l.kind === 'header')) {
    throw new Error('Шапку не знайдено');
  }
  if (input.footer_id && !db.letterheads.some((l) => l.id === input.footer_id && l.kind === 'footer')) {
    throw new Error('Підвал не знайдено');
  }

  let template = input.templateId ? db.templates.find((t) => t.id === input.templateId) : undefined;
  if (input.templateId && !template) throw new Error('Шаблон не знайдено');
  const templateId = template?.id ?? uid('tpl');
  const lastVersion = db.templateVersions
    .filter((v) => v.template_id === templateId)
    .reduce((max, v) => Math.max(max, v.version), 0);
  const version: TemplateVersion = {
    id: uid('tv'), template_id: templateId, version: lastVersion + 1,
    schema: structuredClone(input.schema), created_at: new Date().toISOString(),
  };
  db.templateVersions.push(version);

  const fields = {
    name, kind: input.kind, specialty: input.specialty?.trim() || null, folder_id: input.folder_id,
    header_id: input.header_id, footer_id: input.footer_id, footer_text: input.footer_text?.trim() || null,
    show_signature: input.show_signature, current_version_id: version.id,
    banner_image_url: input.banner_image_url, footer_image_url: input.footer_image_url,
    package_ids: input.package_ids.filter((id) => db.servicePackages.some((p) => p.id === id)),
  };
  if (template) {
    Object.assign(template, fields);
  } else {
    template = { id: templateId, is_active: true, ...fields };
    db.templates.push(template);
  }
  addAudit({
    action: lastVersion === 0 ? 'create' : 'update', entity_type: 'template_version', entity_id: version.id,
    patient_id: null, description: `Збережено версію ${version.version} шаблону «${name}»`,
  });
  return { ...template };
}

export type TemplateVersionInfo = {
  version: TemplateVersion;
  is_current: boolean;
  saved_by: string | null; // null — немає запису в журналі (версія створена до ведення журналу)
};

// Версії шаблону від новішої до старішої; хто зберіг — за записами журналу.
export async function listTemplateVersions(templateId: string): Promise<TemplateVersionInfo[]> {
  await delay();
  const template = db.templates.find((t) => t.id === templateId);
  if (!template) return [];
  return db.templateVersions
    .filter((v) => v.template_id === templateId)
    .sort((a, b) => b.version - a.version)
    .map((v) => {
      const entry = db.auditLog.find((a) => a.entity_type === 'template_version' && a.entity_id === v.id);
      const saved_by = !entry
        ? null
        : entry.actor_type === 'staff'
          ? (db.staff.find((s) => s.id === entry.actor_id)?.full_name ?? null)
          : 'Система';
      return { version: structuredClone(v), is_current: v.id === template.current_version_id, saved_by };
    });
}

export async function setTemplateActive(id: string, active: boolean): Promise<Template> {
  await delay();
  const template = db.templates.find((t) => t.id === id);
  if (!template) throw new Error('Шаблон не знайдено');
  template.is_active = active;
  addAudit({
    action: 'update', entity_type: 'template', entity_id: template.id, patient_id: null,
    description: `Шаблон «${template.name}» ${active ? 'активовано' : 'деактивовано'}`,
  });
  return { ...template };
}

// Копія стартує неактивною, щоб лікарі не бачил�� її до редагування.
export async function duplicateTemplate(id: string): Promise<Template> {
  await delay();
  const source = db.templates.find((t) => t.id === id);
  if (!source) throw new Error('Шаблон не знайдено');
  const templateId = uid('tpl');
  const version: TemplateVersion = {
    id: uid('tv'), template_id: templateId, version: 1,
    schema: structuredClone(currentVersionOf(source).schema), created_at: new Date().toISOString(),
  };
  db.templateVersions.push(version);
  const template: Template = {
    ...source, id: templateId, name: `${source.name} (копія)`, current_version_id: version.id, is_active: false,
    package_ids: [...source.package_ids],
  };
  db.templates.push(template);
  addAudit({
    action: 'create', entity_type: 'template_version', entity_id: version.id, patient_id: null,
    description: `Збережено версію 1 шаблону «${template.name}» (копія «${source.name}»)`,
  });
  return { ...template };
}

// Приклад пацієнта і лікаря для попереднього перегляду шаблону.
export async function getTemplatePreviewContext(specialty: string | null): Promise<{ patient: Patient; doctor: Staff }> {
  await delay();
  const doctors = db.staff.filter((s) => s.is_active && s.specialty);
  const doctor = doctors.find((s) => specialty && s.specialty?.toLowerCase() === specialty.trim().toLowerCase())
    ?? doctors[0] ?? db.staff[0];
  return { patient: db.patients[0], doctor };
}

// ============ Услуги ============

export async function searchServices(query: string, category?: ServiceCategory): Promise<Service[]> {
  await delay(80);
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return db.services
    .filter((s) => s.is_active && (!category || s.category === category))
    .filter((s) => s.name.toLowerCase().includes(q) || (s.code ?? '').toLowerCase().includes(q))
    .slice(0, 20);
}

export async function getServicesByIds(ids: string[]): Promise<Service[]> {
  await delay(50);
  return db.services.filter((s) => ids.includes(s.id));
}

function clonePackage(p: ServicePackage): ServicePackage {
  return { ...p, items: p.items.map((i) => ({ ...i })) };
}

export async function listServicePackages(): Promise<ServicePackage[]> {
  await delay();
  return db.servicePackages.map(clonePackage);
}

export async function saveServicePackage(input: {
  id?: string; name: string; items: { service_id: string; quantity: number }[];
}): Promise<ServicePackage> {
  await delay();
  const name = input.name.trim();
  if (!name) throw new Error('Вкажіть назву пакета');
  if (!input.items.length) throw new Error('Додайте хоча б одну послугу');
  for (const item of input.items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) throw new Error('Кількість має бути цілим числом від 1');
    if (!db.services.some((s) => s.id === item.service_id)) throw new Error('Послугу не знайдено');
  }
  if (db.servicePackages.some((p) => p.id !== input.id && p.name.toLowerCase() === name.toLowerCase())) {
    throw new Error('Пакет з такою назвою вже існує');
  }
  const items = input.items.map((i) => ({ service_id: i.service_id, quantity: i.quantity }));
  const existing = input.id ? db.servicePackages.find((p) => p.id === input.id) : undefined;
  if (input.id && !existing) throw new Error('Пакет не знайдено');
  if (existing) {
    existing.name = name;
    existing.items = items;
    addAudit({
      action: 'update', entity_type: 'service_package', entity_id: existing.id, patient_id: null,
      description: `Оновлено пакет послуг «${name}»`,
    });
    return clonePackage(existing);
  }
  const created: ServicePackage = { id: uid('pk'), name, items };
  db.servicePackages.push(created);
  addAudit({
    action: 'create', entity_type: 'service_package', entity_id: created.id, patient_id: null,
    description: `Створено пакет послуг «${name}»`,
  });
  return clonePackage(created);
}

export async function deleteServicePackage(id: string): Promise<void> {
  await delay();
  const index = db.servicePackages.findIndex((p) => p.id === id);
  if (index === -1) throw new Error('Пакет не знайдено');
  const [removed] = db.servicePackages.splice(index, 1);
  // Шаблони, де пакет був обраний, просто перестають його показувати.
  for (const template of db.templates) template.package_ids = template.package_ids.filter((p) => p !== removed.id);
  addAudit({
    action: 'delete', entity_type: 'service_package', entity_id: removed.id, patient_id: null,
    description: `Видалено пакет послуг «${removed.name}»`,
  });
}

// ============ Довідник послуг (налаштування) ============

export type ServiceFilters = {
  query?: string;
  category?: ServiceCategory;
  source?: string; // 'crm' або назва лабораторії
  sortBy?: 'name' | 'price';
  sortDir?: 'asc' | 'desc';
};

export type PriceImportRow = { code: string | null; name: string; price: number };

export type PriceImportDiff = {
  added: PriceImportRow[];
  changed: { service: Service; old_price: number; new_price: number }[];
  missing: Service[]; // активні послуги лабораторії, яких немає у файлі
  unchanged: number;
};

export async function listAllServices(filters: ServiceFilters = {}): Promise<Service[]> {
  await delay();
  const q = filters.query?.trim().toLowerCase() ?? '';
  const dir = filters.sortDir === 'desc' ? -1 : 1;
  return db.services
    .filter((s) => !filters.category || s.category === filters.category)
    .filter((s) => !filters.source || (filters.source === 'crm' ? s.source === 'crm' : s.lab_name === filters.source))
    .filter((s) => !q || s.name.toLowerCase().includes(q) || (s.code ?? '').toLowerCase().includes(q))
    .map((s) => ({ ...s }))
    .sort((a, b) => (filters.sortBy === 'price' ? (a.price - b.price) * dir : a.name.localeCompare(b.name, 'uk') * dir));
}

// Джерела для фільтра: «crm» + назви лабораторій, що вже є у довіднику.
export async function listServiceLabNames(): Promise<string[]> {
  await delay(50);
  const names = new Set<string>();
  for (const s of db.services) if (s.lab_name) names.add(s.lab_name);
  return [...names].sort((a, b) => a.localeCompare(b, 'uk'));
}

export async function updateService(
  id: string,
  patch: { category?: ServiceCategory; is_active?: boolean },
): Promise<Service> {
  await delay(80);
  const service = db.services.find((s) => s.id === id);
  if (!service) throw new Error('Послугу не знайдено');
  if (patch.category !== undefined) service.category = patch.category;
  if (patch.is_active !== undefined) service.is_active = patch.is_active;
  addAudit({
    action: 'update', entity_type: 'service', entity_id: service.id, patient_id: null,
    description: `Оновлено послугу «${service.name}»`,
  });
  return { ...service };
}

function importKey(row: { code: string | null; name: string }) {
  const code = row.code?.trim().toLowerCase();
  return code ? `c:${code}` : `n:${row.name.trim().toLowerCase()}`;
}

function normalizeImportRows(rows: PriceImportRow[]): PriceImportRow[] {
  const byKey = new Map<string, PriceImportRow>();
  for (const row of rows) {
    const name = row.name.trim();
    if (!name || !Number.isFinite(row.price) || row.price < 0) continue;
    const normalized = { code: row.code?.trim() || null, name, price: Math.round(row.price * 100) / 100 };
    byKey.set(importKey(normalized), normalized); // дублікати у файлі: перемагає останній рядок
  }
  return [...byKey.values()];
}

function labServices(labName: string) {
  const lab = labName.trim().toLowerCase();
  return db.services.filter((s) => s.source === 'lab' && s.lab_name?.toLowerCase() === lab);
}

export async function previewPriceImport(labName: string, rows: PriceImportRow[]): Promise<PriceImportDiff> {
  await delay();
  if (!labName.trim()) throw new Error('Вкажіть лабораторію');
  const existing = labServices(labName);
  const byKey = new Map(existing.map((s) => [importKey(s), s]));
  const diff: PriceImportDiff = { added: [], changed: [], missing: [], unchanged: 0 };
  const seen = new Set<string>();
  for (const row of normalizeImportRows(rows)) {
    const key = importKey(row);
    const service = byKey.get(key);
    seen.add(key);
    if (!service) diff.added.push(row);
    else if (service.price !== row.price) diff.changed.push({ service: { ...service }, old_price: service.price, new_price: row.price });
    else diff.unchanged++;
  }
  diff.missing = existing.filter((s) => s.is_active && !seen.has(importKey(s))).map((s) => ({ ...s }));
  return diff;
}

// Ціни у вже створених призначеннях не змінюються: рядки призначення зберігають unit_price на момент створення.
export async function applyPriceImport(
  labName: string,
  rows: PriceImportRow[],
  options: { defaultCategory: ServiceCategory; deactivateIds: string[] },
): Promise<{ added: number; updated: number; deactivated: number }> {
  await delay();
  const lab = labName.trim();
  if (!lab) throw new Error('Вкажіть лабораторію');
  const existing = labServices(lab);
  const byKey = new Map(existing.map((s) => [importKey(s), s]));
  const labDisplayName = existing[0]?.lab_name ?? lab;
  let added = 0;
  let updated = 0;
  for (const row of normalizeImportRows(rows)) {
    const service = byKey.get(importKey(row));
    if (service) {
      if (service.price !== row.price) {
        service.price = row.price;
        updated++;
      }
      continue;
    }
    db.services.push({
      id: uid('sv'), source: 'lab', lab_name: labDisplayName, code: row.code, name: row.name,
      category: options.defaultCategory, price: row.price, is_active: true,
    });
    added++;
  }
  let deactivated = 0;
  for (const service of existing) {
    if (options.deactivateIds.includes(service.id) && service.is_active) {
      service.is_active = false;
      deactivated++;
    }
  }
  addAudit({
    action: 'update', entity_type: 'service', entity_id: null, patient_id: null,
    description: `Імпорт прайсу «${labDisplayName}»: додано ${added}, оновлено ${updated}, вимкнено ${deactivated}`,
  });
  return { added, updated, deactivated };
}

// ============ Сохранение документа по шаблону → призначення ============

// Окрема нумерація для кожного типу документа.
const DOCUMENT_NUMBER_PREFIXES: Record<TemplateKind, string> = {
  consultation: 'КВ-',
  ultrasound: 'УЗД-',
  lab: 'АН-',
  certificate: 'ДВ-',
  other: 'ДОК-',
};

// Наскрізна в межах типу: наступний після найбільшого наявного номера з тим самим префіксом.
function nextDocumentNumber(kind: TemplateKind): string {
  const prefix = DOCUMENT_NUMBER_PREFIXES[kind];
  const last = db.documents.reduce((max, d) => {
    const match = d.number?.startsWith(prefix) ? /^\D*(\d+)$/.exec(d.number) : null;
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `${prefix}${String(last + 1).padStart(6, '0')}`;
}

// Будь-який тип шаблону. Призначення формується з блоків «Рекомендовані послуги», якщо вони є в шаблоні: послуги
// з довідника й «поза клінікою» (без ціни). rec_external — лише у старих версіях шаблонів (сумісність).
// Створювати й редагувати документ може той, хто може створювати документи цього типу (canCreateKind).
export async function saveDocument(input: {
  documentId?: string; patientId: string; templateVersionId: string; title: string; values: DocumentValues;
}): Promise<{ document: MedDocument; prescriptionId: string | null; prescriptionLocked: boolean }> {
  await delay();
  const user = await getCurrentUser();
  const now = new Date().toISOString();
  const version = db.templateVersions.find((v) => v.id === input.templateVersionId)!;
  const template = db.templates.find((t) => t.id === version.template_id)!;

  const serviceBlocks = version.schema.sections
    .flatMap((s) => s.blocks)
    .filter((b): b is ServicesBlock => b.kind === 'services');

  if (!canCreateKind(user.role, template.kind)) throw new Error('Немає прав на документи цього типу');

  let doc = input.documentId ? db.documents.find((d) => d.id === input.documentId) : undefined;
  if (doc) {
    // A paid prescription fixes the money part: the services fields keep their saved values, the rest is updated.
    const paid = db.prescriptions.some((p) => p.source_document_id === doc!.id && !p.deleted_at && p.locked_at);
    const values = { ...input.values };
    if (paid) {
      for (const block of serviceBlocks) {
        if (doc.values && block.id in doc.values) values[block.id] = doc.values[block.id];
        else delete values[block.id];
      }
    }
    doc.values = values;
    doc.updated_at = now;
    addAudit({
      action: 'update', entity_type: 'document', entity_id: doc.id, patient_id: doc.patient_id,
      description: `Оновлено документ «${doc.title}»`,
    });
  } else {
    if (!template.is_active) throw new Error('Шаблон вимкнено');
    doc = {
      id: uid('d'), patient_id: input.patientId, kind: 'template', template_version_id: version.id,
      folder_id: template.folder_id, title: input.title, number: nextDocumentNumber(template.kind),
      document_date: now.slice(0, 10), values: input.values, author_id: user.id,
      created_at: now, updated_at: now,
    };
    db.documents.push(doc);
    addAudit({
      action: 'create', entity_type: 'document', entity_id: doc.id, patient_id: doc.patient_id,
      description: `Створено документ «${doc.title}»`,
    });
  }

  // Собираем услуги из всех блоков kind = 'services' (из сохранённых значений документа)
  const savedValues = doc.values ?? {};
  const selected = serviceBlocks.flatMap((b) =>
    ((savedValues[b.id] as ServiceSelection[] | undefined) ?? []).map((sel) => ({ ...sel, section: b.category })),
  );
  const external = (savedValues['rec_external'] as string | undefined)?.trim() || null;

  let rx = db.prescriptions.find((p) => p.source_document_id === doc!.id && !p.deleted_at);
  if (rx?.locked_at) return { document: doc, prescriptionId: rx.id, prescriptionLocked: true };
  if (!selected.length && !external) return { document: doc, prescriptionId: rx?.id ?? null, prescriptionLocked: false };

  const rxExisted = Boolean(rx);
  if (!rx) {
    rx = {
      id: uid('rx'), patient_id: input.patientId, doctor_id: user.id, source_document_id: doc.id,
      title: `Призначення з візиту від ${doc.document_date.split('-').reverse().join('.')}`,
      valid_until: defaultValidUntil(now), external_recommendations: external, status: 'active', locked_at: null, created_at: now,
      deleted_at: null, deleted_by: null,
    };
    db.prescriptions.push(rx);
  } else {
    rx.external_recommendations = external;
    for (let i = db.prescriptionItems.length - 1; i >= 0; i--) {
      if (db.prescriptionItems[i].prescription_id === rx.id) db.prescriptionItems.splice(i, 1);
    }
  }
  for (const sel of selected) {
    if (sel.customName !== undefined) {
      db.prescriptionItems.push({
        id: uid('ri'), prescription_id: rx.id, service_id: null, custom_name: sel.customName, section: sel.section,
        quantity: sel.quantity, unit_price: 0, discount_pct: 0,
      });
      continue;
    }
    const svc = db.services.find((s) => s.id === sel.serviceId)!;
    db.prescriptionItems.push({
      id: uid('ri'), prescription_id: rx.id, service_id: svc.id, custom_name: null, section: sel.section,
      quantity: sel.quantity, unit_price: svc.price, discount_pct: 0,
    });
  }
  addAudit({
    action: rxExisted ? 'update' : 'create', entity_type: 'prescription', entity_id: rx.id,
    patient_id: rx.patient_id, actor_type: 'system',
    description: rxExisted
      ? 'Оновлено призначення'
      : `Сформовано призначення з ${template.kind === 'consultation' ? 'висновку' : 'документа'}`,
  });
  return { document: doc, prescriptionId: rx.id, prescriptionLocked: false };
}

// ============ Призначення ============

function summarize(rxId: string): PrescriptionSummary {
  const rx = db.prescriptions.find((p) => p.id === rxId)!;
  // Услуги поза клінікою не входят ни в суммы, ни в % выполнения.
  const items = db.prescriptionItems.filter((i) => i.prescription_id === rx.id && i.service_id !== null);
  const ff = db.prescriptionFulfillments.filter((f) => items.some((i) => i.id === f.prescription_item_id));
  const total = items.reduce((s, i) => s + i.quantity * i.unit_price * (1 - i.discount_pct / 100), 0);
  const used = ff.reduce((s, f) => {
    const item = items.find((i) => i.id === f.prescription_item_id)!;
    return s + f.quantity * item.unit_price;
  }, 0);
  const paid = ff.reduce((s, f) => s + f.amount_paid, 0);
  const qty = items.reduce((s, i) => s + i.quantity, 0);
  const doneQty = ff.reduce((s, f) => s + f.quantity, 0);
  return {
    ...rx,
    doctor_name: db.staff.find((s) => s.id === rx.doctor_id)?.full_name ?? '',
    patient_name: db.patients.find((p) => p.id === rx.patient_id)?.full_name ?? '',
    total_amount: total,
    used_amount: used,
    paid_amount: paid,
    completion_pct: qty ? Math.round((doneQty / qty) * 100) : 0,
  };
}

export async function listPrescriptions(patientId: string): Promise<PrescriptionSummary[]> {
  await delay();
  return db.prescriptions
    .filter((p) => p.patient_id === patientId && !p.deleted_at)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((p) => summarize(p.id));
}

export async function getPrescriptionByDocument(documentId: string): Promise<PrescriptionSummary | null> {
  await delay();
  const rx = db.prescriptions.find((p) => p.source_document_id === documentId && !p.deleted_at);
  return rx ? summarize(rx.id) : null;
}

export async function listTodayPrescriptions(): Promise<PrescriptionSummary[]> {
  await delay();
  const today = new Date().toISOString().slice(0, 10);
  return db.prescriptions
    .filter((p) => p.created_at.startsWith(today) && !p.deleted_at)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((p) => summarize(p.id));
}

export type PrescriptionDisplayStatus = 'active' | 'completed' | 'locked';

export function getPrescriptionDisplayStatus(summary: PrescriptionSummary): PrescriptionDisplayStatus {
  if (summary.locked_at) return 'locked';
  if (summary.completion_pct >= 100) return 'completed';
  return 'active';
}

export type PrescriptionFilters = {
  from?: string; // ISO date, включно
  to?: string; // ISO date, включно
  doctorId?: string;
  status?: PrescriptionDisplayStatus;
};

export type PrescriptionDoctorStats = {
  doctor_id: string;
  doctor_name: string;
  count: number;
  total_amount: number;
  paid_amount: number;
  completion_pct: number; // середнє по призначеннях лікаря
};

export type PrescriptionStats = {
  count: number;
  total_amount: number;
  paid_amount: number;
  completion_pct: number; // середнє по всіх призначеннях
  by_doctor: PrescriptionDoctorStats[];
};

function averagePct(rows: PrescriptionSummary[]) {
  return rows.length ? Math.round(rows.reduce((s, r) => s + r.completion_pct, 0) / rows.length) : 0;
}

export async function listAllPrescriptions(filters: PrescriptionFilters = {}): Promise<PrescriptionSummary[]> {
  await delay();
  return db.prescriptions
    .filter((p) => {
      if (p.deleted_at) return false;
      const date = p.created_at.slice(0, 10);
      if (filters.from && date < filters.from) return false;
      if (filters.to && date > filters.to) return false;
      if (filters.doctorId && p.doctor_id !== filters.doctorId) return false;
      return true;
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((p) => summarize(p.id))
    .filter((s) => !filters.status || getPrescriptionDisplayStatus(s) === filters.status);
}

export async function getPrescriptionStats(range: { from: string; to: string }): Promise<PrescriptionStats> {
  const rows = await listAllPrescriptions(range);
  const byDoctor = new Map<string, PrescriptionSummary[]>();
  for (const row of rows) byDoctor.set(row.doctor_id, [...(byDoctor.get(row.doctor_id) ?? []), row]);

  const by_doctor = [...byDoctor.entries()]
    .map(([doctor_id, list]) => ({
      doctor_id,
      doctor_name: list[0].doctor_name,
      count: list.length,
      total_amount: list.reduce((s, r) => s + r.total_amount, 0),
      paid_amount: list.reduce((s, r) => s + r.paid_amount, 0),
      completion_pct: averagePct(list),
    }))
    .sort((a, b) => b.total_amount - a.total_amount);

  return {
    count: rows.length,
    total_amount: rows.reduce((s, r) => s + r.total_amount, 0),
    paid_amount: rows.reduce((s, r) => s + r.paid_amount, 0),
    completion_pct: averagePct(rows),
    by_doctor,
  };
}

// Призначення, створені понад `days` днів тому, за якими нічого не виконано
export async function listStalePrescriptions(days: number): Promise<PrescriptionSummary[]> {
  await delay();
  const threshold = Date.now() - days * 24 * 60 * 60 * 1000;
  return db.prescriptions
    .filter((p) => !p.deleted_at && p.status !== 'cancelled' && new Date(p.created_at).getTime() < threshold)
    .map((p) => summarize(p.id))
    .filter((s) => s.completion_pct === 0)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

// service — null у послуги поза клінікою (є лише custom_name).
export async function getPrescription(id: string): Promise<{
  summary: PrescriptionSummary; items: (PrescriptionItem & { service: Service | null; fulfilled_qty: number })[];
} | null> {
  await delay();
  if (!db.prescriptions.some((p) => p.id === id && !p.deleted_at)) return null;
  const items = db.prescriptionItems
    .filter((i) => i.prescription_id === id)
    .map((i) => ({
      ...i,
      service: (i.service_id && db.services.find((s) => s.id === i.service_id)) || null,
      fulfilled_qty: db.prescriptionFulfillments
        .filter((f) => f.prescription_item_id === i.id)
        .reduce((s, f) => s + f.quantity, 0),
    }));
  return { summary: summarize(id), items };
}

export const PRESCRIPTION_LOCKED_MESSAGE = 'Призначення вже оплачене. Для змін створіть нове призначення';

// Строк дії нового призначення. ? 30 днів — пропозиція, підтвердити у клієнта (docs/CONTEXT.md → «Ще відкрито»).
export const PRESCRIPTION_VALID_DAYS = 30;

/** valid_until for a prescription created on `fromIso` (a date or a datetime): + PRESCRIPTION_VALID_DAYS. */
export function defaultValidUntil(fromIso: string): string {
  const date = new Date(`${fromIso.slice(0, 10)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + PRESCRIPTION_VALID_DAYS);
  return date.toISOString().slice(0, 10);
}

// Створювати й змінювати призначення можуть лікар, медперсонал і керівник; ресепшн і контакт-центр — лише
// знижку (updatePrescriptionDiscounts), перегляд і друк (docs/CONTEXT.md). Видаляти — лише керівник.
export const PRESCRIPTION_EDITOR_ROLES: readonly StaffRole[] = ['manager', 'doctor', 'medical_staff'];

export function canEditPrescriptions(role: StaffRole): boolean {
  return PRESCRIPTION_EDITOR_ROLES.includes(role);
}

// Знижку в призначенні задає будь-яка роль, зокрема ресепшн і контакт-центр (лише знижку: послуги й кількість —
// тільки PRESCRIPTION_EDITOR_ROLES). Оплачене призначення закрите для всіх правок.
export const PRESCRIPTION_DISCOUNT_ROLES: readonly StaffRole[] = [
  'manager', 'doctor', 'medical_staff', 'reception', 'contact_center',
];

export function canSetPrescriptionDiscount(role: StaffRole): boolean {
  return PRESCRIPTION_DISCOUNT_ROLES.includes(role);
}

/** Only the discounts of the clinic's services; quantities, services and the rest stay as they are. */
export async function updatePrescriptionDiscounts(
  id: string,
  items: { id: string; discount_pct: number }[],
): Promise<PrescriptionSummary> {
  await delay();
  const user = await getCurrentUser();
  if (!canSetPrescriptionDiscount(user.role)) throw new Error('Немає прав змінювати знижку');
  const rx = findActivePrescription(id);
  if (rx.locked_at) throw new Error(PRESCRIPTION_LOCKED_MESSAGE);
  for (const input of items) {
    const item = db.prescriptionItems.find((i) => i.id === input.id && i.prescription_id === rx.id);
    if (!item || item.service_id === null) throw new Error('Позицію не знайдено');
    if (!(input.discount_pct >= 0 && input.discount_pct <= 100)) throw new Error('Знижка має бути від 0 до 100%');
  }
  for (const input of items) {
    db.prescriptionItems.find((i) => i.id === input.id)!.discount_pct = input.discount_pct;
  }
  addAudit({
    action: 'update', entity_type: 'prescription', entity_id: rx.id, patient_id: rx.patient_id,
    description: `Змінено знижку в призначенні «${rx.title}»`,
  });
  return summarize(rx.id);
}

async function requirePrescriptionEditor(): Promise<Staff> {
  const user = await getCurrentUser();
  if (!canEditPrescriptions(user.role)) throw new Error('Ресепшн і контакт-центр можуть змінювати лише знижку');
  return user;
}

function formatIsoDate(iso: string) {
  return iso.slice(0, 10).split('-').reverse().join('.');
}

function findActivePrescription(id: string) {
  const rx = db.prescriptions.find((p) => p.id === id && !p.deleted_at);
  if (!rx) throw new Error('Призначення не знайдено');
  return rx;
}

function validateItems(items: { quantity: number; discount_pct: number }[]) {
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) throw new Error('Кількість має бути цілим числом від 1');
    if (!(item.discount_pct >= 0 && item.discount_pct <= 100)) throw new Error('Знижка має бути від 0 до 100%');
  }
}

// Рядок призначення: послуга з довідника (service_id) або поза клінікою (custom_name, без ціни й знижки).
type PrescriptionItemInput = {
  id?: string; service_id: string | null; custom_name?: string | null; quantity: number; discount_pct: number;
};

// Створює рядки призначення. Існуючі рядки (за id) зберігають ціну на момент створення та історію виконання.
function applyPrescriptionItems(rxId: string, items: PrescriptionItemInput[]) {
  validateItems(items);
  const existing = db.prescriptionItems.filter((i) => i.prescription_id === rxId);
  const keptIds = new Set(items.flatMap((i) => (i.id ? [i.id] : [])));

  for (const removed of existing.filter((i) => !keptIds.has(i.id))) {
    if (db.prescriptionFulfillments.some((f) => f.prescription_item_id === removed.id)) {
      throw new Error('Не можна видалити послугу, яку вже виконано');
    }
  }
  for (let i = db.prescriptionItems.length - 1; i >= 0; i--) {
    const row = db.prescriptionItems[i];
    if (row.prescription_id === rxId && !keptIds.has(row.id)) db.prescriptionItems.splice(i, 1);
  }

  for (const input of items) {
    const current = input.id ? existing.find((i) => i.id === input.id) : undefined;
    if (current) {
      current.quantity = input.quantity;
      current.discount_pct = current.service_id === null ? 0 : input.discount_pct;
      continue;
    }
    const customName = input.custom_name?.trim();
    if (input.service_id === null) {
      if (!customName) throw new Error('Вкажіть назву послуги поза клінікою');
      db.prescriptionItems.push({
        id: uid('ri'), prescription_id: rxId, service_id: null, custom_name: customName, section: 'other',
        quantity: input.quantity, unit_price: 0, discount_pct: 0,
      });
      continue;
    }
    const svc = db.services.find((s) => s.id === input.service_id);
    if (!svc) throw new Error('Послугу не знайдено');
    db.prescriptionItems.push({
      id: uid('ri'), prescription_id: rxId, service_id: svc.id, custom_name: null, section: svc.category,
      quantity: input.quantity, unit_price: svc.price, discount_pct: input.discount_pct,
    });
  }
}

// Нові призначення не мають вільного тексту «поза клінікою»: такі послуги — рядки з custom_name.
export async function createPrescription(input: {
  patientId: string;
  title?: string;
  valid_until?: string | null;
  items: PrescriptionItemInput[];
}): Promise<PrescriptionSummary> {
  await delay();
  if (!input.items.length) throw new Error('Додайте хоча б одну послугу');
  const user = await requirePrescriptionEditor();
  const now = new Date().toISOString();
  const rx = {
    id: uid('rx'), patient_id: input.patientId, doctor_id: user.id, source_document_id: null,
    title: input.title?.trim() || `Призначення з візиту від ${formatIsoDate(now)}`,
    // Not passed → the default term; an explicitly cleared date (null / '') means no term.
    valid_until: input.valid_until === undefined ? defaultValidUntil(now) : input.valid_until || null,
    external_recommendations: null,
    status: 'active' as const, locked_at: null, created_at: now, deleted_at: null, deleted_by: null,
  };
  applyPrescriptionItems(rx.id, input.items);
  db.prescriptions.push(rx);
  addAudit({
    action: 'create', entity_type: 'prescription', entity_id: rx.id, patient_id: rx.patient_id,
    description: `Створено призначення «${rx.title}»`,
  });
  return summarize(rx.id);
}

export async function updatePrescription(
  id: string,
  // external_recommendations of an old prescription is shown as is and not edited any more.
  input: { valid_until?: string | null; items: PrescriptionItemInput[] },
): Promise<PrescriptionSummary> {
  await delay();
  await requirePrescriptionEditor();
  const rx = findActivePrescription(id);
  if (rx.locked_at) throw new Error(PRESCRIPTION_LOCKED_MESSAGE);
  applyPrescriptionItems(rx.id, input.items);
  if (input.valid_until !== undefined) rx.valid_until = input.valid_until || null;
  addAudit({
    action: 'update', entity_type: 'prescription', entity_id: rx.id, patient_id: rx.patient_id,
    description: `Оновлено призначення «${rx.title}»`,
  });
  return summarize(rx.id);
}

export async function deletePrescription(id: string): Promise<void> {
  await delay();
  const user = await getCurrentUser();
  if (user.role !== 'manager') throw new Error('Видаляти призначення може лише керівник');
  const rx = findActivePrescription(id);
  rx.deleted_at = new Date().toISOString();
  rx.deleted_by = user.id;
  addAudit({
    action: 'delete', entity_type: 'prescription', entity_id: rx.id, patient_id: rx.patient_id,
    description: `Видалено призначення «${rx.title}»`,
  });
}

export async function duplicatePrescription(rxId: string): Promise<PrescriptionSummary> {
  await delay();
  const source = findActivePrescription(rxId);
  const user = await requirePrescriptionEditor();
  const now = new Date().toISOString();
  const rx = {
    id: uid('rx'), patient_id: source.patient_id, doctor_id: user.id, source_document_id: null,
    title: `Призначення з візиту від ${formatIsoDate(now)}`, valid_until: defaultValidUntil(now),
    external_recommendations: source.external_recommendations,
    status: 'active' as const, locked_at: null, created_at: now, deleted_at: null, deleted_by: null,
  };
  for (const item of db.prescriptionItems.filter((i) => i.prescription_id === source.id)) {
    const svc = item.service_id ? db.services.find((s) => s.id === item.service_id) : undefined;
    db.prescriptionItems.push({
      id: uid('ri'), prescription_id: rx.id, service_id: item.service_id, custom_name: item.custom_name,
      section: item.section, quantity: item.quantity, unit_price: svc?.price ?? item.unit_price,
      discount_pct: item.discount_pct,
    });
  }
  db.prescriptions.push(rx);
  addAudit({
    action: 'create', entity_type: 'prescription', entity_id: rx.id, patient_id: rx.patient_id,
    description: `Створено копію призначення «${source.title}»`,
  });
  return summarize(rx.id);
}

// ============ Робоче місце ============

export type TodayVisit = CrmVisit & {
  patient: Patient | null;
  has_document_today: boolean;
};

export async function listTodayVisits(staffId: string): Promise<TodayVisit[]> {
  await delay();
  const member = db.staff.find((s) => s.id === staffId);
  if (!member?.crm_master_id) return [];
  const today = new Date().toISOString().slice(0, 10);
  return db.crmVisits
    .filter((v) => v.crm_master_id === member.crm_master_id && v.visit_at.startsWith(today))
    .sort((a, b) => a.visit_at.localeCompare(b.visit_at))
    .map((v) => {
      const patient = db.patients.find((p) => p.crm_client_id === v.crm_client_id) ?? null;
      const has_document_today = !!patient && db.documents.some(
        (d) => d.patient_id === patient.id && d.author_id === staffId && d.created_at.startsWith(today),
      );
      return { ...v, patient, has_document_today };
    });
}

// ============ Настройки и история ============

export async function getClinicSettings(): Promise<ClinicSettings> {
  await delay();
  return { ...db.clinicSettings };
}

// Бланк призначення (Налаштування → Шапки і підвали → «Бланк призначення»): шапка й підвал призначень —
// окремі картинки, не з бібліотеки. null — прибрати.
export async function updatePrescriptionBlank(
  input: Partial<Pick<ClinicSettings, 'prescription_header_image_url' | 'prescription_footer_image_url'>>,
): Promise<ClinicSettings> {
  await delay();
  Object.assign(db.clinicSettings, input);
  addAudit({
    action: 'update', entity_type: 'clinic_settings', entity_id: null, patient_id: null,
    description: 'Оновлено бланк призначення',
  });
  return getClinicSettings();
}

// ============ Бланки: шапки і підвали (для шаблонів) ============
// Бібліотека в Налаштуваннях: лише картинки на всю ширину листа. Шаблон обирає шапку й підвал
// (header_id / footer_id, null — без); документ без шаблону — шапка за замовчуванням. Призначення — свій бланк.

export async function listLetterheads(): Promise<Letterhead[]> {
  await delay();
  return db.letterheads.map((l) => ({ ...l }));
}

/** Header and footer of a sheet: the template's choice, or (no template) the default header and no footer.
 *  A template header that no longer exists falls back to the default one. */
export function resolveLetterheads(
  letterheads: Letterhead[],
  choice?: { header_id: string | null; footer_id: string | null },
): { header: Letterhead | null; footer: Letterhead | null } {
  const defaultHeader = letterheads.find((l) => l.kind === 'header' && l.is_default) ?? null;
  if (!choice) return { header: defaultHeader, footer: null };
  const find = (id: string | null, kind: LetterheadKind) =>
    id ? (letterheads.find((l) => l.id === id && l.kind === kind) ?? null) : null;
  return {
    header: choice.header_id ? (find(choice.header_id, 'header') ?? defaultHeader) : null,
    footer: find(choice.footer_id, 'footer'),
  };
}

/** Templates using each letterhead (as header or footer), for the warning before deleting it. */
export async function getLetterheadUsage(): Promise<Record<string, { id: string; name: string }[]>> {
  await delay();
  const usage: Record<string, { id: string; name: string }[]> = {};
  for (const template of db.templates) {
    for (const id of [template.header_id, template.footer_id]) {
      if (id) (usage[id] ??= []).push({ id: template.id, name: template.name });
    }
  }
  return usage;
}

function findLetterhead(id: string) {
  const letterhead = db.letterheads.find((l) => l.id === id);
  if (!letterhead) throw new Error('Бланк не знайдено');
  return letterhead;
}

const letterheadLabel = (kind: LetterheadKind) => (kind === 'header' ? 'шапку' : 'підвал');

export async function createLetterhead(input: { kind: LetterheadKind; name: string; image_url: string }): Promise<Letterhead> {
  await delay();
  const name = input.name.trim();
  if (!name) throw new Error('Вкажіть назву');
  if (!input.image_url) throw new Error('Завантажте зображення');
  const letterhead: Letterhead = { id: uid('lh'), kind: input.kind, name, image_url: input.image_url, is_default: false };
  db.letterheads.push(letterhead);
  addAudit({
    action: 'create', entity_type: 'letterhead', entity_id: letterhead.id, patient_id: null,
    description: `Додано ${letterheadLabel(letterhead.kind)} «${name}»`,
  });
  return { ...letterhead };
}

/** Rename, or replace the image (the built-in text header has none). */
export async function updateLetterhead(id: string, input: { name?: string; image_url?: string }): Promise<Letterhead> {
  await delay();
  const letterhead = findLetterhead(id);
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new Error('Вкажіть назву');
    letterhead.name = name;
  }
  if (input.image_url !== undefined) {
    if (!input.image_url) throw new Error('Завантажте зображення');
    letterhead.image_url = input.image_url;
  }
  addAudit({
    action: 'update', entity_type: 'letterhead', entity_id: letterhead.id, patient_id: null,
    description: `Оновлено ${letterheadLabel(letterhead.kind)} «${letterhead.name}»`,
  });
  return { ...letterhead };
}

export async function setDefaultLetterhead(id: string): Promise<void> {
  await delay();
  const letterhead = findLetterhead(id);
  if (letterhead.kind !== 'header') throw new Error('За замовчуванням буває лише шапка');
  for (const l of db.letterheads) if (l.kind === 'header') l.is_default = l.id === id;
  addAudit({
    action: 'update', entity_type: 'letterhead', entity_id: letterhead.id, patient_id: null,
    description: `Шапка за замовчуванням: «${letterhead.name}»`,
  });
}

/** Templates that used it switch to the default header / to no footer. Deleting the default header makes the next
 *  header the default (none left — documents without a header). */
export async function deleteLetterhead(id: string): Promise<void> {
  await delay();
  const letterhead = findLetterhead(id);
  db.letterheads.splice(db.letterheads.indexOf(letterhead), 1);
  const nextDefault = letterhead.is_default ? db.letterheads.find((l) => l.kind === 'header') : undefined;
  if (nextDefault) nextDefault.is_default = true;
  const defaultHeaderId = db.letterheads.find((l) => l.kind === 'header' && l.is_default)?.id ?? null;
  for (const template of db.templates) {
    if (template.header_id === id) template.header_id = defaultHeaderId;
    if (template.footer_id === id) template.footer_id = null;
  }
  addAudit({
    action: 'delete', entity_type: 'letterhead', entity_id: letterhead.id, patient_id: null,
    description: `Видалено ${letterheadLabel(letterhead.kind)} «${letterhead.name}»`,
  });
}

export async function listAudit(patientId: string): Promise<AuditEntry[]> {
  await delay();
  return db.auditLog
    .filter((a) => a.patient_id === patientId)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime() || b.id - a.id)
    .map((a) => ({ ...a }));
}
