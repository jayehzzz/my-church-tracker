# 🔄 User Workflows

> **Step-by-step guides for common tasks in the application.**

---

## Overview

This document provides detailed workflows for the most common tasks users perform in the application. Each workflow includes the steps, what happens behind the scenes, and any important notes.

---

## 👤 Person Management Workflows

### Adding a New Church Member

**Goal**: Add a new person who has joined the church as a member.

#### Steps

1. **Navigate to People page**
   - Click "People" in the sidebar
   - Or go to `/people`

2. **Open the Add Person form**
   - Click the "Add Person" button in the top right
   - A modal opens with PersonForm

3. **Fill in required information**
   - Enter **First Name** (required)
   - Enter **Last Name** (required)
   - Select **Member Status** = "Member"

4. **Add optional details**
   - Email, Phone, Address
   - Birthday
   - First Visit Date
   - Membership Date (when they became a member)
   - Is Baptised, Is Tither checkboxes

5. **Save the person**
   - Click "Save" button
   - Form validates inputs
   - If valid, creates the person in the database
   - Modal closes
   - New person appears in the list

#### What Happens Behind the Scenes

```
1. PersonForm collects data
2. Frontend validation runs
3. peopleService.create() is called
4. Convex mutates the people table
5. New record created with:
   - Generated ID
   - created_at = now
   - updated_at = now
6. Success response returned
7. UI updates with new person
```

#### Common Issues

| Issue | Solution |
|-------|----------|
| Form won't submit | Check required fields are filled |
| Duplicate person | Search first to check if they exist |
| Invalid email format | Ensure email has @ and domain |

---

### Promoting a Guest to Member

**Goal**: Change someone's status from Guest to Member.

#### Steps

1. **Find the person**
   - Go to `/people`
   - Search for their name, or
   - Filter by "Guests" tab

2. **Open their profile**
   - Click their name or row
   - Goes to `/people/[id]`

3. **Locate status actions**
   - Find the "Promote to Member" button
   - Usually in the profile header actions

4. **Confirm promotion**
   - Click "Promote to Member"
   - Set their Membership Date
   - Confirm the action

5. **Verify the change**
   - Profile updates to show "Member" status
   - Membership date is recorded

#### What Changes

