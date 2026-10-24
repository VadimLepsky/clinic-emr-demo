# Clinic EMR — demo

Public demo of an electronic medical record (EMR) web app for a private outpatient clinic:
consultation notes built from templates, care plans with cost estimates, a template builder,
per-doctor analytics and A4 print on a modular grid.

**All data in this repository is fictional.** The clinic, staff, patients and letterheads are invented
for the demo. This is a sanitized copy of a system built for a real clinic; no client data is included.

> Status: being translated to English and filled with richer demo data.

## Run locally

```bash
pnpm install
NEXT_PUBLIC_DEMO=1 pnpm dev
```

`NEXT_PUBLIC_DEMO=1` turns on the role switcher in the profile menu.
