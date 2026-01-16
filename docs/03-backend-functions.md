# ⚙️ Backend Functions

> **Complete guide to all Convex backend operations - queries and mutations for each table.**

---

## Overview

The backend logic lives in the `convex/` folder. Each file corresponds to a database table and contains:

- **Queries**: Read-only operations to fetch data
- **Mutations**: Write operations to create, update, or delete data

All functions are accessible from the frontend through the generated API (`convex/_generated/api.js`).

---

## 📁 Backend Files

| File | Table | Purpose |
|------|-------|---------|
| `convex/people.ts` | `people` | People management |
| `convex/services.ts` | `services` | Service tracking |
| `convex/attendance.ts` | `attendance` | Attendance records |
| `convex/evangelism.ts` | `people` | Evangelism contact operations |
| `convex/meetings.ts` | `meetings` | Meeting management |
| `convex/visitations.ts` | `visitations` | Visitation tracking |
| `convex/seed.ts` | All | Test data generation |

---

## 👥 People Functions

**File**: `convex/people.ts`

### Queries (Read Operations)

#### `getAll`
**Purpose**: Retrieves all people from the database.

**Parameters**: None

**Returns**: Array of all person records

**Use case**: Loading the full people directory, populating dropdown lists for selecting people

---

#### `getById`
**Purpose**: Retrieves a single person by their ID.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `id` | ID | The unique identifier of the person |

**Returns**: Single person record or null if not found

**Use case**: Loading an individual profile page, getting details for a popup

---

#### `getByStatus`
**Purpose**: Retrieves all people with a specific member status.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `status` | string | One of: `"guest"`, `"member"`, `"leader"`, `"archived"` |

**Returns**: Array of people matching the status

**Use case**: Filtering the directory by membership type, counting members vs guests

---

#### `search`
**Purpose**: Searches for people by name.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `searchTerm` | string | Text to search for in first_name or last_name |

**Returns**: Array of people matching the search term

**Use case**: Global search functionality, finding specific individuals

---

### Mutations (Write Operations)

#### `create`
**Purpose**: Creates a new person record.

**Parameters**: Object with person fields (see Data Model)

**Required fields**:
- `first_name`
- `last_name`
- `member_status`

**Returns**: The newly created person record with generated ID

**Use case**: Adding a new member, adding an evangelism contact

---

#### `update`
**Purpose**: Updates an existing person record.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `id` | ID | The person's ID |
| `...fields` | various | Any fields to update |

**Returns**: The updated person record

**Use case**: Editing profile information, changing status, promoting to leader

---

#### `remove`
**Purpose**: Deletes a person record.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `id` | ID | The person's ID to delete |

**Returns**: Nothing (void)

**Use case**: Removing duplicate entries, cleaning up test data

---

## ⛪ Services Functions

**File**: `convex/services.ts`

### Queries

#### `getAll`
**Purpose**: Retrieves all church services.

**Parameters**: None

**Returns**: Array of all service records

**Use case**: Loading the services list page

---

#### `getById`
**Purpose**: Retrieves a single service by ID.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `id` | ID | The service's unique identifier |

**Returns**: Single service record

**Use case**: Viewing service details, editing a service

---

#### `getByDateRange`
**Purpose**: Retrieves services within a date range.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `startDate` | string | Start date (YYYY-MM-DD) |
| `endDate` | string | End date (YYYY-MM-DD) |

**Returns**: Array of services within the range

**Use case**: Filtering services by the global time filter

---

### Mutations

#### `create`
**Purpose**: Creates a new service record.

**Parameters**: Object with service fields

**Required fields**:
- `service_date`
- `service_type`

**Returns**: The newly created service record

**Use case**: Recording a new church service

---

#### `update`
**Purpose**: Updates an existing service.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `id` | ID | The service's ID |
| `...fields` | various | Any fields to update |

**Returns**: The updated service record

**Use case**: Correcting service details, adding attendance counts

---

#### `remove`
**Purpose**: Deletes a service record.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `id` | ID | The service's ID |

**Returns**: Nothing (void)

**Use case**: Removing incorrect entries

---

## 📋 Attendance Functions

**File**: `convex/attendance.ts`

### Queries

#### `getAll`
**Purpose**: Retrieves all attendance records.

**Parameters**: None

**Returns**: Array of all attendance records

**Use case**: Getting complete attendance data for analysis

---

#### `getById`
**Purpose**: Retrieves a single attendance record.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `id` | ID | The attendance record's ID |

**Returns**: Single attendance record

