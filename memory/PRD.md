# Canary Breeding Control - PRD

## Original Problem Statement
Build a canary breeding control/management web application with a local database, similar to "Orniplus" app. Features include: configuring aviaries/cages in zones/modules, managing breeding pairs, tracking egg-laying and incubation, managing hatching and banding schedules, viewing tasks, contact management, calendar functionality, season management, printable breeding cards, and multi-language support.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn/UI components
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (via Motor async driver)
- **Theme**: Dark Navy (#1A2035) with accent colors (Yellow #FFC300, Teal #00BFA6, Pink #E91E63, Orange #FF9800)

## User Personas
1. **Hobby Breeder**: Manages 10-50 pairs, needs simple tracking
2. **Professional Breeder**: Manages 50+ pairs, needs comprehensive analytics
3. **Breeding Club Member**: Shares contacts and breeding data with community

## Core Requirements (Static)
- Zone/Cage configuration with visual grid layout
- Bird registry with band numbers, colors, genealogy
- Breeding pair management with cage assignment
- Clutch tracking (laying → incubating → hatching → weaning)
- Egg status tracking (fresh, fertile, infertile, hatched, dead)
- Task dashboard with urgency grouping
- Calendar view for breeding schedule
- Contact directory for other breeders
- Season/Year management for multi-year breeding
- Printable breeding cards
- Multi-language support (Portuguese, English, Spanish)

## What's Been Implemented (December 2025)
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

### P1 (High Priority)
- [ ] Bird photo attachments
- [ ] Advanced analytics dashboard

### P2 (Medium Priority)
- [ ] Multiple user support with authentication
- [ ] Mobile app version
- [ ] Data backup/restore functionality

## Documentation Files
- `/app/docs/IIS_INSTALLATION_GUIDE.md` - Complete IIS deployment guide with Reverse Proxy configuration
- `/app/frontend/public/web.config` - IIS configuration file for React SPA + API proxy

## Next Tasks
1. Bird photo attachments
2. Consider multi-user authentication for shared aviaries

## Technical Notes
- **Email Notifications**: Configured and working with Gmail App Password
- **Genealogy**: Birds can now have parents assigned, enabling family tree visualization
- **Exports**: Birds and breeding reports can be exported to CSV or PDF from the Reports page
- **Seasons**: Data can be organized by breeding season/year
- **Print Cards**: Generate print-friendly cards for cage identification
- **IIS Deployment**: Full documentation available for Windows Server deployment

## Database Schema

### seasons
```json
{
  "id": "uuid",
  "year": 2025,
  "name": "Breeding Season 2025",
  "start_date": "2025-01-01",
  "end_date": "2025-12-31",
  "is_active": true,
  "notes": "string",
  "created_at": "datetime"
}
```

### birds
```json
{
  "id": "uuid",
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

### pairs
```json
{
  "id": "uuid",
  "name": "string",
  "cage_id": "uuid",
  "male_id": "uuid",
  "female_id": "uuid",
  "paired_date": "date",
  "is_active": true,
  "season_id": "uuid",
  "notes": "string",
  "created_at": "datetime"
}
```

### clutches
```json
{
  "id": "uuid",
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
