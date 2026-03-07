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
- ✅ Bird registry with CRUD, search, and gender filter
- ✅ Zones & Cages management with visual grid
- ✅ Breeding pairs management with clutch tracking
- ✅ Egg tracking with visual indicators
- ✅ Status transitions (laying → incubating → hatching)
- ✅ Tasks page grouped by urgency (overdue, today, upcoming)
- ✅ Calendar view with breeding events
- ✅ Contacts directory for breeders
- ✅ Dark navy theme with custom accent colors
- ✅ Mobile-responsive sidebar navigation

## API Endpoints
- `/api/zones` - CRUD for aviary zones
- `/api/zones/{id}/generate-cages` - Auto-generate cage grid
- `/api/cages` - Cage management
- `/api/birds` - Bird registry CRUD
- `/api/pairs` - Breeding pairs CRUD
- `/api/clutches` - Clutch management
- `/api/clutches/{id}/eggs` - Egg tracking
- `/api/contacts` - Breeder contacts CRUD
- `/api/dashboard/stats` - Dashboard statistics
- `/api/dashboard/tasks` - Task list

## Prioritized Backlog
### P0 (Critical)
- [Done] All core features implemented

### P1 (High Priority)
- Bird genealogy tree view
- Breeding history reports
- Export data to CSV/PDF

### P2 (Medium Priority)
- Multiple user support with authentication
- Photo attachments for birds
- Breeding performance analytics
- Mobile app version

## Next Tasks
1. Add genealogy/family tree visualization for birds
2. Implement breeding statistics and reports
3. Add data export functionality (CSV/PDF)
4. Consider multi-user authentication for shared aviaries
