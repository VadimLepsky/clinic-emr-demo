import { calcAge, resolveLetterheads } from '@/lib/data'
import type {
  DocumentValues,
  FieldValue,
  Letterhead,
  Patient,
  Service,
  ServicePackage,
  Staff,
  Template,
  TemplateSchema,
} from '@/lib/types'
import { cn } from '@/lib/utils'
import type { SearchServices } from '@/components/template-form/services-context'
import { TemplateForm } from '@/components/template-form/template-form'
import { templatePageAtoms } from '@/components/template-form/page-layout'
import { interpolate } from '@/components/template-form/utils'
import { formatDate } from '@/components/documents/format'
import { SheetInfoGrid, SnapImage, sheetPaperClass } from './grid'
import { SheetFooterImage, SheetHeader } from './letterhead'
import { PagedSheet, type SheetAtom } from './paged-sheet'

type DocumentSheetProps = {
  schema: TemplateSchema
  values: DocumentValues
  patient: Patient
  doctor: Staff
  title: string
  documentDate: string
  documentNumber: string | null
  /** The letterhead library; the header and footer are picked by `requisites` (see resolveLetterheads). */
  letterheads: Letterhead[]
  /** Template header/footer settings; without a template: the default header, no footer, a signature line. */
  requisites?: Pick<
    Template,
    'header_id' | 'footer_id' | 'footer_text' | 'show_signature' | 'banner_image_url' | 'footer_image_url'
  >
  services: Service[]
  servicePackages?: ServicePackage[]
  onSearchServices?: SearchServices
  mode?: 'view' | 'edit'
  onChange?: (blockId: string, value: FieldValue) => void
  invalidFieldIds?: string[]
  /** Template mockup (view mode only): skeleton bars instead of values, see TemplateForm. */
  mock?: boolean
  /** Edit mode: services fields read-only because the document's prescription is paid, see TemplateForm. */
  lockedServices?: boolean
  className?: string
}

const sexLabels: Record<NonNullable<Patient['sex']>, string> = { male: 'Чоловіча', female: 'Жіноча' }

const noop = () => {}

