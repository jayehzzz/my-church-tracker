# 🔌 Frontend Services

> **Complete guide to the service layer that connects the UI to the Convex backend.**

---

## Overview

The services layer lives in `src/lib/services/` and provides a clean API for the frontend to interact with the backend. Each service file wraps Convex operations with error handling and data transformation.

### Architecture

```
┌────────────────────────────────────────┐
│         Svelte Components              │
│      (Pages, Forms, Widgets)           │
└──────────────────┬─────────────────────┘
                   │ import { getAll, create } from '...'
                   ↓
┌────────────────────────────────────────┐
│         Service Layer                  │
│   src/lib/services/*Service.js         │
│                                        │
│  - Wraps Convex client calls           │
│  - Handles errors consistently         │
│  - Transforms data formats             │
│  - Provides typed returns              │
└──────────────────┬─────────────────────┘
                   │ ConvexHttpClient
                   ↓
┌────────────────────────────────────────┐
│         Convex Backend                 │
│         convex/*.ts                    │
└────────────────────────────────────────┘
```

### Common Return Format

All service functions return an object with this structure:

```javascript
{
  data: <result> | null,  // The data on success, null on error
  error: null | Error     // null on success, Error object on failure
}
```

This consistent pattern makes error handling predictable across the application.

---

## 📁 Service Files

| File | Purpose |
|------|---------|
| `peopleService.js` | People/member operations |
| `servicesService.js` | Church service operations |
| `attendanceService.js` | Attendance tracking |
| `evangelismService.js` | Evangelism contact operations |
| `meetingsService.js` | Meeting operations |
| `visitationsService.js` | Visitation tracking |
| `activitiesService.js` | Activity log operations |
| `storageService.js` | File upload/download |

---

## 👥 peopleService.js

**Location**: `src/lib/services/peopleService.js`

**Purpose**: Manages all people-related data operations.

### Functions

#### `getAll()`

**Purpose**: Fetches all people from the database.

**Parameters**: None

**Returns**: 
```javascript
{ 
  data: [
    { id, first_name, last_name, member_status, ... },
    ...
  ], 
  error: null 
}
```

**Usage Example**:
```javascript
const { data: people, error } = await getAll();
if (error) {
  console.error('Failed to load people:', error);
} else {
  // Use people array
}
```

**Used by**: 
- People directory page (`/people`)
- Person selection dropdowns
- Global search

---

#### `getById(id)`

**Purpose**: Fetches a single person by their unique ID.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `id` | string | Convex document ID |

**Returns**:
```javascript
{
  data: { id, first_name, last_name, member_status, email, ... },
  error: null
}
```

**Usage Example**:
```javascript
const { data: person, error } = await getById('abc123');
if (person) {
  console.log(`Loaded ${person.first_name} ${person.last_name}`);
}
```

**Used by**:
- Profile page (`/people/[id]`)
- Person quick view popups
- Edit forms

---

#### `create(personData)`

**Purpose**: Creates a new person record.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `personData` | object | Fields for the new person |

**Required fields in personData**:
- `first_name` (string)
- `last_name` (string)  
- `member_status` (string)

**Returns**:
```javascript
{
  data: { id, first_name, last_name, ... },  // Created person with ID
  error: null
}
```

**Usage Example**:
```javascript
const { data: newPerson, error } = await create({
  first_name: 'John',
  last_name: 'Doe',
  member_status: 'guest',
  email: 'john@example.com'
});
```

**Used by**:
- PersonForm component
- Quick add dialogs

---

#### `update(id, personData)`

**Purpose**: Updates an existing person's information.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `id` | string | Person's ID |
| `personData` | object | Fields to update |

**Returns**:
```javascript
{
  data: { id, first_name, ... },  // Updated person
  error: null
}
```

**Usage Example**:
```javascript
const { data: updated, error } = await update('abc123', {
  member_status: 'member',
  membership_date: '2025-01-15'
});
```

**Used by**:
- Profile page edit functionality
- Status change actions
- Promote to leader action

---

#### `remove(id)`

**Purpose**: Deletes a person from the database.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `id` | string | Person's ID to delete |

**Returns**:
```javascript
{ error: null }  // Just error status, no data
```

**Used by**:
- Delete confirmation dialogs

---

#### `getByStatus(status)`

**Purpose**: Fetches all people with a specific member status.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `status` | string | `"guest"`, `"member"`, `"leader"`, or `"archived"` |

