# Project rules

Internal EMR web app for a private medical clinic. UI language: Ukrainian.
Stack: Next.js App Router, TypeScript, Tailwind CSS v4, shadcn/ui.

1. Types come only from lib/types.ts. Do not invent new types.
2. Components get data only through functions in lib/data.ts.
   Never import lib/mock-data.ts directly in components.
3. If a new data function is needed, add it to lib/data.ts.
4. Colors come only from the theme tokens in app/globals.css
   (bg-background, text-primary, bg-sidebar, border-border, etc.).
   No hardcoded hex values, no default Tailwind palette colors (blue-500, gray-100...).
   Statuses use token pairs: bg-status-success-bg + text-status-success-fg,
   and likewise for neutral, warning, danger, info.
5. Light and dark themes must both work (next-themes, class-based).
   Dark theme and the theme toggle are available to the manager only: for every other role `ThemeProvider` gets
   `forcedTheme="light"` (by `getCurrentUser()` in `app/layout.tsx`), and `ThemeToggle` renders nothing when the
   theme is forced. Keep the dark theme working — the manager uses it.
6. Do not modify lib/types.ts, lib/mock-data.ts or app/globals.css
   unless the task explicitly asks for it.
7. The template form renderer (components/template-form) is a pure component:
   data in via props, no lib/data calls inside.

## Visual scale

Reference: Remote dashboard — large type, white borderless cards on a soft canvas.

- Font: Manrope (`next/font`, latin + cyrillic + cyrillic-ext, weights 400–700) everywhere in the interface, except the
  sidebar label «мед.кабінет», which uses the document font (`font-document`). Documents (the A4 sheet) use
  IBM Plex Sans — see the A4 sheet below.
- Type: body text, table cells and inputs are 15px (`text-body`, the body default).
  Secondary text is `text-sm text-muted-foreground`. Page title `text-3xl font-semibold`,
  home greeting `text-3xl font-semibold`, page subtitle `text-base text-muted-foreground`,
  card title `text-lg font-semibold`, KPI numbers `text-3xl`.
  `text-xs` is only for badges and the uppercase group labels in navigation.
  Patient names in lists and tables are `font-semibold` — the patient is what people scan for
  (not the patient card title, not inside the A4 sheet).
- Width: pages use `Page` / `PageHeader` from `components/app-shell/page.tsx` — a centered container
  (`mx-auto`, up to `max-w-[1400px]`, `2xl:max-w-[1600px]`), so wide monitors don't leave an empty strip on the right.
  `Page width="wide"` has no upper limit — only for table pages: `/patients`, `/prescriptions`, `/settings/services`
  (settings pick it by path in `SettingsPage`). Skeletons that stand in for a page use `pageWidthClass`.
  No `max-w-4xl/5xl/6xl` page containers; the A4 sheet keeps its 210mm.
  Every page except home has a `PageHeader`: back arrow, title, page actions and theme toggle share one row,
  vertically centered. Nothing goes above the title (the back link is an icon button with its label as
  `aria-label`/tooltip; secondary lines go below as `description`), so every title starts at the same top
  as the home greeting. From the title — or from the description under it, if there is one — to the
  content is 60px on every page, home included: the header's `pb-9` + the `gap-6` of `Page`.
  The theme toggle lives only there (and in the home greeting), for the manager only; `ContentCorner` is just the
  mobile menu button.
  Dashboards split 2/3 + 1/3 (`xl:grid-cols-3`, main column `xl:col-span-2`).