function InfoRows({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="flex flex-col divide-y divide-sheet-border">
      {rows.map(([label, value]) => (
        <div key={label} className="flex gap-2 px-2 py-1">
          <dt className="w-32 shrink-0 text-muted-foreground">{label}</dt>
          <dd className="min-w-0 font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function InfoLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="inline">{label}: </dt>
      <dd className={strong ? 'inline font-semibold' : 'inline'}>{value}</dd>
    </div>
  )
}

export function DocumentSheet({
  schema,
  values,
  patient,
  doctor,
  title,
  documentDate: documentDateIso,
  documentNumber,
  letterheads,
  requisites,
  services,
  servicePackages,
  onSearchServices,
  mode = 'view',
  onChange = noop,
  invalidFieldIds,
  mock = false,
  lockedServices = false,
  className,
}: DocumentSheetProps) {
  const view = mode === 'view'
  const age = calcAge(patient.birth_date)
  const documentDate = formatDate(documentDateIso)
  const birthDate = patient.birth_date ? formatDate(patient.birth_date) : '—'
  const context = { patient, doctor, documentDate: documentDateIso, documentNumber }
  const { header, footer } = resolveLetterheads(letterheads, requisites)
  const showSignature = requisites?.show_signature ?? true
  const footerLogo = requisites?.footer_image_url ?? null
  const footerText = requisites?.footer_text ? interpolate(requisites.footer_text, context).trim() : ''

  const form = (
    <TemplateForm
      schema={schema}
      values={values}
      onChange={onChange}
      context={context}
      mode={mode}
      layout="page"
      services={services}
      servicePackages={servicePackages}
      onSearchServices={onSearchServices}
      invalidFieldIds={invalidFieldIds}
      mock={mock}
      lockedServices={lockedServices}
    />
  )
  const hasFooter = showSignature || footerText || footerLogo || footer
  const bannerLines = (
    <>
      <InfoLine label="П.І.Б" value={patient.full_name} strong />
      <InfoLine
        label="Дата народження"
        value={patient.birth_date ? `${birthDate}${age === null ? '' : ` (${age} р.)`}` : '—'}
      />
      {documentNumber && <InfoLine label="Номер документа" value={documentNumber} />}
      {/* Doctor and date are in the signature row; without it they go here. */}
      {!showSignature && (
        <>
          <InfoLine label="Дата прийому" value={documentDate} />
          <InfoLine
            label="Лікар"
            value={doctor.specialty ? `${doctor.full_name}, ${doctor.specialty}` : doctor.full_name}
          />
        </>
      )}
    </>
  )

  if (view) {
    // View and print: A4 pages on the document grid (AGENTS.md → Document grid) — the top is dense (a line between
    // header, patient block, title and the first section), the text has air; the footer at the bottom of the last page.
    const atoms: SheetAtom[] = []
    if (header) atoms.push({ key: 'header', space: 0, node: <SheetHeader src={header.image_url} alt={header.name} /> })
    if (requisites?.banner_image_url) {
      // With a banner: title and patient lines on the left (7 columns), the banner on the right (5 columns).
      atoms.push({
        key: 'banner',
        space: 1,
        node: (
          <div className="grid grid-cols-subgrid items-start break-inside-avoid">
            <div className="col-span-7 min-w-0">
              <h1 className="text-doc-title text-balance font-medium">{title}</h1>
              <dl className="mt-line">{bannerLines}</dl>
            </div>
            <SnapImage src={requisites.banner_image_url} alt="" className="col-span-5" />
          </div>
        ),
      })
    } else {
      atoms.push({
        key: 'patient',
        space: 1,
        node: (
          <SheetInfoGrid
            left={[
              ['Дата', documentDate],
              ['Медкарта №', String(patient.crm_client_id)],
              ['Пацієнт', patient.full_name],
              ['Дата нар.', birthDate],
            ]}
            right={[
              ['Документ №', documentNumber ?? '—'],
              ['Спеціаліст', doctor.full_name],
            ]}
          />
        ),
      })
      atoms.push({ key: 'title', space: 1.5, node: <h1 className="text-center text-doc-title text-balance font-medium">{title}</h1> })
    }
    const body = templatePageAtoms({ schema, values, context, services, mock })
    if (body[0]) body[0] = { ...body[0], space: 1.5 }
    atoms.push(...body)

    const footerNode = hasFooter ? (
      <footer className="flex flex-col gap-line break-inside-avoid">
        {showSignature && (
          <div className="flex flex-wrap items-end justify-between gap-x-gutter">
            <p>
              <span className="font-semibold">Лікар:</span> {doctor.full_name}
              <span className="ml-6 tracking-widest" aria-hidden="true">
                __________
              </span>
              <span className="ml-1 text-doc-small text-muted-foreground">(підпис)</span>
              <span className="sr-only">місце для підпису</span>
            </p>
            <p className="tabular-nums">{documentDate}</p>
          </div>
        )}
        {footerLogo ? (
          <div className="flex items-end justify-between gap-gutter">
            <p className="min-w-0 flex-1 text-doc-small whitespace-pre-wrap">{footerText}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={footerLogo} alt="" className="block h-[calc(var(--doc-line)*2)] w-auto shrink-0 object-contain" />
          </div>
        ) : (
          footerText && <p className="text-doc-small whitespace-pre-wrap">{footerText}</p>
        )}
        {footer && <SheetFooterImage src={footer.image_url} alt={footer.name} />}
      </footer>
    ) : null

    return <PagedSheet atoms={atoms} footer={footerNode} className={className} />
  }

  // Filling in: its own layout (inline fields, bordered patient table), on paper like every sheet.
  return (
    <article
      className={cn(
        sheetPaperClass,
        'mx-auto flex w-full max-w-[210mm] flex-col p-6 shadow-md sm:p-10 2xl:p-[18mm]',
        className,
      )}
    >
      {header && <SheetHeader src={header.image_url} alt={header.name} />}

      {requisites?.banner_image_url ? (
        <div className="mt-5 flex items-start gap-6 first:mt-0 break-inside-avoid">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-balance">{title}</h1>
            <dl className="mt-3 flex flex-col gap-0.5 text-sm">{bannerLines}</dl>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={requisites.banner_image_url} alt="" className="block h-auto w-[40%] shrink-0" />
        </div>
      ) : (
        <>
          <h1 className="mt-5 text-center first:mt-0 text-lg font-bold text-balance">{title}</h1>

          <div className="mt-4 grid grid-cols-2 divide-x divide-sheet-border border border-sheet-border text-xs break-inside-avoid tabular-nums">
            <InfoRows
              rows={[
                ['Пацієнт', patient.full_name],
                ['Вік', age === null ? '—' : `${age} р.`],
                ['Дата народження', birthDate],
                ['Стать', patient.sex ? sexLabels[patient.sex] : '—'],
                ['Номер медкарти', String(patient.crm_client_id)],
              ]}
            />
            <InfoRows
              rows={[
                ['Лікар', doctor.full_name],
                ['Спеціалізація', doctor.specialty ?? '—'],
                ['Дата прийому', documentDate],
                ['Номер документа', documentNumber ?? '—'],
              ]}
            />
          </div>
        </>
      )}

      <div className="mt-5">{form}</div>

      {hasFooter && (
        <footer className="mt-auto flex flex-col gap-2 pt-10 text-sm break-inside-avoid">
          {showSignature && (
            <div className="flex flex-wrap items-end justify-between gap-4">
              <p>
                <span className="font-semibold">Лікар:</span> {doctor.full_name}
                <span className="ml-6 tracking-widest" aria-hidden="true">
                  __________
                </span>
                <span className="ml-1 text-xs text-muted-foreground">(підпис)</span>
                <span className="sr-only">місце для підпису</span>
              </p>
              <p className="tabular-nums">{documentDate}</p>
            </div>
          )}
          {footerLogo ? (
            <div className="flex items-end justify-between gap-6 border-t border-sheet-border pt-2">
              <p className="min-w-0 flex-1 text-xs whitespace-pre-wrap">{footerText}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={footerLogo} alt="" className="block h-[12mm] w-auto shrink-0 object-contain" />
            </div>
          ) : (
            footerText && <p className="text-xs whitespace-pre-wrap">{footerText}</p>
          )}
          {footer && <SheetFooterImage src={footer.image_url} alt={footer.name} />}
        </footer>
      )}
    </article>
  )
}