---

#### `getByService`
**Purpose**: Retrieves all attendance records for a specific service.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `serviceId` | ID | The service's ID |

**Returns**: Array of attendance records for that service

**Use case**: Showing who attended a specific service

---

#### `getByPerson`
**Purpose**: Retrieves all attendance records for a specific person.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `personId` | ID | The person's ID |

**Returns**: Array of attendance records for that person

**Use case**: Showing a person's attendance history on their profile

---

### Mutations

#### `create`
**Purpose**: Creates a single attendance record.

**Parameters**: Object with attendance fields

**Required fields**:
- `service_id`
- `person_id`

**Returns**: The created attendance record

**Use case**: Recording that someone attended a service

---

#### `update`
**Purpose**: Updates an attendance record.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `id` | ID | The attendance record's ID |
| `...fields` | various | Fields to update |

**Returns**: The updated record

**Use case**: Correcting attendance information

---

#### `remove`
**Purpose**: Deletes an attendance record.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `id` | ID | The attendance record's ID |

**Returns**: Nothing

**Use case**: Removing incorrect attendance entries

---

#### `bulkCreate`
**Purpose**: Creates multiple attendance records at once.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `records` | array | Array of attendance objects |

**Returns**: Array of created records

**Use case**: Recording attendance for multiple people at once after a service

---

#### `syncAttendance`
**Purpose**: Synchronizes attendance for a service.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `serviceId` | ID | The service's ID |
| `attendanceData` | array | Complete attendance list |

**Returns**: Sync result

**Use case**: Updating the full attendance list for a service

---

## 🌱 Evangelism Functions

**File**: `convex/evangelism.ts`

These functions work with the `people` table but focus on evangelism/outreach contacts.

### Queries

#### `getAll`
**Purpose**: Retrieves all evangelism contacts (people with contact_category set).

**Parameters**: None

**Returns**: Array of evangelism contacts

**Use case**: Loading the evangelism page

---

#### `getById`
**Purpose**: Retrieves a specific evangelism contact.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `id` | ID | The person's ID |

**Returns**: Single contact record

---

#### `getByResponse`
**Purpose**: Retrieves contacts by their response category.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `response` | string | One of: `"responsive"`, `"non_responsive"`, `"events_only"`, `"do_not_contact"`, `"has_church"` |

**Returns**: Array of contacts with that response

**Use case**: Filtering contacts by response type

---

#### `getRequiringFollowUp`
**Purpose**: Retrieves contacts that need follow-up.

**Parameters**: None

**Returns**: Array of contacts needing attention

**Use case**: Building a follow-up task list. Returns responsive contacts who either haven't visited yet, or whose last visit was 30+ days ago.

---

#### `getConverted`
**Purpose**: Retrieves contacts who have been converted (became guests/members).

**Parameters**: None

**Returns**: Array of converted contacts

**Use case**: Measuring evangelism success

---

#### `getByDateRange`
**Purpose**: Retrieves contacts made within a date range.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `startDate` | string | Start date |
| `endDate` | string | End date |

**Returns**: Array of contacts from that period

**Use case**: Filtering by the global time filter

---

#### `getByInviter`
**Purpose**: Retrieves all contacts invited by a specific person.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `personId` | ID | The inviter's ID |

**Returns**: Array of people they invited

**Use case**: Showing a person's evangelism impact, building the "top inviters" chart

---

### Mutations

#### `create`
**Purpose**: Creates a new evangelism contact.

**Parameters**: Object with contact fields

**Returns**: The created contact record

**Use case**: Recording a new outreach contact

---

#### `update`
**Purpose**: Updates a contact's information.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `id` | ID | The contact's ID |
| `...fields` | various | Fields to update |

**Returns**: The updated record

**Use case**: Updating response category, adding notes

---

#### `remove`
**Purpose**: Deletes a contact.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `id` | ID | The contact's ID |

**Returns**: Nothing

---

#### `markAsConverted`
**Purpose**: Marks a contact as converted and optionally updates their status to member.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `id` | ID | The contact's ID |
| `addToPeople` | boolean | Whether to change their member_status to "member" |

**Returns**: The updated record

**Use case**: Converting an evangelism contact to a church member

---

## 🙏 Meetings Functions

**File**: `convex/meetings.ts`

### Queries

#### `getAll`
**Purpose**: Retrieves all meetings.

**Parameters**: None

**Returns**: Array of all meeting records

---

#### `getById`
**Purpose**: Retrieves a single meeting.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `id` | ID | The meeting's ID |