- Canvas and cards: the content area is `bg-canvas` (token `--canvas`: `#eae9ed` in light theme,
  `--background` in dark, where cards stand out by their `--card` fill).
  Anything that paints the canvas color (e.g. sticky bars) uses `bg-canvas` too.
  Line under tab lists (`variant="line"`) uses `border-tabs-line` (`--tabs-line`: `#d1d8f0` light, `#152251` dark).
  Cards use `Card` from `components/ui/card.tsx`: `bg-card` (`#fefefe` in light theme) `rounded-2xl`, a 1px `border-border`
  in both themes, no shadow; `Card plain` has no border (the patient info strip, the documents list, the «Сьогодні»
  summary, the patient-search hint). Card header `px-8 py-6` with `border-b` (dropped with `border-b-0` where the
  content follows the title directly: documents, «Сьогодні», all prescriptions), title on the left,
  optional `CardHeaderLink` («Переглянути всі →») on the right. List rows `px-8 py-5` with
  `divide-y`. Section titles go inside the card header, not above the card.
  Tables sit directly in the card without an outer border (cell padding aligns to `px-8`).
- Sidebar: 18rem; header (`pt-10 pb-10`) is the 36px logo + label «мед.кабінет» (`gap-1`;
  `font-document text-2xl font-semibold tracking-tight`, trimmed with `text-box` to x-height for lowercase text
  — cap height for all-caps — so it centers on the logo); items `h-11`, 15px, icons `size-5`, `gap-3`, `rounded-lg`. «Головна» sits on top outside the groups,
  then РОБОТА (Пацієнти, Призначення) and КЕРУВАННЯ (manager only) with small uppercase labels;
  profile at the bottom on `bg-sidebar-accent/35`, no top border. The sidebar's edge is `border-sidebar-border`
  (`#D1D8F0` in light theme).
- Controls: buttons and inputs `h-10`, 15px (`size="sm"` is for compact row actions).
- Buttons: one hierarchy everywhere. Main action — `default` (`bg-primary`): «Зберегти», «Далі», «Застосувати»,
  «Створити». Secondary — `outline`: «Скасувати», «Назад», «Закрити», «Друк». Dangerous — `destructive`:
  «Видалити», «Вийти без збереження». At most one main action per dialog; if a step has none, the action that
  moves the user forward is `default` (e.g. «Обрати файл» in step 1 of the price import). Footer order:
  secondary on the left, main on the right.
- Dialogs (`components/ui/dialog.tsx`): `rounded-2xl`, `p-8`, default width `sm:max-w-xl`; wider dialogs pass
  their own `sm:max-w-*`. Title `text-xl font-semibold`, description 15px muted. 24px (`gap-6`) between the
  header, the body and the footer; a dialog wrapped in a `<form>` uses `flex flex-col gap-6` on the form and
  groups its fields in a `flex flex-col gap-4` block. The footer has no background bar: buttons on the right,
  `gap-3`. Inside dialogs, labels are 15px `font-medium` (`Label`) and fields `h-10`, 15px, as elsewhere.
- Sheets (`components/ui/sheet.tsx`) follow the same type and spacing: header `px-8 pt-8`, body `px-8 pb-8`,
  footer `px-8 pb-8` with buttons on the right.
