# Uncommon Teacher Training — Attendance & Participant Management System

**Prepared By:** Munashe Nyagono  
**Project:** Software Development Internship, Uncommon.org

## Executive Summary

The Uncommon Teacher Training Attendance System is an offline-first web application designed to transition the program from manual, paper-based registers to a streamlined digital platform[cite: 1].

**Core Design Philosophy:** The primary objective of this system is to make the administrative workflow (specifically for Anesu) 170% easier. The platform is oriented around reducing steps, automating report generation directly within the system, and eliminating the need to use external tools like Google Docs or Excel for standard reporting. New features and functionalities are being rolled out incrementally to ensure a smooth transition to the final product.

---

## Key Features & Automated Workflows

### 1. Role-Based Access Control

**Admin Access:** System administrators have full access to all pages, including Dashboard, Teachers, Workshops, Attendance, Reports, and Funds Requisition.
**Teacher Access:** Regular teachers are restricted upon login and land exclusively on the Teachers page.

### 2. Funds Requisition (Workflow Starting Point)

All workshop planning begins at the funds requisition stage. The system gathers all initial data here, seamlessly transitioning into workshop creation, ensuring no double-entry of financial or administrative data.

### 3. Intelligent Workshop Creation & Management

**Multi-Day Support:** Workshops support defined start and end dates, allowing for continuous attendance tracking across multiple days.
**Location-Based Caching:** When creating a workshop and selecting a location, the system automatically retrieves data from previous workshops held at that site. Administrators can simply mark returning teachers as present or absent, or add new students via manual entry or QR code scanning.
**Comprehensive Display Dashboard:** Each workshop features a dedicated sub-dashboard detailing:
**Demographic Metrics:** Average age, gender statistics, and expected vs. present attendees, displayed in compact visual graphs.
**Financial & Personnel Details:** Full visibility into the money/finances involved, as well as specific details about the facilitators and Ministry representatives present.
**Smart Commenting:** A dedicated space for workshop comments allows administrators to directly import live metrics from the workshop dashboard into their notes.

### 4. Participant Registration & QR Scanning

**Teacher Profiles:** One-time registration generates a permanent digital profile and a unique QR code for each teacher[cite: 1].
**Frictionless Scanning:** QR code scanning utilizes the device camera (via `html5-qrcode`), ensuring rapid check-ins[cite: 1].

### 5. Offline-First Architecture & Auto-Sync

**Uninterrupted Operations:** All records are instantly saved locally to IndexedDB, allowing workshops to continue seamlessly in low-connectivity environments[cite: 1].
**Background Synchronization:** When internet connectivity is restored, pending records automatically sync to the server without manual intervention[cite: 1].

### 6. Automated Reporting & Export

**In-System Generation:** Comprehensive reports are generated directly within the platform.
**\*Granular Excel Export:** Export functionalities target specific, selected workshops rather than bulk current data. The Excel export (`SheetJS`) includes all data and calculated metrics visible on the workshop display[cite: 1].

---

## Technology Stack

| Layer                  | Technology                                             |
| :--------------------- | :----------------------------------------------------- |
| **Frontend**           | React + Vite (TypeScript support planned)[cite: 1]     |
| **UI/Charts**          | Custom CSS / Material UI + Recharts[cite: 1]           |
| **Backend & Database** | Supabase (PostgreSQL, Auth, and API)                   |
| **Offline Storage**    | IndexedDB[cite: 1]                                     |
| **QR Handling**        | QRCode (Generation) + html5-qrcode (Scanning)[cite: 1] |
| **Export**             | SheetJS[cite: 1]                                       |

---

# File structure

src/
main.jsx # Entry point
App.jsx # Routes + layout shell
index.css # All styles (variables, components, layout)
hooks/
useAppState.jsx # Global state (Context + useReducer) + IndexedDB sync
utils/
db.js # IndexedDB read/write helpers (idb library)
supabase.js # Supabase client initialization and helpers
helpers.js # QR generation, date formatting, Excel export
components/
Icons.jsx # All SVG icons
Sidebar.jsx # Navigation sidebar
Toast.jsx # Toast notifications
pages/
DashboardPage.jsx # Stats, recent activity, system metrics
TeachersPage.jsx # Register teachers, view QR codes
WorkshopsPage.jsx # Create/manage workshops, location caching, financial/Ministry details
AttendancePage.jsx # QR scanner + live session log
ReportsPage.jsx # Full attendance table + granular Excel export

## Setup & Installation

---

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
---
```