**Returns**: Single meeting record

---

#### `getByType`
**Purpose**: Retrieves meetings of a specific type.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `meetingType` | string | One of: `"bacenta"`, `"flow_prayer"`, `"all_night_prayer"`, `"basonta"`, `"sat"`, `"farley_prayer"` |

**Returns**: Array of meetings of that type

**Use case**: Filtering meetings by type

---

#### `getByDateRange`
**Purpose**: Retrieves meetings within a date range.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `startDate` | string | Start date |
| `endDate` | string | End date |

**Returns**: Array of meetings in range

---

#### `getAttendees`
**Purpose**: Retrieves all attendees for a specific meeting.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `meetingId` | ID | The meeting's ID |

**Returns**: Array of people who attended

**Use case**: Viewing meeting attendance

---

### Mutations

#### `create`
**Purpose**: Creates a new meeting record.

**Parameters**: Object with meeting fields

**Required fields**:
- `meeting_date`
- `meeting_type`

**Returns**: The created meeting

---

#### `update`
**Purpose**: Updates a meeting.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `id` | ID | The meeting's ID |
| `...fields` | various | Fields to update |

**Returns**: The updated meeting

---

#### `remove`
**Purpose**: Deletes a meeting.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `id` | ID | The meeting's ID |

**Returns**: Nothing

---

#### `addAttendee`
**Purpose**: Adds an attendee to a meeting.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `meetingId` | ID | The meeting's ID |
| `personId` | ID | The person's ID |

**Returns**: The created meeting_attendance record

**Use case**: Recording who attended a meeting

---

## 🏠 Visitations Functions

**File**: `convex/visitations.ts`

### Queries

#### `getAll`
**Purpose**: Retrieves all visitation records.

**Parameters**: None

**Returns**: Array of all visitations

---

#### `getById`
**Purpose**: Retrieves a single visitation.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `id` | ID | The visitation's ID |

**Returns**: Single visitation record

---

#### `getByPerson`
**Purpose**: Retrieves all visitations to a specific person.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `personId` | ID | The visited person's ID |

**Returns**: Array of visitations to that person

**Use case**: Showing visitation history on a person's profile

---

#### `getRequiringFollowUp`
**Purpose**: Retrieves all visitations where follow-up is required.

**Parameters**: None

**Returns**: Array of visitations needing follow-up

**Use case**: Building a follow-up task list

---

#### `getByDateRange`
**Purpose**: Retrieves visitations within a date range.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `startDate` | string | Start date |
| `endDate` | string | End date |

**Returns**: Array of visitations in range

---

### Mutations

#### `create`
**Purpose**: Creates a new visitation record.

**Parameters**: Object with visitation fields

**Required fields**:
- `person_id`
- `visit_date`
- `outcome`
- `follow_up_required`

**Returns**: The created visitation

---

#### `update`
**Purpose**: Updates a visitation.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `id` | ID | The visitation's ID |
| `...fields` | various | Fields to update |

**Returns**: The updated visitation

---

#### `remove`
**Purpose**: Deletes a visitation.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `id` | ID | The visitation's ID |

**Returns**: Nothing

---

## 🌱 Seed Script

**File**: `convex/seed.ts`

### Purpose

Populates the database with realistic sample data for development and testing.

### What It Creates

| Data Type | Quantity | Notes |
|-----------|----------|-------|
| People | ~50 | Mix of guests, members, leaders |
| Services | ~100 | Sunday and special services |
| Attendance | ~500 | Links people to services |
| Meetings | ~200 | Various meeting types |
| Visitations | ~100 | Home visit records |
| Activities | ~50 | Activity log entries |

### Date Range

The seed data covers **2025 and 2026** to allow testing with historical data and future projections.

### Running the Seed Script

The seed functions can be called through the Convex dashboard or via CLI to populate the database with test data.

---

## 🔄 Common Patterns

### Fetching Data for a Page

```
1. Page loads
2. Call getAll() or getByDateRange() from the appropriate service
3. Filter/process data as needed
4. Display in UI components
```

### Creating a New Record

```
1. User fills form
2. Validate input (frontend validation)
3. Call create() mutation with form data
4. Convex validates and stores
5. Return created record
6. Update UI
```

### Updating a Record

```
1. Load existing record with getById()
2. Display in edit form
3. User makes changes
4. Call update() with ID and changed fields
5. Return updated record
6. Update UI
```

### Deleting a Record

```
1. Confirm with user
2. Call remove() with ID
3. Update UI to remove the item
```
