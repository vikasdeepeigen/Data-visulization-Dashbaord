# Autonomous Vehicle Data Visualization Platform

A full-stack enterprise platform to centrally manage, enter, audit, and visualize data collection and processing progress across **11 Autonomous Vehicle software tools**, built with **React**, **Tailwind CSS**, **Recharts**, **Node.js**, **Express**, **MongoDB (Mongoose)**, **bcryptjs**, **JWT**, **Multer**, and **SheetJS (`xlsx`)**.

---

## Key Features Implemented

### 1. Authentication & Role-Based Access Control (RBAC)
- **Login Page (`/login`)**: Email, password, show/hide password toggle, role selector (`Admin` or `User`), role mismatch validation against MongoDB, and link to `/register`.
- **Registration Page (`/register`)**: Full Name, Email, Password, Confirm Password (with show/hide toggles), always provisions standard `User` accounts by default, and redirects to `/login`.
- **Route & Permission Guards**:
  - `Admin` logs in and redirects to `/admin` (unrestricted access across all tools, users, Excel uploads, and configurations).
  - `User` logs in and redirects to `/dashboard` (scoped strictly to their `assignedSoftware` permissions in both frontend navigation and backend APIs).

### 2. Managed 11 Autonomous Vehicle Software Tools
Seeded automatically in MongoDB (`backend/src/seed/seedDefaultData.js`) with unique codes, supported data types, and dynamic software-specific metrics:
1. `SAM-2 Bounding Box – 2D` (`SAM2_BBOX_2D`)
2. `SAM-2 Bounding Box – 3D` (`SAM2_BBOX_3D`)
3. `Remote Server – FSD, Lane, MPC` (`REMOTE_SERVER_FLM`)
4. `HD-SAM – Semantic Mask` (`HDSAM_SEMANTIC`)
5. `LiDAR Segmentation – Semantic Mask/LiDAR` (`LIDAR_SEGMENTATION`)
6. `Bounding Box – 2D` (`BBOX_2D`)
7. `Bounding Box – 3D` (`BBOX_3D`)
8. `Rate Annotation – Range Image/Road Graph` (`RATE_ANNOTATION`)
9. `Style Transformation – Image Transformation` (`STYLE_TRANSFORMATION`)
10. `DeepCorrespondence – Correspondence` (`DEEP_CORRESPONDENCE`)
11. `Addition – Configurable Data Type` (`ADDITION_CONFIGURABLE`)

### 3. Dedicated Separate Software Pages (`/software/:id`)
- Clicking any software from the sidebar or summary table opens its **own dedicated dashboard page**.
- Prominently displays the selected software's name, unique code, KPIs, progress charts, data-type filters, software-specific metric averages, data-entry records table, linked Excel class files, and software-scoped CSV/JSON exports & activity logs.

### 4. Overall Summary Dashboard (`/dashboard`)
- Real-time MongoDB aggregations across accessible software: Total Software, Total Datasets, Total Data, Completed, Processing, Pending, and Overall Completion %.
- Interactive Recharts visualizations (software-wise stacked comparison & overall status distribution) + clickable comparison table.

### 5. Dynamic Data Entry (`/data-entry`)
- Software selector dynamically renders that tool's configured data types and custom metric fields (`number`, `percentage`, `text`, `select`, `boolean`).
- **Manual text input** for Location (no dropdown), Dataset Name/ID, Entry Date, Total/Completed/Processing/Pending counts with validation, and Notes.

### 6. Excel File & Class Management (`/excel`)
- Admin uploads `.xlsx`, `.xls`, or `.csv` files.
- Parses and previews **exact sheets, headers, rows, and class names** while preserving original class strings, order, and values without modification.
- Supports preview before save, persistent upload history, downloading the exact original Excel file, and generating `.txt` class files (one class per line).

### 7. Enterprise Admin Panel (`/admin`)
- **Software Configuration**: Add new software or edit any of the 11 tools (name, unique code, description, supported data types, dynamic metric fields, active state, and future auto-sync configuration).
- **User & Permission Management**: Create users, assign roles (`User`/`Admin`), enable/disable accounts, and assign granular per-software permissions.
- **Future Auto-Sync Integration**: Exposes `/api/sync/:softwareCode` for automated ingestion pipelines.

### 8. Reports & Activity Tracking (`/reports`)
- Filterable reports by software, data type, date range, and keyword/location search with CSV and JSON exports.
- Chronological audit trail logging data entries, software configuration updates, user permission changes, authentication events, and Excel uploads/exports.

---

## Default Seeded Credentials

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@dataviz.com` | `AdminPassword123!` | Full access to all 11+ tools, Excel uploads, configs & users |
| **User** | `user@dataviz.com` | `UserPassword123!` | Restricted to first 4 assigned software tools |

---

## Running the Project

- **Backend**:
  ```bash
  cd backend
  npm install
  npm run dev   # or: node src/app.js
  ```
  Runs on `http://localhost:5000` (configured via `backend/.env`).

- **Frontend**:
  ```bash
  cd frontend
  npm install
  npm run dev
  ```
  Runs on `http://localhost:3000`.
# Data-visulization-Dashbaord
