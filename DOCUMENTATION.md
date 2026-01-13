# 📖 My Church Tracker - Documentation

> **📂 For detailed documentation, please see the `docs/` folder.**

## Quick Links

The comprehensive documentation has been organized into multiple detailed files:

| Document | Description |
|----------|-------------|
| [**docs/README.md**](./docs/README.md) | 📚 Documentation Hub - Start here! |
| [**docs/01-overview.md**](./docs/01-overview.md) | Application overview and architecture |
| [**docs/02-data-model.md**](./docs/02-data-model.md) | Database tables and relationships |
| [**docs/03-backend-functions.md**](./docs/03-backend-functions.md) | Convex backend operations |
| [**docs/04-frontend-services.md**](./docs/04-frontend-services.md) | Service layer API |
| [**docs/05-state-management.md**](./docs/05-state-management.md) | Svelte stores |
| [**docs/06-ui-components.md**](./docs/06-ui-components.md) | Core UI elements |
| [**docs/07-chart-components.md**](./docs/07-chart-components.md) | Data visualization |
| [**docs/08-form-components.md**](./docs/08-form-components.md) | Data entry forms |
| [**docs/09-layout-components.md**](./docs/09-layout-components.md) | Page structure |
| [**docs/10-pages.md**](./docs/10-pages.md) | Application pages |
| [**docs/11-workflows.md**](./docs/11-workflows.md) | Step-by-step guides |
| [**docs/12-utilities.md**](./docs/12-utilities.md) | Helper functions |
| [**docs/13-filter-system.md**](./docs/13-filter-system.md) | Date filtering |
| [**docs/14-glossary.md**](./docs/14-glossary.md) | Terms and concepts |

---

## What is My Church Tracker?

**My Church Tracker** is a modern church management dashboard that helps leaders:

- 👥 **Manage People** - Track members, visitors, leaders, and contacts
- ⛪ **Track Services** - Record attendance and spiritual decisions
- 🌱 **Monitor Evangelism** - Measure outreach effectiveness
- 🙏 **Log Meetings** - Track prayer meetings and gatherings
- 🏠 **Plan Visitations** - Coordinate pastoral care visits
- 📊 **Analyze Data** - Visualize trends and generate reports

---

## 🎯 Application Overview

**My Church Tracker** is a modern church management dashboard designed to help church leaders visualize and manage their community data. The application tracks:

- **People** (Members, Visitors, Leaders, Contacts)
- **Church Services** (Sunday services, special services)
- **Evangelism/Outreach** (New contacts, follow-ups, conversions)
- **Meetings** (Prayer meetings, cell groups, various gatherings)
- **Visitations** (Home visits, pastoral care)
- **Attendance** (Who attended what events)

The application provides real-time insights through interactive charts, data tables, and a map view to help leaders make data-driven decisions about their ministry.

---

## 📂 Project Structure Overview

```
my-church-tracker/
├── convex/              → Backend database logic (Convex serverless)
├── specs/               → Design specifications and requirements
├── src/
│   ├── lib/
│   │   ├── components/  → Reusable UI components
│   │   ├── data/        → Mock/sample data
│   │   ├── services/    → Data fetching layer
│   │   ├── stores/      → Global state management
│   │   └── utils/       → Helper functions
│   └── routes/          → Application pages
└── static/              → Static assets (favicon, etc.)
```

---

## 🗃️ Backend (Convex Database)

### `convex/schema.ts`
**Purpose**: Defines the complete database structure for the application.

**What it manages**:
- **People Table**: Stores all individuals in the church system - members, visitors, leaders, and evangelism contacts. Each person has identity info (name, email, phone, address), geolocation for mapping, member status (guest/member/leader/archived), role assignments, activity status (regular/irregular/dormant), and spiritual journey milestones (first visit, membership date, baptism, tithing).
  
- **Services Table**: Records church services with date, type (Sunday service, special service), location, sermon details, and aggregate attendance metrics (total attendance, guests count, salvation decisions).

- **Attendance Table**: Links people to services they attended, tracking individual metrics like salvation decisions, tithing, and first-timer status.

- **Meetings Table**: Stores prayer meetings, cell group gatherings, and other church meetings with date, type (bacenta, flow prayer, all-night prayer, basonta, SAT, Farley prayer), timing, location, and attendance counts.

