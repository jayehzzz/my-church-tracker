# 📖 My Church Tracker - Documentation Hub

> **A comprehensive documentation suite for the My Church Tracker application.**

---

## 🎯 What is My Church Tracker?

**My Church Tracker** is a modern, data-driven church management dashboard designed to help church leaders visualize and manage their community data. Built with SvelteKit and powered by Convex backend, it provides real-time insights into every aspect of church life.

### Core Capabilities

| Module | Purpose |
|--------|---------|
| **People** | Manage all individuals - members, visitors, leaders, and contacts |
| **Services** | Track church services, attendance, and spiritual decisions |
| **Evangelism** | Monitor outreach efforts, new contacts, and conversions |
| **Meetings** | Record prayer meetings, cell groups, and gatherings |
| **Visitation** | Log home visits and pastoral care activities |
| **Reports** | Generate insights and export data |

---

## 📚 Documentation Index

### Core Documentation

| Document | Description |
|----------|-------------|
| [**Design Philosophy**](./00-design-philosophy.md) | The 5 pillars guiding all UI/UX decisions |
| [**Application Overview**](./01-overview.md) | High-level understanding of the app, its purpose, and key concepts |
| [**Data Model**](./02-data-model.md) | Complete guide to all database tables, fields, and relationships |
| [**Backend Functions**](./03-backend-functions.md) | All Convex backend operations and what they do |
| [**Frontend Services**](./04-frontend-services.md) | Service layer that connects UI to backend |
| [**State Management**](./05-state-management.md) | Stores and global state handling |

### Components Documentation

| Document | Description |
|----------|-------------|
| [**UI Components**](./06-ui-components.md) | Core reusable UI elements (buttons, cards, tables, etc.) |
| [**Chart Components**](./07-chart-components.md) | All data visualization components |
| [**Form Components**](./08-form-components.md) | Data input forms and their fields |
| [**Layout Components**](./09-layout-components.md) | Page structure and navigation components |

### Pages Documentation

| Document | Description |
|----------|-------------|
| [**Application Pages**](./10-pages.md) | All routes/pages and what each one displays |
| [**User Workflows**](./11-workflows.md) | Step-by-step guides for common tasks |

### Reference

| Document | Description |
|----------|-------------|
| [**Utilities Reference**](./12-utilities.md) | Helper functions, date utilities, validation |
| [**Filter System**](./13-filter-system.md) | How the global filtering system works |
| [**Glossary**](./14-glossary.md) | Key terms and concepts explained |

---

## 🗺️ Project Structure at a Glance

```
my-church-tracker/
├── convex/                 # Backend database & API
│   ├── schema.ts          # Database structure
│   ├── people.ts          # People operations
│   ├── services.ts        # Services operations
│   ├── attendance.ts      # Attendance tracking
│   ├── evangelism.ts      # Outreach operations
│   ├── meetings.ts        # Meetings operations
│   ├── visitations.ts     # Visitation operations
│   └── seed.ts            # Test data generator
│
├── src/
│   ├── lib/
│   │   ├── components/    # Reusable UI components
│   │   │   ├── charts/    # Data visualizations
│   │   │   ├── dashboard/ # Dashboard widgets
│   │   │   ├── filters/   # Filter controls
│   │   │   ├── forms/     # Data entry forms
│   │   │   ├── layout/    # Page structure
│   │   │   ├── map/       # Geographic map
│   │   │   └── ui/        # Core UI elements
│   │   │
│   │   ├── services/      # Data fetching layer
│   │   ├── stores/        # Global state
│   │   ├── utils/         # Helper functions
│   │   └── data/          # Mock/sample data
│   │
│   └── routes/            # Application pages
│       ├── +page.svelte   # Dashboard home
│       ├── people/        # People directory
│       ├── services/      # Services tracking
│       ├── evangelism/    # Outreach tracking
│       ├── meetings/      # Meetings tracking
│       ├── visitation/    # Visitation tracking
│       └── reports/       # Reports & exports
│
├── docs/                   # This documentation
└── specs/                  # Original design specs
```

---

## 🔑 Key Concepts

### The People Lifecycle

People in the system follow a natural progression:

```
Contact → Guest → Member → Leader
                    ↓
                 Archived
```

- **Contact**: Someone reached through evangelism, not yet visited the church
- **Guest**: Someone who has visited but isn't a regular member
- **Member**: Regular church member
- **Leader**: Member with leadership responsibilities
- **Archived**: Inactive/former member

### Activity Status

Members can also have an activity status:

- **Regular**: Consistently attends and participates
- **Irregular**: Attends sometimes but not consistently
- **Dormant**: Has stopped attending (may need outreach)

### Global Time Filtering

Almost all data views in the application respect a global time filter. Users can view data for:
- This Month / This Year / This Quarter
- Last 30 Days / Last 3/6/12 Months
- Specific Year / Month / Quarter
- Custom Date Range

---

## 🚀 Quick Start for Developers

1. **Understanding the data flow**:
   - Pages (`/routes`) display data
   - Components (`/lib/components`) handle UI
   - Services (`/lib/services`) fetch data
   - Convex (`/convex`) manages the database

2. **Common tasks**:
   - Adding a new data field → Start with `convex/schema.ts`
   - Adding a new page → Create in `/src/routes`
   - Adding a new chart → Create in `/lib/components/charts`
   - Modifying forms → Edit `/lib/components/forms`

3. **Key files to understand**:
   - `convex/schema.ts` - Database structure
   - `src/lib/stores/filterStore.js` - Global filtering
   - `src/lib/utils/dataService.js` - Data processing

---

## 📝 How to Use This Documentation

1. **New to the project?** Start with [Application Overview](./01-overview.md)
2. **Working with data?** Read [Data Model](./02-data-model.md) and [Backend Functions](./03-backend-functions.md)
3. **Building UI?** Check [UI Components](./06-ui-components.md) and [Chart Components](./07-chart-components.md)
4. **Adding features?** Review [User Workflows](./11-workflows.md) to understand existing patterns

---

*This documentation is maintained to help both humans and AI agents understand the My Church Tracker application.*
