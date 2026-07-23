# Uncommon Teacher Training — Attendance System

React + Vite frontend. All data stored locally in IndexedDB (works fully offline).

## Setup

```bash
npm install
npm run dev
```

Then open http://localhost:5173 in your browser.

## Build for production

```bash
npm run build
npm run preview
```

## File structure

```
src/
  main.jsx              # Entry point
  App.jsx               # Routes + layout shell
  index.css             # All styles (variables, components, layout)
  hooks/
    useAppState.jsx     # Global state (Context + useReducer) + IndexedDB sync
  utils/
    db.js               # IndexedDB read/write helpers (idb library)
    helpers.js          # QR generation, date formatting, Excel export
  components/
    Icons.jsx           # All SVG icons
    Sidebar.jsx         # Navigation sidebar
    Toast.jsx           # Toast notifications
  pages/
    DashboardPage.jsx   # Stats, recent activity
    TeachersPage.jsx    # Register teachers, view QR codes
    WorkshopsPage.jsx   # Create and manage workshops
    AttendancePage.jsx  # QR scanner + live session log
    ReportsPage.jsx     # Full attendance table + Excel export
```

## Key features

- **Teacher registration** — one-time form, generates unique ID + QR code
- **QR code scanning** — uses device camera via html5-qrcode
- **Offline-first** — all records saved to IndexedDB instantly
- **Auto-sync** — pending records sync when internet returns
- **Excel export** — attendance and teacher lists exported via SheetJS