**Returns**:
```javascript
{
  data: [ /* people matching status */ ],
  error: null
}
```

**Used by**:
- Status filter tabs on people page
- Dashboard member/guest counts

---

#### `search(searchTerm)`

**Purpose**: Searches people by name.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `searchTerm` | string | Text to search for |

**Returns**:
```javascript
{
  data: [ /* matching people */ ],
  error: null
}
```

**Used by**:
- Global search component
- Person search in forms

---

## ⛪ servicesService.js

**Location**: `src/lib/services/servicesService.js`

**Purpose**: Manages church service operations.

### Functions

#### `getAll()`
Fetches all church services.

#### `getById(id)`
Fetches a single service by ID.

#### `create(serviceData)`
Creates a new service record.

**Required fields**:
- `service_date` (string, YYYY-MM-DD)
- `service_type` (string)

**Optional fields**:
- `service_time`
- `location`
- `sermon_topic`
- `sermon_speaker`
- `total_attendance`
- `guests_count`
- `salvation_decisions`
- `tithers_count`

#### `update(id, serviceData)`
Updates an existing service.

#### `remove(id)`
Deletes a service.

#### `getByDateRange(startDate, endDate)`
Fetches services within a date range.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `startDate` | string | Start date (YYYY-MM-DD) |
| `endDate` | string | End date (YYYY-MM-DD) |

**Used by**:
- Services page with time filter applied
- Dashboard service metrics

---

## 📋 attendanceService.js

**Location**: `src/lib/services/attendanceService.js`

**Purpose**: Manages attendance record operations.

### Functions

#### `getAll()`
Fetches all attendance records.

#### `getById(id)`
Fetches a single attendance record.

#### `create(attendanceData)`
Creates an attendance record linking a person to a service.

**Required fields**:
- `service_id` (ID)
- `person_id` (ID)

**Optional fields**:
- `made_salvation_decision` (boolean)
- `gave_tithe` (boolean)
- `first_timer` (boolean)

#### `update(id, attendanceData)`
Updates an attendance record.

#### `remove(id)`
Deletes an attendance record.

#### `getByService(serviceId)`
Gets all attendance records for a specific service.

**Used by**: Service detail view showing attendees

#### `getByPerson(personId)`
Gets all attendance records for a specific person.

**Used by**: Person profile showing attendance history

#### `bulkCreate(records)`
Creates multiple attendance records at once.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `records` | array | Array of attendance objects |

**Used by**: Service form when recording multiple attendees

#### `syncAttendance(serviceId, personIds)`
Synchronizes the attendance list for a service.

---

## 🌱 evangelismService.js

**Location**: `src/lib/services/evangelismService.js`

**Purpose**: Manages evangelism contact operations.

### Functions

#### `getAll()`
Fetches all evangelism contacts.

#### `getById(id)`
Fetches a specific contact.

#### `create(contactData)`
Creates a new evangelism contact.

**Fields**:
- `first_name`, `last_name` (required)
- `contact_category` (response type)
- `contact_date`
- `invited_by_id` (who invited them)
- `phone`, `email`, `address`

#### `update(id, contactData)`
Updates a contact's information.

#### `remove(id)`
Deletes a contact.

#### `getByResponse(response)`
Filters contacts by response category.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `response` | string | `"responsive"`, `"non_responsive"`, `"events_only"`, `"do_not_contact"`, `"has_church"` |

#### `getRequiringFollowUp()`
Gets contacts that need follow-up attention.

**Used by**: Follow-up task lists, dashboard alerts

#### `getConverted()`
Gets contacts who have been converted to members.

**Used by**: Conversion funnel metrics

#### `getByDateRange(startDate, endDate)`
Filters contacts by when they were contacted.

#### `markAsConverted(id, addToPeople)`
Marks a contact as converted.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `id` | string | Contact's ID |
| `addToPeople` | boolean | Whether to change their status to member |

**Used by**: "Convert to Member" action button

#### `getByInviter(personId)`
Gets all contacts invited by a specific person.

**Used by**: 
- Inviter leaderboard
- Person profile showing who they've invited

---

## 🙏 meetingsService.js

**Location**: `src/lib/services/meetingsService.js`

**Purpose**: Manages prayer meetings and gatherings.

### Functions

#### `getAll()`
Fetches all meetings.

#### `getById(id)`
Fetches a specific meeting.

#### `create(meetingData)`
Creates a new meeting.

**Required fields**:
- `meeting_date` (string, YYYY-MM-DD)
- `meeting_type` (string)

