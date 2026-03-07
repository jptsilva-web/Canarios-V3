# Canary Breeding Control - PRD

## Original Problem Statement
Build a canary breeding control/management web application with a local database, similar to "Orniplus" app. Features include: configuring aviaries/cages in zones/modules, managing breeding pairs, tracking egg-laying and incubation, managing hatching and banding schedules, viewing tasks, contact management, and calendar functionality.

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

## What's Been Implemented (March 2026)
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
- ✅ **Data Export** - Export birds and breeding reports to CSV/PDF
- ✅ **Multi-language Support** - 3 languages with flag selector:
  - 🇵🇹 Português (Portugal) - Full translation
  - 🇬🇧 English
  - 🇪🇸 Español
- ✅ **Auto-create newborn birds** - When eggs are banded, automatically creates bird record with parents linked
- ✅ **Update newborn gender** - Can edit newborn to set gender once determined
- ✅ Dark navy theme with custom accent colors
- ✅ Mobile-responsive sidebar navigation

## API Endpoints
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
- `/api/reports/breeding-stats` - Comprehensive breeding statistics
- `/api/export/birds/csv` - Export birds to CSV
- `/api/export/birds/pdf` - Export birds to PDF
- `/api/export/breeding-report/csv` - Export breeding report to CSV
- `/api/export/breeding-report/pdf` - Export breeding report to PDF
- `/api/settings` - Get all settings (breeding & email)
- `/api/settings/breeding` - Save breeding cycle configuration
- `/api/settings/email` - Save email notification settings
- `/api/settings/test-email` - Send test email notification
- `/api/manual-tasks` - Manual task management (CRUD)

## Prioritized Backlog
### P0 (Critical)
- [Done] All core features implemented
- [Done] Interactive egg status feature
- [Done] Email notification configuration
- [Done] Bird genealogy/family tree visualization
- [Done] Breeding statistics and reports
- [Done] Data export (CSV/PDF)
- [Done] Search functionality in genealogy page
- [Done] Multi-language support (PT/EN/ES)
- [Done] Monthly breeding trends chart
- [Done] Update newborn's gender

### P1 (High Priority)
- Bird photo attachments
- Advanced analytics dashboard
- Print breeding cards/labels

### P2 (Medium Priority)
- Multiple user support with authentication
- Breeding performance year-over-year comparison
- Mobile app version
- Data backup/restore functionality

## Next Tasks
1. Add bird photo attachments
2. Create printable breeding cards
3. Add year-over-year comparison in reports
4. Consider multi-user authentication for shared aviaries

## Notes
- **Email Notifications**: Configured and working with Gmail App Password
- **Genealogy**: Birds can now have parents assigned, enabling family tree visualization
- **Exports**: Birds and breeding reports can be exported to CSV or PDF from the Reports page