- **Meeting Attendance Table**: Links people to meetings with rich metadata about their attendance (late arrival, early departure, etc.).

- **Visitations Table**: Records home visits to church members, tracking who was visited, who did the visiting, visit date, outcome, and follow-up requirements.

- **Activities Table**: General activity log for tracking various church activities.

---

### `convex/people.ts`
**Purpose**: Server-side logic for managing people in the database.

**What it does**:
- Retrieves all people or filters by member status (guest, member, leader, archived)
- Fetches individual person profiles by ID
- Creates new person records
- Updates existing person information
- Deletes person records
- Searches people by name

---

### `convex/services.ts`
**Purpose**: Server-side logic for managing church services.

**What it does**:
- Retrieves all services or filters by date range
- Fetches individual service details
- Creates new service records with attendance metrics
- Updates existing service information
- Deletes services

---

### `convex/attendance.ts`
**Purpose**: Server-side logic for tracking attendance.

**What it does**:
- Records individual attendance for services
- Retrieves attendance by service (who came to a specific service)
- Retrieves attendance by person (all services a person attended)
- Bulk creates attendance records
- Syncs attendance data between frontend and database

---

### `convex/evangelism.ts`
**Purpose**: Server-side logic for evangelism/outreach tracking.

**What it does**:
- Manages evangelism contacts (people reached through outreach)
- Filters contacts by response category (responsive, non-responsive, events only, do not contact, has church)
- Tracks contacts requiring follow-up
- Manages conversion process (marking contacts as converted and adding them to the people database)
- Filters contacts by date range
- Retrieves contacts by inviter (who brought who)

---

### `convex/meetings.ts`
**Purpose**: Server-side logic for prayer meetings and group gatherings.

**What it does**:
- Manages all types of church meetings (prayer, cell groups, etc.)
- Filters meetings by type or date range
- Tracks meeting attendees
- Records meeting duration, location, and leadership

---

### `convex/visitations.ts`
**Purpose**: Server-side logic for home visitation tracking.

**What it does**:
- Records pastoral care visits
- Filters visitations by person (all visits to a specific individual)
- Tracks follow-up requirements and scheduled follow-up dates
- Filters visitations by date range
- Records visit outcomes (welcomed/encouraged, prayer request received, not home, etc.)

---

### `convex/seed.ts`
**Purpose**: Populates the database with sample/test data.

**What it does**:
- Creates realistic mock data for testing and demonstration
- Generates sample people, services, attendance records, meetings, visitations, and evangelism contacts
- Covers dates across 2025 and 2026 for comprehensive testing
- Used during development to test features without real data

---

## 🖥️ Frontend Services Layer

Each service file connects the frontend to the Convex backend, providing a clean API for data operations.

### `src/lib/services/peopleService.js`
**Purpose**: Frontend interface for people data operations.

**What it provides**:
- `getAll()` - Fetches all people
- `getById(id)` - Fetches a specific person's profile
- `create(personData)` - Creates a new person
- `update(id, personData)` - Updates person information
- `remove(id)` - Deletes a person
- `getByStatus(status)` - Filters people by member status
- `search(searchTerm)` - Searches people by name

---

### `src/lib/services/servicesService.js`
**Purpose**: Frontend interface for church service data.

**What it provides**:
- `getAll()` - Fetches all church services
- `getById(id)` - Fetches specific service details
- `create(serviceData)` - Creates a new service record
- `update(id, serviceData)` - Updates service information
- `remove(id)` - Deletes a service
- `getByDateRange(startDate, endDate)` - Filters services by date

---

### `src/lib/services/attendanceService.js`
**Purpose**: Frontend interface for attendance tracking.

**What it provides**:
- `getAll()` - Fetches all attendance records
- `getByService(serviceId)` - Gets attendees for a specific service
- `getByPerson(personId)` - Gets all services a person attended
- `create(attendanceData)` - Records attendance
- `bulkCreate(records)` - Records multiple attendance entries at once
- `syncAttendance(serviceId, personIds)` - Syncs attendance data

---

### `src/lib/services/evangelismService.js`
**Purpose**: Frontend interface for evangelism/outreach tracking.