**Optional fields**:
- `start_time`, `end_time`
- `duration_minutes`
- `location`
- `attendance_count`, `leaders_count`
- `leader_id`
- `notes`

#### `update(id, meetingData)`
Updates a meeting.

#### `remove(id)`
Deletes a meeting.

#### `getByType(meetingType)`
Filters meetings by type.

**Meeting types**: `"bacenta"`, `"flow_prayer"`, `"all_night_prayer"`, `"basonta"`, `"sat"`, `"farley_prayer"`

#### `getByDateRange(startDate, endDate)`
Filters meetings by date range.

#### `addAttendee(meetingId, personId)`
Adds an attendee to a meeting.

#### `getAttendees(meetingId)`
Gets all attendees for a meeting.

---

## 🏠 visitationsService.js

**Location**: `src/lib/services/visitationsService.js`

**Purpose**: Manages home visitation records.

### Functions

#### `getAll()`
Fetches all visitations.

#### `getById(id)`
Fetches a specific visitation.

#### `create(visitationData)`
Creates a new visitation record.

**Required fields**:
- `person_id` (ID of person visited)
- `visit_date` (string, YYYY-MM-DD)
- `outcome` (string)
- `follow_up_required` (boolean)

**Optional fields**:
- `visited_by_id`, `visited_by_name`
- `person_visited_name`
- `follow_up_date`
- `notes`

#### `update(id, visitationData)`
Updates a visitation.

#### `remove(id)`
Deletes a visitation.

#### `getByPerson(personId)`
Gets all visitations to a specific person.

**Used by**: Person profile visitation history

#### `getRequiringFollowUp()`
Gets visitations where follow-up is needed.

**Used by**: Dashboard follow-up alerts

#### `getByDateRange(startDate, endDate)`
Filters visitations by date.

---

## 📅 activitiesService.js

**Location**: `src/lib/services/activitiesService.js`

**Purpose**: Manages activity log entries.

### Functions

#### `getAll()`
Fetches all activities.

#### `getById(id)`
Fetches a specific activity.

#### `create(activityData)`
Creates a new activity.

**Required fields**:
- `activity_type` (string)
- `activity_date` (string)

#### `getByType(activityType)`
Filters by activity type.

#### `getByDateRange(startDate, endDate)`
Filters by date range.

#### `getRecent(limit)`
Gets most recent activities.

**Parameters**:
| Name | Type | Default | Description |
|------|------|---------|-------------|
| `limit` | number | 10 | Maximum number to return |

**Used by**: Dashboard recent activity feed

---

## 📦 storageService.js

**Location**: `src/lib/services/storageService.js`

**Purpose**: Handles file uploads and downloads.

### Functions

Manages file storage for:
- Profile photos
- Service photos
- Other media files

---

## 🔧 Common Patterns

### Loading Data in a Page

```javascript
import { onMount } from 'svelte';
import { getAll } from '$lib/services/peopleService';

let people = [];
let loading = true;
let error = null;

onMount(async () => {
  const result = await getAll();
  if (result.error) {
    error = result.error.message;
  } else {
    people = result.data;
  }
  loading = false;
});
```

### Creating Data from a Form

```javascript
import { create } from '$lib/services/peopleService';

async function handleSubmit(formData) {
  const { data, error } = await create(formData);
  
  if (error) {
    showError(error.message);
    return;
  }
  
  showSuccess(`Created ${data.first_name}!`);
  closeModal();
  refreshList();
}
```

### Filtering by Date Range

```javascript
import { getByDateRange } from '$lib/services/servicesService';
import { dateRange } from '$lib/stores/filterStore';
import { get } from 'svelte/store';

async function loadFilteredServices() {
  const range = get(dateRange);
  const { data, error } = await getByDateRange(range.startDate, range.endDate);
  
  if (!error) {
    services = data;
  }
}
```

### Error Handling Best Practices

```javascript
async function loadData() {
  try {
    const { data, error } = await getAll();
    
    if (error) {
      // Handle Convex-level error
      console.error('Database error:', error);
      showNotification('Failed to load data', 'error');
      return;
    }
    
    if (!data || data.length === 0) {
      // Handle empty data
      showNotification('No data found', 'info');
      return;
    }
    
    // Success - use the data
    items = data;
    
  } catch (e) {
    // Handle network or other unexpected errors
    console.error('Unexpected error:', e);
    showNotification('Network error', 'error');
  }
}
```
