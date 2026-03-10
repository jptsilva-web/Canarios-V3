# Canary Breeding Control - PRD

## Original Problem Statement
Build a canary breeding control/management web application with a local database, similar to "Orniplus" app. Features include: configuring aviaries/cages in zones/modules, managing breeding pairs, tracking egg-laying and incubation, managing hatching and banding schedules, viewing tasks, contact management, calendar functionality, season management, printable breeding cards, and multi-language support.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn/UI components
- **Backend**: FastAPI (Python) with JWT authentication
- **Database**: MongoDB (via Motor async driver)
- **Theme**: Dark Navy (#1A2035) with accent colors (Yellow #FFC300, Teal #00BFA6, Pink #E91E63, Orange #FF9800)
- **Authentication**: JWT tokens with bcrypt password hashing

## User Personas
1. **Hobby Breeder**: Manages 10-50 pairs, needs simple tracking
2. **Professional Breeder**: Manages 50+ pairs, needs comprehensive analytics
3. **Breeding Club Member**: Shares contacts and breeding data with community

## Core Requirements (Static)
- **User Authentication** - Login, Register, Password Recovery via Email
- Zone/Cage configuration with visual grid layout
- Bird registry with band numbers, colors, genealogy
- Breeding pair management with cage assignment
- Clutch tracking (laying → incubating → hatching → weaning)
- Egg status tracking (fresh, fertile, infertile, hatched, dead)
- Task dashboard with urgency grouping
- Calendar view for breeding schedule
- Contact directory for other breeders
- Season/Year management for multi-year breeding
- **Per-Season Data Isolation** - Each season has isolated zones, cages, pairs, clutches
- Printable breeding cards
- Multi-language support (Portuguese, English, Spanish)
- Backup & Restore functionality

## What's Been Implemented (December 2025)
- ✅ **User Authentication System** (COMPLETED)
  - Login page with email/password
  - Register page for new users
  - Password recovery via email (Gmail SMTP)
  - JWT tokens (7 days validity) for session management
  - Protected routes - requires login to access app
  - User info displayed in sidebar with logout button
- ✅ **Multi-User Data Isolation** (COMPLETED)
  - All endpoints filter by user_id
  - New data automatically associated with logged-in user
  - Legacy data (without user_id) visible to all users for backward compatibility
- ✅ **Per-Season Data Isolation** (COMPLETED - December 2025)
  - Zones, Cages, Pairs, and Clutches are isolated per season
  - When a season is active, ONLY data for that season is visible
  - Birds remain GLOBAL across all seasons (can be used in any season)
  - Dashboard stats reflect active season (pairs, clutches filtered; birds global)
  - Creating new data automatically associates with active season
  - Switching seasons shows different data sets
- ✅ Full-stack application with React + FastAPI + MongoDB
- ✅ Dashboard with stats cards and task preview
- ✅ Bird registry with CRUD, search, gender filter, and **parent selection for genealogy**
- ✅ Zones & Cages management with visual grid
- ✅ Breeding pairs management with clutch tracking
- ✅ Egg tracking with visual indicators
- ✅ **Interactive Egg Status** - Click eggs to mark as fertile (green), infertile (red), or hatched (bird icon)
- ✅ **Ring numbers displayed below bird icons** in Pairs page
- ✅ Status transitions (laying → incubating → hatching)
- ✅ Tasks page grouped by urgency (overdue, today, upcoming)
- ✅ Calendar view with breeding events and manual task creation
- ✅ Contacts directory for breeders
- ✅ **Email Notification Settings** - Configure Gmail SMTP with App Password for task alerts ✅ WORKING
- ✅ Newborn chicks tracking page
- ✅ **Family Tree/Genealogy** - View bird ancestry (grandparents, parents, siblings, children)
  - **Search functionality** - Search birds by band number, STAM, or class name
  - **Gender filter** - Filter by All Birds, Males Only, Females Only, or Newborns
  - **Newborns filter** - Dedicated filter for recently hatched chicks
  - **Quick stats** - Shows total birds count with male/female breakdown
- ✅ **Breeding Reports** - Statistics with fertility rate, hatch rate, egg breakdown, clutch summary
  - **Monthly trends chart** - Visual bar chart showing eggs, hatched, and rates over time
  - **Year-over-Year Comparison** - Compare statistics between two years with color-coded changes
- ✅ **Data Export** - Export birds and breeding reports to CSV/PDF
- ✅ **Multi-language Support** - 3 languages with flag selector:
  - 🇵🇹 Português (Portugal) - Full translation
  - 🇬🇧 English
  - 🇪🇸 Español
- ✅ **Season/Year Management** - Create and manage breeding seasons
  - Create seasons with year, name, start/end dates
  - Activate/deactivate seasons
  - Quick add buttons for years
- ✅ **Printable Breeding Cards** - Generate print-friendly cards for active pairs
  - Shows male/female info (band number, STAM, year)
  - Displays eggs and hatched counts
  - Print-optimized layout
- ✅ **Auto-create newborn birds** - When eggs are banded, automatically creates bird record with parents linked
- ✅ **Update newborn gender** - Can edit newborn to set gender once determined
- ✅ **Complete translations** - All toast messages, form labels, table headers, and UI elements translated
- ✅ **IIS Deployment Documentation** - Complete guide for deploying on Windows IIS with Reverse Proxy
- ✅ Dark navy theme with custom accent colors
- ✅ Mobile-responsive sidebar navigation

## API Endpoints
### Core APIs
- `/api/zones` - CRUD for aviary zones
- `/api/zones/{id}/generate-cages` - Auto-generate cage grid
- `/api/cages` - Cage management
- `/api/birds` - Bird registry CRUD
- `/api/birds/{id}/genealogy` - Get bird genealogy (parents, grandparents, children, siblings)
- `/api/pairs` - Breeding pairs CRUD
- `/api/clutches` - Clutch management
- `/api/clutches/{id}/eggs` - Egg tracking (POST to add, PUT to update status)
- `/api/contacts` - Breeder contacts CRUD
- `/api/dashboard/stats` - Dashboard statistics
- `/api/dashboard/tasks` - Task list

### Season Management APIs
- `GET /api/seasons` - List all seasons
- `POST /api/seasons` - Create new season
- `PUT /api/seasons/{id}` - Update season
- `DELETE /api/seasons/{id}` - Delete season
- `GET /api/seasons/active` - Get currently active season
- `POST /api/seasons/{id}/activate` - Activate a season

### Reports APIs
- `/api/reports/breeding-stats` - Comprehensive breeding statistics
- `/api/reports/breeding-trends` - Monthly breeding trends
- `/api/reports/year-comparison` - Year-over-year comparison (query params: year1, year2)

### Print APIs
- `/api/print/breeding-cards` - Get data for printable breeding cards

### Export APIs
- `/api/export/birds/csv` - Export birds to CSV
- `/api/export/birds/pdf` - Export birds to PDF
- `/api/export/breeding-report/csv` - Export breeding report to CSV
- `/api/export/breeding-report/pdf` - Export breeding report to PDF

### Backup/Restore APIs
- `GET /api/backup/create` - Download full database backup as JSON file
- `POST /api/backup/restore` - Upload and restore from JSON backup file

### Settings APIs
- `/api/settings` - Get all settings (breeding & email)
- `/api/settings/breeding` - Save breeding cycle configuration
- `/api/settings/email` - Save email notification settings
- `/api/settings/test-email` - Send test email notification
- `/api/manual-tasks` - Manual task management (CRUD)

## Prioritized Backlog

### P0 (Critical) - COMPLETED ✅
- [x] All core features implemented
- [x] Interactive egg status feature
- [x] Email notification configuration
- [x] Bird genealogy/family tree visualization
- [x] Breeding statistics and reports
- [x] Data export (CSV/PDF)
- [x] Search functionality in genealogy page
- [x] Multi-language support (PT/EN/ES)
- [x] Monthly breeding trends chart
- [x] Update newborn's gender
- [x] Season/Year management
- [x] Printable breeding cards
- [x] Year-over-year comparison
- [x] Complete all translations (toast messages, table headers, form labels)
- [x] IIS deployment documentation
- [x] **Per-Season Data Isolation** (zones, cages, pairs, clutches isolated per season)

### P1 (High Priority)
- [ ] Import birds from previous seasons (UI to select birds from other seasons)
- [ ] Bird photo attachments
- [ ] Advanced analytics dashboard

### P2 (Medium Priority)
- [x] Multiple user support with authentication ✅ IMPLEMENTED
- [ ] Mobile app version
- [x] Data backup/restore functionality ✅ IMPLEMENTED

## Documentation Files
- `/app/docs/IIS_INSTALLATION_GUIDE.md` - Complete IIS deployment guide with Reverse Proxy configuration
- `/app/frontend/public/web.config` - IIS configuration file for React SPA + API proxy

## Next Tasks
1. Import birds from previous seasons (UI feature)
2. Bird photo attachments
3. Consider mobile app version

## Technical Notes
- **Email Notifications**: Configured and working with Gmail App Password
- **Genealogy**: Birds can now have parents assigned, enabling family tree visualization
- **Exports**: Birds and breeding reports can be exported to CSV or PDF from the Reports page
- **Seasons**: Data can be organized by breeding season/year with STRICT ISOLATION
- **Season Data Isolation**: Zones, Cages, Pairs, Clutches filtered by active season_id. Birds are GLOBAL.
- **Print Cards**: Generate print-friendly cards for cage identification
- **IIS Deployment**: Full documentation available for Windows Server deployment

## Database Schema

### seasons
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "year": 2025,
  "name": "Breeding Season 2025",
  "start_date": "2025-01-01",
  "end_date": "2025-12-31",
  "is_active": true,
  "notes": "string",
  "created_at": "datetime"
}
```

### zones
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "season_id": "uuid",
  "name": "string",
  "rows": 4,
  "columns": 4,
  "created_at": "datetime"
}
```