**What it provides**:
- `getAll()` - Fetches all evangelism contacts
- `getById(id)` - Fetches specific contact details
- `create(contactData)` - Creates a new contact record
- `update(id, contactData)` - Updates contact information
- `remove(id)` - Deletes a contact
- `getByResponse(response)` - Filters by response category
- `getRequiringFollowUp()` - Gets contacts needing follow-up
- `getConverted()` - Gets contacts who have been converted
- `getByDateRange(startDate, endDate)` - Filters by date
- `markAsConverted(id, addToPeople)` - Marks contact as converted
- `getByInviter(personId)` - Gets contacts invited by a specific person

---

### `src/lib/services/meetingsService.js`
**Purpose**: Frontend interface for meetings data.

**What it provides**:
- `getAll()` - Fetches all meetings
- `getById(id)` - Fetches specific meeting details
- `create(meetingData)` - Creates a new meeting
- `update(id, meetingData)` - Updates meeting information
- `remove(id)` - Deletes a meeting
- `getByType(meetingType)` - Filters by meeting type
- `getByDateRange(startDate, endDate)` - Filters by date
- `addAttendee(meetingId, personId)` - Adds attendee to meeting
- `getAttendees(meetingId)` - Gets meeting attendees

---

### `src/lib/services/visitationsService.js`
**Purpose**: Frontend interface for visitation tracking.

**What it provides**:
- `getAll()` - Fetches all visitations
- `getById(id)` - Fetches specific visitation details
- `create(visitationData)` - Creates a new visitation record
- `update(id, visitationData)` - Updates visitation information
- `remove(id)` - Deletes a visitation
- `getByPerson(personId)` - Gets all visits to a person
- `getRequiringFollowUp()` - Gets visitations needing follow-up
- `getByDateRange(startDate, endDate)` - Filters by date

---

### `src/lib/services/activitiesService.js`
**Purpose**: Frontend interface for activity logging.

**What it provides**:
- `getAll()` - Fetches all activities
- `getById(id)` - Fetches specific activity
- `create(activityData)` - Creates a new activity
- `getByType(activityType)` - Filters by activity type
- `getByDateRange(startDate, endDate)` - Filters by date
- `getRecent(limit)` - Gets most recent activities

---

### `src/lib/services/storageService.js`
**Purpose**: Handles file storage operations.

**What it does**:
- Manages file uploads (e.g., profile photos, service photos)
- Handles file retrieval and deletion

---

## 🏪 State Management (Stores)

### `src/lib/stores/filterStore.js`
**Purpose**: Manages the global date/time filtering system used throughout the application.

**What it does**:
- Provides preset time filters (This Year, This Month, Last 30 Days, This Quarter)
- Provides relative filters (Last Month, Last 3/6/12 Months)
- Allows specific date selection (Year, Month, Quarter, Custom Range)
- Persists filter state to local storage
- Syncs filter state to URL parameters for shareable links
- Provides a derived store that calculates actual date ranges

---

### `src/lib/stores/navigationStore.js`
**Purpose**: Manages navigation state and sidebar behavior.

**What it does**:
- Tracks current active page/route
- Controls sidebar expanded/collapsed state
- Manages mobile navigation behavior

---

### `src/lib/stores/searchStore.js`
**Purpose**: Manages global search functionality.

**What it does**:
- Stores the current search query
- Manages search results across different data types
- Controls search UI state (open/closed, loading)

---

## 🛠️ Utility Functions

### `src/lib/utils/dataService.js`
**Purpose**: Central data processing and aggregation utilities.

**What it does**:
- Filters data based on selected date range
- Aggregates data for dashboard metrics
- Calculates KPIs (Key Performance Indicators)
- Processes data for chart visualizations
- Handles data transformation between formats

---

### `src/lib/utils/dateUtils.js`
**Purpose**: Date manipulation and formatting utilities.

**What it does**:
- Converts filter state to actual date ranges (start/end dates)
- Formats dates for display
- Calculates relative dates (30 days ago, last quarter, etc.)
- Handles quarter calculations
- Generates date labels for charts

---

### `src/lib/utils/exportUtils.js`
**Purpose**: Data export functionality.

**What it does**:
- Exports data tables to CSV format
- Exports data to Excel format
- Formats data for printing
- Handles file download triggering