- The A4 sheet (`document-sheet`, print views) keeps its own print typography; these rules don't apply inside it.
  Documents are set in `--font-document` (IBM Plex Sans, `--font-plex` from `next/font` in `app/layout.tsx`), the
  interface in Manrope: `.document-sheet { font-family: var(--font-document) }` and everything on the sheet inherits
  it — inline fields too (form controls inherit the font via preflight), while popovers opened from the sheet are
  portaled out and stay on Manrope. Change the document font only in `app/layout.tsx` and the `--font-document`
  token. Numbers in sheet tables and indicator groups are `tabular-nums`.
  The sheet always sits in `SheetBackdrop` (`components/document-sheet/sheet-backdrop.tsx`): `variant="page"`
  on pages (`border-card` in light theme, `border-sheet-border` in dark), `variant="dialog"` in dialogs (fills the dialog body and scrolls,
  the dialog header stays fixed). Its color is `--sheet-backdrop` = `--canvas`, so a dialog preview looks
  exactly like the document page. Never hand-roll the backdrop; section bars and table headers on the sheet are
  `bg-sheet-bar` (`--sheet-bar` #f4f4f6, kept in print by `print-color-adjust: exact`; see Document grid).
  Every sheet is paper (`sheetPaperClass`: `.paper` + `bg-card`): white with the light palette in both themes and in
  print — view, print, filling in (inline fields included) and the template preview — because headers and footers
  are images made for a white sheet. The interface around it stays dark; popovers and dropdowns opened from the
  sheet are portaled out and keep the interface theme.
  Borders and dividers on the sheet (patient table, clinic header rule, prescription table, footer rules, chips) use
  only `border-sheet-border` / `divide-sheet-border` (a hairline drawn as a pseudo-element: `bg-sheet-border`;
  `--sheet-border`: `#eae9ed` light — also in `.paper` — `#252d52` dark, 50% black in print), never `border-border`:
  the interface border can change without touching documents.
  The висновок in view and print is A4 pages on screen too (`PagedSheet`): every page 210 × 297 mm, the next page a
  separate sheet 8mm below (as in a print preview), so it is visible whether it fits one page; the pieces (`SheetAtom`:
  header, patient block, title, each section bar and field) are measured and laid out page by page, and printing
  prints the same pages, one per sheet. The footer sits at the bottom of the last page, on screen and in print.
  Exception — the prescription sheet: as tall as its content, no pages, the footer right after the information
  text. The висновок edit mode (`DocumentSheet mode="edit"`) keeps its own padding, sizes and bordered patient table.
  Section bars (`templatePageAtoms`): the title as written in the template plus a colon, left, semibold at
  `--doc-font`, `bg-sheet-bar` bleeding half a gutter past the columns, one and a half lines high with the text
  centered vertically (`sectionBarClass`). A section whose only field is labelled like the section prints the text
  without the label.
  The field name (`FieldBlock.label`) is optional; the description stays. Without a name the sheet and print show no
  label, no colon, no empty line — the text right under the bar, in «Назва: значення» lines only the value; filling
  in puts the field right under the bar with the description as its placeholder; messages (missing required fields)
  and screen readers name it «поле в розділі «<розділ>»» (`fieldNames`); the builder lists it in grey
  «Без назви — <опис>».
  Headers and footers are only images across the content width — there is no text header. Templates take them from
  the letterhead library (`Letterhead`, Налаштування → Шапки і підвали; files in `public/letterheads/`, new uploads
  as data URLs): the template picks `header_id` / `footer_id` (null — none), a document without a template gets the
  default header, always through `resolveLetterheads` (`lib/data.ts`). Призначення have their own pair, separate
  from the library: «Бланк призначення», `ClinicSettings.prescription_header_image_url` /
  `prescription_footer_image_url` (null — none). Draw them only with `SheetHeader` / `SheetFooterImage`
  (`components/document-sheet/letterhead.tsx`, `src` + `alt`); a scaled strip of the sheet is `LetterheadPreview`.
  A prescription is drawn only through
  `PrescriptionSheet` (`components/prescriptions/prescription-sheet.tsx`) — the dialog and printing share it;
  its edit mode uses the висновок inline fields (`inlineControl`), and anything that must not print is `print:hidden`.
  Its title is as in the висновок — centered, `text-doc-title`, `font-medium`, under the patient block.
  It has two blocks — «Послуги, що надаються в клініці» (price, sum, «Вартість послуг») and «Призначення для виконання
  поза клінікою» (only name and quantity; shown only when it has rows) — and ends with the information text, then the
  footer image; no signatures, no «Дійсне до». The «Знижка, %» column appears only on «Додати знижку» (edit) or when
  a row has a discount (view, print). Modes: `view`, `edit`, `discount` (reception, contact centre: discount only).
  A prescription is printed only through `usePrintPrescription` (`components/prescriptions/print-prescription.tsx`):
  it renders the sheet into `body > .print-root` and calls `window.print()`; `app/print.css` prints only that root.
  There are no separate print pages.
- Document grid («Сетка документа»; A4 sheets: `DocumentSheet` view/print, `PrescriptionSheet`; Müller-Brockmann). Tokens (globals.css):
  `--doc-font` 10pt, `--doc-line` 14pt (the grid unit), `--doc-title` 13pt, `--doc-small` 8pt, `--doc-cols` 12,
  `--doc-gutter` 4mm; utilities `text-doc` / `text-doc-title` / `text-doc-small` (all on the 14pt line), spacing
  `line`, `half-line`, `gutter` (`mt-line`, `gap-line`, `gap-x-gutter`). Shared parts in
  `components/document-sheet/grid.tsx` and `paged-sheet.tsx`.
  1. Margins: top and bottom 6mm (`pt-sheet-top`, `pb-sheet-bottom` — the footer as far from the bottom as the header
     from the top), sides 12mm (`px-sheet-x`). Never hard-code sheet padding.
  2. Vertical: every offset and height on the sheet is lines or half lines (`var(--doc-line)`). Save room at the top,
     not in the text: header → patient block 1 line, patient block → title 1.5 lines, title → first section 1.5 lines,
     the patient block without gaps between its rows. Призначення: patient block → title 1.5 lines, title → «Послуги,
     що надаються в клініці» 1.5 lines, that heading → its table 1 line, the subtitle «послуги, що не надаються в
     клініці» → its table half a line, 1 line before «Вартість послуг». In the text: 1 line before a section bar, the bar 1.5 lines, half a
     line after it and between fields. The header and image blocks are `SnapImage` — the box is rounded up to half
     lines, the picture fits without stretching; the footer image keeps its height, pinned 6mm from the bottom, at
     least half a line below the text. No arbitrary `mt-3` / `py-2` inside the sheet. Prescription table rows are at
     least 1.5 lines with the text centered vertically, a 1px hairline under each (`after:` `bg-sheet-border`,
     bleeding half a gutter past the columns, like the bars), not bordered boxes; the header row is the same height,
     `font-medium`, on `bg-sheet-bar` bleeding half a gutter.
  3. Columns: the sheet is a 12-column grid with the gutter (`sheetGridClass`; rows pass the columns on with
     `subgridClass` / `grid-cols-subgrid`). Patient block (`SheetInfoGrid`): label 2 columns + value 4 columns, twice.
     Prescription table: Послуга 7, Кількість 1, Ціна 2, Сума 2 (the discount, when shown, takes 1 from Послуга;
     outside the clinic: Послуга 11, Кількість 1). A future lab table: Показник 5, Результат 2, Од. 2, Норма 3.
     Column edges are the same in every document; one-column numbers (Кількість, Знижка) are centered.
  4. Type: only `--doc-font`, `--doc-title`, `--doc-small` on the sheet (no `text-xs/sm/base/lg`, controls included);
     the document title (висновок and призначення) is centered, `text-doc-title`, `font-medium`;
     hierarchy by weight. `cn()` knows `text-doc*` as font sizes (`lib/utils.ts`), so they merge correctly.
  5. One left edge: bar text, field labels and tables start at the first column.
  6. Debug (development only): G or `?grid=1` shows the lines and columns over every sheet (`DocGridOverlay`);
     never printed.
- Template preview («Попередній перегляд» in the template builder) is a mockup, not a form: dialog header on
  `bg-background` (#fefefe in light theme), `text-2xl` title, no description, close button in the header row; the sheet is
  `DocumentSheet mode="view" mock` with `className="paper bg-background"`. `.paper` (globals.css, on every sheet)
  scopes the light palette onto the sheet, so it stays paper-light in dark theme (`dark:` does not apply inside it). In mock mode
  (`TemplateForm` `mock`, passed via props) values are never invented: text/textarea/number values are skeleton bars
  (`bg-muted`), select/multiselect show `defaultValue` or the first option, checkbox shows its label, services show
  the label and chip bars, static text is real with variables filled in, and empty fields/sections are not hidden.
  Images are part of the template, so they are always real, never skeletons: the chosen header and footer from
  the letterhead library, the template banner next to the title, the footer logo and `ImageBlock`s.