### cages
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "season_id": "uuid",
  "zone_id": "uuid",
  "row": 1,
  "column": 1,
  "label": "string",
  "created_at": "datetime"
}
```

### birds (GLOBAL - not filtered by season)
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "band_number": "string",
  "band_year": 2025,
  "gender": "male|female|unknown",
  "species": "Canary",
  "stam": "string",
  "class_id": "string",
  "parent_male_id": "uuid",
  "parent_female_id": "uuid",
  "birth_date": "date",
  "notes": "string",
  "created_at": "datetime"
}
```

### pairs (filtered by season_id)
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "season_id": "uuid",
  "name": "string",
  "cage_id": "uuid",
  "male_id": "uuid",
  "female_id": "uuid",
  "paired_date": "date",
  "is_active": true,
  "notes": "string",
  "created_at": "datetime"
}
```

### clutches (filtered by season_id)
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "season_id": "uuid",
  "pair_id": "uuid",
  "start_date": "date",
  "status": "laying|incubating|hatching|weaning|completed",
  "incubation_start": "date",
  "expected_hatch_date": "date",
  "expected_band_date": "date",
  "expected_wean_date": "date",
  "eggs": [
    {
      "id": "uuid",
      "laid_date": "date",
      "status": "fresh|fertile|infertile|hatched|dead",
      "hatched_date": "date",
      "band_number": "string",
      "banded_date": "date"
    }
  ],
  "notes": "string",
  "created_at": "datetime"
}
```

## Test Reports
- `/app/test_reports/iteration_1.json`
- `/app/test_reports/iteration_2.json`
- `/app/test_reports/iteration_4.json` - Season Management, Print Cards, Year Comparison tests (100% passed)
- `/app/test_reports/iteration_5.json` - Tasks bug fix, Settings menu position, Backup/Restore (100% passed)
- `/app/test_reports/iteration_6.json` - Per-Season Data Isolation tests (100% passed - 16/16 backend tests)

## Recent Changes (December 2025)
- ✅ **Per-Season Data Isolation** - Zones, Cages, Pairs, Clutches now strictly isolated per season
  - Added season_id to Clutch model
  - Updated create_pair, create_clutch endpoints to use active season_id
  - Updated get_pairs, get_clutches, get_zones, get_cages endpoints with strict season filtering
  - Updated dashboard stats to reflect active season data
  - Birds remain GLOBAL (accessible across all seasons)
  - Test file: /app/backend/tests/test_season_data_isolation.py
- ✅ Fixed Tasks page bug - completing one task no longer removes all tasks
- ✅ Moved Settings menu to bottom of sidebar with visual separator
- ✅ Implemented Backup & Restore functionality in Settings page