---

### `src/lib/utils/validation.js`
**Purpose**: Form validation utilities.

**What it does**:
- Validates required fields
- Validates email formats
- Validates phone number formats
- Validates date formats
- Provides error messages for invalid inputs

---

## 📊 UI Components - Charts

### `src/lib/components/charts/AttendanceTrend.svelte`
**Purpose**: Displays attendance over time as a trend line chart.

**What it shows**: Weekly or monthly attendance numbers with trend visualization to identify growth or decline patterns.

---

### `src/lib/components/charts/CategoryDonut.svelte`
**Purpose**: Displays category distribution as a donut/pie chart.

**What it shows**: Visual breakdown of data categories (e.g., member status distribution, response categories).

---

### `src/lib/components/charts/ContactsByMonthTimeline.svelte`
**Purpose**: Shows evangelism contacts over time.

**What it shows**: Monthly timeline of new contacts made through outreach efforts.

---

### `src/lib/components/charts/ConversionFunnel.svelte`
**Purpose**: Displays the conversion journey as a funnel chart.

**What it shows**: How contacts progress from initial contact → follow-up → first visit → member.

---

### `src/lib/components/charts/GrowthTimeline.svelte`
**Purpose**: Shows membership growth over time.

**What it shows**: Historical timeline of church membership with milestones and growth rate.

---

### `src/lib/components/charts/InviterBarChart.svelte`
**Purpose**: Shows which members invite the most people.

**What it shows**: Bar chart ranking members by number of people they've invited.

---

### `src/lib/components/charts/LeaderHeatmap.svelte`
**Purpose**: Displays leader activity as a heatmap.

**What it shows**: Visual heatmap showing when leaders are most active (by day/time).

---

### `src/lib/components/charts/MonthlyContactsBar.svelte`
**Purpose**: Shows monthly contact statistics.

**What it shows**: Bar chart of contacts made each month for comparison.

---

### `src/lib/components/charts/PrayerHoursChart.svelte`
**Purpose**: Tracks prayer meeting participation.

**What it shows**: Total prayer hours logged across different meeting types.

---

### `src/lib/components/charts/RoleDistribution.svelte`
**Purpose**: Shows distribution of roles in the church.

**What it shows**: Pie or donut chart showing breakdown of roles (leaders, workers, members).

---

### `src/lib/components/charts/SalvationTimeline.svelte`
**Purpose**: Tracks salvation decisions over time.

**What it shows**: Timeline of salvation decisions made during services or outreach.

---

### `src/lib/components/charts/Sparkline.svelte`
**Purpose**: Small inline trend indicator.

**What it shows**: Miniature trend line used in KPI cards to show quick trend direction.

---

### `src/lib/components/charts/VisitationCalendar.svelte`
**Purpose**: Calendar view of visitations.

**What it shows**: Monthly calendar highlighting days when visitations occurred.

---

## 📊 UI Components - Dashboard

### `src/lib/components/dashboard/AttendanceChart.svelte`
**Purpose**: Main dashboard attendance visualization.

**What it shows**: Comprehensive attendance chart with multiple view options (weekly, monthly, by service type).

---

### `src/lib/components/dashboard/InviterProfilePopup.svelte`
**Purpose**: Quick view popup for inviter details.

**What it shows**: Popup showing inviter's profile, their invitees, and success rate.

---

### `src/lib/components/dashboard/KPICard.svelte`
**Purpose**: Key Performance Indicator display card.

**What it shows**: Single metric with value, change indicator (up/down), and optional sparkline.

---

### `src/lib/components/dashboard/RecentActivityList.svelte`
**Purpose**: Shows recent activities feed.

**What it shows**: Chronological list of recent activities across all modules (new members, visits, meetings, etc.).

---

## 🔍 UI Components - Filters

### `src/lib/components/filters/DateRangePicker.svelte`
**Purpose**: Custom date range selection.

**What it does**: Allows users to select custom start and end dates for filtering data.

---

### `src/lib/components/filters/FilterBar.svelte`
**Purpose**: Main filter controls bar.

**What it does**: Contains all filter controls in a unified bar at the top of pages.

---