| Field | Before | After |
|-------|--------|-------|
| member_status | guest | member |
| membership_date | null | [today's date] |
| updated_at | [previous] | [now] |

---

### Promoting a Member to Leader

**Goal**: Elevate a member to a leadership position.

#### Steps

1. **Open the member's profile**
   - Navigate to their profile at `/people/[id]`

2. **Click "Promote to Leader"**
   - In the profile actions section

3. **Assign a role**
   - Select their leadership role:
     - Basonta Leader
     - Bacenta Leader
     - Basonta Worker

4. **Confirm the change**
   - Click confirm
   - Status updates

#### What Changes

| Field | Before | After |
|-------|--------|-------|
| member_status | member | leader |
| role | null/no_role | [selected role] |

---

### Archiving a Person

**Goal**: Mark someone as no longer active/present in the church.

#### Steps

1. **Open their profile**
2. **Click "Archive" in actions**
3. **Confirm the action**
   - Warning: This marks them as inactive
4. **Person moves to Archived status**

#### What Changes

| Field | Before | After |
|-------|--------|-------|
| member_status | [previous] | archived |
| activity_status | [previous] | cleared |

#### Notes
- Archived people still appear in historical data
- They can be reactivated later
- Use for people who have left the church

---

### Reactivating an Archived Person

**Goal**: Bring back someone who was previously archived.

#### Steps

1. **Find the archived person**
   - Go to People page
   - Click "Archived" tab
   - Search for their name

2. **Open their profile**
3. **Click "Reactivate"**
4. **Set their new status**
   - Usually back to "Member" or "Guest"
5. **Confirm**

---

## ⛪ Service Workflows

### Recording a Sunday Service

**Goal**: Log a church service with attendance and metrics.

#### Steps

1. **Navigate to Services**
   - Click "Services" in sidebar
   - Or go to `/services`

2. **Open Add Service form**
   - Click "Add Service" button

3. **Enter service details**
   - **Date**: When the service occurred
   - **Type**: "Sunday Service"
   - **Time**: When it started (optional)
   - **Location**: Where it was held (optional)

4. **Enter sermon information**
   - **Topic**: Sermon title
   - **Speaker**: Who preached

5. **Enter attendance metrics**
   - **Total Attendance**: How many people came
   - **Guests Count**: First-time visitors
   - **Salvation Decisions**: Faith decisions made
   - **Tithers Count**: People who gave

6. **Add individual attendees (optional)**
   - Use the attendee selector
   - Search and select people who attended
   - This creates attendance records

7. **Save the service**
   - Click "Save"
   - Service is recorded
   - Charts and metrics update

#### What Gets Created

| Table | Records |
|-------|---------|
| services | 1 service record |
| attendance | 1 record per selected attendee |

---

### Viewing Service Analytics

**Goal**: Understand attendance trends and service metrics.

#### Steps

1. **Navigate to Services page**
2. **Set the time filter**
   - Use the period selector in the top nav
   - Choose your desired period (This Year, Last 6 Months, etc.)

3. **Review KPI cards**
   - Total services
   - Average attendance
   - Guest count
   - Salvations

4. **Analyze the attendance chart**
   - Look for trends (up, down, flat)
   - Identify peaks and dips
   - Compare to previous periods

5. **Drill down into specific services**
   - Click a service in the table
   - View full details and attendee list

---

## 🌱 Evangelism Workflows

### Recording a New Contact

**Goal**: Log someone you met during outreach.

#### Steps

1. **Navigate to Evangelism**
   - Click "Evangelism" in sidebar

2. **Open Add Contact form**
   - Click "Add Contact" button

3. **Enter contact information**
   - **First Name** (required)
   - **Last Name** (required)
   - Phone, Email, Address (as available)

4. **Enter outreach details**
   - **Contact Date**: When you met them
   - **Invited By**: Who made the contact (select from list)
   - **Response Category**: How they responded
     - Responsive
     - Non-Responsive
     - Events Only
     - Has Church
     - Do Not Contact

5. **Add follow-up information if needed**
   - Notes about the conversation
   - Follow-up date if you plan to reach out again

6. **Save the contact**
   - Click "Save"
   - Contact appears in the list

---

### Converting a Contact to Member

**Goal**: Mark an evangelism contact as converted and add them to the member directory.

#### Steps

1. **Find the contact**
   - Go to Evangelism page
   - Search for their name
   - Or filter by "Responsive" category

2. **Open their record**
   - Click their name or row

3. **Click "Mark as Converted"**
   - This button appears for contacts who aren't yet members

4. **Choose conversion options**
   - **Add to People Directory**: Yes (recommended)
   - **Set Member Status**: Guest or Member
   - **Membership Date**: If setting as Member

5. **Confirm**
   - Contact's status updates
   - They appear in the People directory
   - Conversion metrics update

#### Journey Completion

This completes the evangelism journey:
```
Unknown → Contact → First Visit → Member
```

---

### Tracking Follow-ups

**Goal**: Ensure contacts needing follow-up don't fall through cracks.

#### Steps

1. **Go to Evangelism page**
2. **Filter to see pending follow-ups**
   - Look for filter or "Follow-ups Due" section
3. **Review each contact needing attention**
4. **For each contact:**
   - Attempt to reach them
   - Update their record with outcome
   - Set next follow-up date if needed
   - Or update their category based on response
5. **Mark follow-ups complete as done**

---

## 🙏 Meeting Workflows

### Recording a Prayer Meeting

**Goal**: Log a prayer meeting with attendance.

#### Steps

1. **Navigate to Meetings**
   - Click "Meetings" in sidebar

2. **Open Add Meeting form**
   - Click "Add Meeting"

3. **Enter meeting details**
   - **Date**: When the meeting occurred
   - **Type**: Choose the meeting type
     - Bacenta
     - Flow Prayer
     - All-Night Prayer
     - Basonta
     - SAT
     - Farley Prayer
   - **Start Time**: When it began
   - **End Time**: When it ended

4. **Enter attendance**
   - **Attendance Count**: How many attended
   - **Leaders Count**: How many leaders present
   - **Leader**: Who led the meeting

5. **Add notes (optional)**
   - Key prayer points
   - Topics covered
   - Testimonies

6. **Save**
   - Meeting is recorded
   - Duration is calculated from times
   - Prayer hours metric updates

---

## 🏠 Visitation Workflows

### Planning Visitations Using the Map

**Goal**: Use the map to plan efficient home visit routes.

#### Steps

1. **Navigate to People Map**
   - Go to `/people/map`

2. **Apply filters**
   - Filter by members needing visits
   - Filter by activity status (e.g., "Dormant")
   - Filter by geographic area

3. **Identify clusters**
   - Look for groups of nearby members
   - Plan routes to visit multiple people

4. **Note addresses**
   - Click markers to see addresses
   - Copy addresses for navigation

5. **Plan your schedule**
   - Group nearby visits on the same day
   - Consider best times to visit

---

### Recording a Home Visit

**Goal**: Log a pastoral care visit to a member's home.

#### Steps

1. **Navigate to Visitation**
   - Click "Visitation" in sidebar

2. **Open Add Visitation form**
   - Click "Add Visitation"

3. **Select who was visited**
   - Search and select the person
   - Their details auto-fill

4. **Enter visit details**
   - **Visit Date**: When the visit occurred
   - **Visited By**: Who did the visiting (usually you)
   - **Outcome**: What happened
     - Welcomed & Encouraged
     - Prayer Request Received
     - Not Home
     - Concerns Shared
     - Invited to Service

5. **Set follow-up if needed**
   - Check "Follow-up Required" if applicable
   - Set a follow-up date

6. **Add notes**
   - Prayer requests shared
   - Concerns mentioned
   - Action items

7. **Save**
   - Visitation is logged
   - Appears on their profile
   - Shows in visitation calendar

---

### Visiting from a Person's Profile

**Goal**: Quick way to log a visit to a specific person.

#### Steps

1. **Go to the person's profile**
   - Navigate to `/people/[id]`

2. **Click "Log Visitation" action**
   - Opens VisitationForm
   - Person is pre-selected

3. **Fill in visit details**
   - Date, outcome, notes

4. **Save**
   - Visit is recorded
   - Shows in their profile history

---

## 📊 Reporting Workflows

### Generating a Membership Report

**Goal**: Export a list of all members with their details.

#### Steps

1. **Navigate to Reports page**
   - Or use export from People page

2. **Select "Membership Report"**

3. **Set date range if applicable**
   - For "Members as of" date
   - Or all-time

4. **Choose fields to include**
   - Name, Contact info
   - Status, Role
   - Join date
   - Activity status

5. **Preview the report**
   - Review data
   - Check formatting

6. **Export**
   - Choose format (CSV, Excel, PDF)
   - Download file

---

### Analyzing Attendance Trends

**Goal**: Understand how attendance has changed over time.

#### Steps

1. **Go to Services page**

2. **Set time range**
   - Use period selector
   - Choose "Last 12 Months" for trend analysis

3. **Review the attendance chart**
   - Identify overall trend (growing, declining, flat)
   - Note seasonal patterns
   - Identify anomalies

4. **Compare periods**
   - Compare this year to last year
   - Compare quarters

5. **Drill down**
   - Click specific data points
   - See which services had highest/lowest attendance

6. **Export data if needed**
   - For further analysis in spreadsheet

---

## 🔍 Search Workflows

### Finding a Specific Person

**Goal**: Quickly locate a person in the system.

#### Method 1: Global Search

1. Press **Cmd/Ctrl + K** (or click search in top bar)
2. Type the person's name
3. Results appear as you type
4. Click their name to go to their profile

#### Method 2: People Page Search

1. Go to `/people`
2. Use the search box above the table
3. Type name, email, or phone
4. Table filters to matching results
5. Click to view profile

#### Method 3: URL Direct

If you know their ID:
- Go to `/people/[their-id]`

---

## ⏱️ Time Filter Workflows

### Viewing Data for a Specific Period

**Goal**: Filter all data to a specific time period.

#### Steps

1. **Locate the time filter**
   - In the top navigation bar
   - Shows current period (e.g., "This Month")

2. **Click to open selector**
   - Dropdown shows options

3. **Choose your period**
   - Quick filters: This Month, This Year, etc.
   - Specific: Choose year, month, quarter
   - Custom: Pick exact dates

4. **Data updates automatically**
   - All charts refresh
   - Tables filter
   - KPIs recalculate

5. **Navigate to other pages**
   - Filter persists
   - All pages show same period

---

### Sharing a Filtered View

**Goal**: Share a link that shows the same filtered data.

#### Steps

1. **Set your desired filter**
2. **Copy the URL**
   - URL includes filter params
   - e.g., `/people?filterType=thisYear&year=2025`
3. **Share the URL**
   - Send to colleague
   - Bookmark for later
4. **Recipient sees same filtered view**

---

## 🔧 Quick Reference

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open global search |
| `Escape` | Close modals/search |
| `↑` / `↓` | Navigate search results |
| `Enter` | Select result |

### Common Actions by Page

| Page | Primary Action |
|------|----------------|
| Dashboard | View overview |
| People | Add Person |
| Services | Add Service |
| Evangelism | Add Contact |
| Meetings | Add Meeting |
| Visitation | Add Visitation |
| Reports | Generate Report |