### `src/lib/components/filters/PeriodSelect.svelte`
**Purpose**: Time period dropdown selector.

**What it does**: Dropdown menu for selecting predefined time periods (This Month, This Year, etc.)

---

## 📝 UI Components - Forms

### `src/lib/components/forms/PersonForm.svelte`
**Purpose**: Form for adding/editing people.

**What it captures**:
- Personal info (name, email, phone, address)
- Member status and role
- Spiritual journey dates
- Baptism and tithing status

---

### `src/lib/components/forms/ServiceForm.svelte`
**Purpose**: Form for adding/editing church services.

**What it captures**:
- Service date and type
- Service time and location
- Sermon topic and speaker
- Attendance metrics (total, guests, salvations, tithers)
- Individual attendee selection

---

### `src/lib/components/forms/EvangelismContactForm.svelte`
**Purpose**: Form for adding/editing evangelism contacts.

**What it captures**:
- Contact's personal information
- Date of initial contact
- Response category
- Who invited them
- Follow-up requirements
- Conversion status

---

### `src/lib/components/forms/MeetingForm.svelte`
**Purpose**: Form for adding/editing meetings.

**What it captures**:
- Meeting date and type
- Start/end times and duration
- Location
- Attendance count and leader count
- Meeting notes

---

### `src/lib/components/forms/VisitationForm.svelte`
**Purpose**: Form for adding/editing visitations.

**What it captures**:
- Person being visited
- Visitor name
- Visit date
- Outcome of the visit
- Follow-up requirements and date
- Visit notes

---

## 🏗️ UI Components - Layout

### `src/lib/components/layout/DashboardLayout.svelte`
**Purpose**: Main application layout wrapper.

**What it does**: Provides the overall page structure with sidebar and content area.

---

### `src/lib/components/layout/Sidebar.svelte`
**Purpose**: Navigation sidebar.

**What it does**:
- Displays navigation links to all main sections
- Shows collapsed/expanded states
- Highlights current active page
- Contains church logo/branding

---

### `src/lib/components/layout/TopNav.svelte`
**Purpose**: Top navigation bar.

**What it does**:
- Shows current page title
- Contains global search
- Shows notifications
- Contains quick action buttons

---

### `src/lib/components/layout/GlobalSearch.svelte`
**Purpose**: Global search functionality.

**What it does**:
- Searches across all data types (people, services, meetings, etc.)
- Shows real-time search results
- Allows quick navigation to search results

---

## 🗺️ UI Components - Map

### `src/lib/components/map/LeafletMap.svelte`
**Purpose**: Interactive map for visualizing people locations.

**What it does**:
- Displays pins for church members and contacts based on their addresses
- Shows the church location
- Allows filtering by member status, role, and activity
- Supports zoom and pan controls
- Used for visitation planning and understanding community geography

---

## 👥 UI Components - People

### `src/lib/components/people/ProfileQuickViewCard.svelte`
**Purpose**: Compact person profile preview.

**What it shows**: Quick glance at a person's key information used in lists and popups.

---

## 🧩 UI Components - Shared

### `src/lib/components/shared/PageHeader.svelte`
**Purpose**: Standard page header component.

**What it does**: Provides consistent page titles and optional action buttons across all pages.

---

## 🎨 UI Components - Core UI Elements

### `src/lib/components/ui/Badge.svelte`
**Purpose**: Small status indicator labels.

**What it does**: Displays colored badges for statuses like "Active", "Pending", "Archived".

---

### `src/lib/components/ui/Button.svelte`
**Purpose**: Styled button component.

**What it does**: Provides consistent button styling with variants (primary, secondary, danger, etc.).

---

### `src/lib/components/ui/Card.svelte`
**Purpose**: Content container card.

**What it does**: Provides consistent card styling for content sections.

---

### `src/lib/components/ui/ColumnFilterDropdown.svelte`
**Purpose**: Table column visibility control.

**What it does**: Dropdown to show/hide specific columns in data tables.

---

### `src/lib/components/ui/CopyButton.svelte`
**Purpose**: Copy to clipboard button.

**What it does**: Copies specified text to clipboard with visual feedback.

---

### `src/lib/components/ui/CopyDropdown.svelte`
**Purpose**: Copy options dropdown.

**What it does**: Provides multiple copy format options (plain text, formatted, etc.).

---

### `src/lib/components/ui/DataTable.svelte`
**Purpose**: Full-featured data table component.

**What it does**:
- Displays data in sortable, filterable tables
- Supports pagination
- Supports row selection
- Supports column resizing
- Supports export functionality
- Used throughout the application for lists

---

### `src/lib/components/ui/FullscreenWrapper.svelte`
**Purpose**: Fullscreen mode wrapper.

**What it does**: Allows components (like charts) to be viewed in fullscreen mode.

---

### `src/lib/components/ui/InfoRow.svelte`
**Purpose**: Label-value display row.

**What it does**: Displays information in a consistent label: value format.

---

### `src/lib/components/ui/Input.svelte`
**Purpose**: Styled text input.

**What it does**: Provides consistent text input styling with validation states.

---

### `src/lib/components/ui/Modal.svelte`
**Purpose**: Popup modal dialog.

**What it does**: Displays content in an overlay modal with close functionality.

---

### `src/lib/components/ui/Motion.svelte`
**Purpose**: Animation wrapper component.

**What it does**: Provides smooth entrance/exit animations for content.

---

### `src/lib/components/ui/Select.svelte`
**Purpose**: Styled dropdown select.

**What it does**: Provides consistent dropdown select styling.

---

## 📄 Application Pages (Routes)

### `src/routes/+layout.svelte`
**Purpose**: Root application layout.

**What it does**:
- Wraps all pages with the dashboard layout
- Initializes global stores
- Provides sidebar and top navigation to all pages

---

### `src/routes/+page.svelte` (Home/Dashboard)
**Purpose**: Main dashboard home page.

**What it shows**:
- Overview KPIs (total members, attendance trends, salvations, etc.)
- Recent activity feed
- Quick action buttons
- Summary charts

---

### `src/routes/people/+page.svelte`
**Purpose**: People directory listing.

**What it shows**:
- Searchable, filterable table of all people
- Quick filters by status (Members, Guests, Leaders, Archived)
- Links to individual profiles
- Add new person button

---

### `src/routes/people/PeopleDashboard.svelte`
**Purpose**: People analytics dashboard.

**What it shows**:
- Member statistics and growth charts
- Role distribution
- Activity status breakdown
- Demographic insights

---

### `src/routes/people/[id]/+page.svelte`
**Purpose**: Individual person profile page.

**What it shows**:
- Complete person profile with all details
- Attendance history
- Visitation history
- Evangelism connections (who they invited, who invited them)
- Status management (promote to member, promote to leader, archive)
- Edit functionality

---

### `src/routes/people/map/+page.svelte`
**Purpose**: People map view.

**What it shows**:
- Interactive map with all people plotted by address
- Filtering options
- Church location marked
- Useful for visitation planning

---

### `src/routes/services/+page.svelte`
**Purpose**: Church services management page.

**What it shows**:
- List of all church services
- Attendance trends and charts
- Service type distribution
- Individual service details
- Add/edit service functionality
- Salvation decisions tracking

---

### `src/routes/evangelism/+page.svelte`
**Purpose**: Evangelism/outreach management page.

**What it shows**:
- All evangelism contacts
- Contacts by response category
- Conversion funnel visualization
- Top inviters leaderboard
- Follow-up management
- Add/edit contact functionality
- Mark as converted functionality

---

### `src/routes/meetings/+page.svelte`
**Purpose**: Prayer meetings and gatherings management page.

**What it shows**:
- All meetings by type
- Prayer hours tracking
- Meeting attendance trends
- Leader heatmap
- Add/edit meeting functionality

---

### `src/routes/visitation/+page.svelte`
**Purpose**: Home visitation management page.

**What it shows**:
- All visitation records
- Visitation calendar view
- Follow-up requirements
- Outcome tracking
- Add/edit visitation functionality

---

### `src/routes/reports/+page.svelte`
**Purpose**: Reports and analytics page.

**What it shows**:
- Comprehensive reports across all modules
- Export functionality
- Custom date range analysis
- Comparative metrics

---

## 📚 Data Files

### `src/lib/data/mockData.js`
**Purpose**: Sample data for development and testing.

**What it contains**:
- Sample people records
- Sample services
- Sample meetings
- Sample visitations
- Sample evangelism contacts
- Used when the Convex backend is not available or for testing

---

### `src/lib/data/mockPeopleWithLocation.js`
**Purpose**: Sample people data with geographic coordinates.

**What it contains**: Sample people with lat/lng coordinates for map testing.

---

## ⚙️ Configuration Files

### `package.json`
**Purpose**: Project dependencies and scripts.

**What it defines**:
- Project name and version
- Dependencies (SvelteKit, Convex, Tailwind, etc.)
- Development scripts (`npm run dev`, `npm run build`)

---

### `svelte.config.js`
**Purpose**: SvelteKit framework configuration.

**What it configures**: Build settings, adapters, and preprocessing options.

---

### `tailwind.config.js`
**Purpose**: Tailwind CSS styling configuration.

**What it configures**: Custom colors, fonts, spacing, and design tokens used throughout the app.

---

### `vite.config.js`
**Purpose**: Vite build tool configuration.

**What it configures**: Build optimization, development server settings, and plugins.

---

### `vercel.json`
**Purpose**: Vercel deployment configuration.

**What it configures**: Build settings and output configuration for Vercel hosting.

---

## 📁 Specifications (specs/)

The `specs/` folder contains detailed design and implementation specifications that guided the development of this application.

### `specs/01_Overview/`
- `Part 1 Church-Dashboard-Brief.md` - High-level project brief and goals
- `Part 1.1 Dashboard-Visual-Reference.md` - Visual design reference

### `specs/02_Design_System/`
- `Part 2 church-dashboard-spec.md` - Detailed design system specifications
- `Part 2.2 design-quick-ref.md` - Quick reference for design tokens

### `specs/03_Filtering_Logic/`
- `Part 2.3 filter-system-spec.md` - Comprehensive filter system specification
- `Part 2.4 filters-integration-guide.md` - How to integrate filters
- `part 1.2 Time-Based-Filtering-Specs.md` - Time-based filtering details
- `part 1.3 FILTERING-QUICK-REFERENCE.md` - Quick reference for filters
- `implementation-plan.md` - Development implementation plan
- `implementation-status.md` - Current implementation status

---

## 🔄 Core User Workflows

### Adding a New Church Member
1. Navigate to **People** page
2. Click **Add Person** button
3. Fill out PersonForm with member details
4. Set member_status to "member"
5. Save - person appears in directory

### Recording a Church Service
1. Navigate to **Services** page
2. Click **Add Service** button
3. Fill out ServiceForm with service details
4. Select attendees from people list
5. Record salvations and other metrics
6. Save - service appears in list with analytics updated

### Tracking Evangelism Contact
1. Navigate to **Evangelism** page
2. Click **Add Contact** button
3. Fill out EvangelismContactForm
4. Record who invited them
5. Set response category
6. Save - contact tracked for follow-up

### Converting a Contact to Member
1. Navigate to **Evangelism** page
2. Find the contact in the list
3. Click **Mark as Converted**
4. Choose to add them to People directory
5. Contact is now a Member with full profile

### Recording a Home Visit
1. Navigate to **Visitation** page
2. Click **Add Visitation** button
3. Select person visited
4. Record visit details and outcome
5. Mark if follow-up required
6. Save - visitation logged and tracked

---

## 🎨 Global Styling

### `src/app.css`
**Purpose**: Global styles and design tokens.

**What it defines**:
- CSS custom properties (variables) for colors, spacing, typography
- Dark theme styling
- Global component styles
- Animation definitions
- Responsive breakpoints

---

## 📝 Notes for Future Development

1. **All data operations** go through the services layer (`src/lib/services/`) which connects to Convex backend (`convex/`)

2. **State management** uses Svelte stores (`src/lib/stores/`) for global state like filters and navigation

3. **Chart components** are located in `src/lib/components/charts/` and are reusable across pages

4. **Form components** in `src/lib/components/forms/` handle all data input with validation

5. **The filter system** is central to the application - most data views respect the global date filter from `filterStore.js`

6. **The people lifecycle** follows: Contact → Guest → Member → Leader (with options for Archived and activity statuses)

---

*This documentation was generated to help both users and AI agents understand the My Church Tracker application structure and functionality.*
