# 🛠️ Utilities Reference

> **Complete guide to helper functions, date utilities, validation, and other utilities.**

---

## Overview

Utility functions live in `src/lib/utils/` and provide reusable logic for data processing, date manipulation, validation, and exports.

### Utility Files

| File | Purpose |
|------|---------|
| `dataService.js` | Data processing and aggregation |
| `dateUtils.js` | Date manipulation and formatting |
| `validation.js` | Form validation rules |
| `exportUtils.js` | Data export functionality |

---

## 📊 dataService.js

**Location**: `src/lib/utils/dataService.js`

**Purpose**: Central data processing, filtering, and aggregation utilities.

### Functions

#### `filterByDateRange(data, startDate, endDate, dateField)`

**Purpose**: Filter an array of records to only include those within a date range.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `data` | array | Array of records |
| `startDate` | string | Start date (YYYY-MM-DD) |
| `endDate` | string | End date (YYYY-MM-DD) |
| `dateField` | string | Name of the date field in records |

**Returns**: Filtered array

**Example**:
```javascript
import { filterByDateRange } from '$lib/utils/dataService';

const services = [
  { id: 1, service_date: '2025-01-05', attendance: 145 },
  { id: 2, service_date: '2025-01-12', attendance: 152 },
  { id: 3, service_date: '2025-02-02', attendance: 148 }
];

const januaryServices = filterByDateRange(
  services, 
  '2025-01-01', 
  '2025-01-31', 
  'service_date'
);
// Returns only services from January
```

---

#### `aggregateByProperty(data, property)`

**Purpose**: Group and count records by a specific property value.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `data` | array | Array of records |
| `property` | string | Property to group by |

**Returns**: Object with counts `{ value1: count, value2: count }`

**Example**:
```javascript
import { aggregateByProperty } from '$lib/utils/dataService';

const people = [
  { id: 1, member_status: 'member' },
  { id: 2, member_status: 'guest' },
  { id: 3, member_status: 'member' },
  { id: 4, member_status: 'leader' }
];

const statusCounts = aggregateByProperty(people, 'member_status');
// Returns { member: 2, guest: 1, leader: 1 }
```

---

#### `calculateKPIs(data, config)`

**Purpose**: Calculate key performance indicators from a dataset.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `data` | object | Object containing all data types |
| `config` | object | KPI calculation configuration |

**Returns**: Object with calculated KPIs

**Example**:
```javascript
import { calculateKPIs } from '$lib/utils/dataService';

const data = {
  people,
  services,
  visitations,
  meetings
};

const kpis = calculateKPIs(data, {
  dateRange: { start: '2025-01-01', end: '2025-01-31' }
});

// Returns:
// {
//   totalMembers: 168,
//   avgAttendance: 152.5,
//   totalSalvations: 8,
//   visitationsCompleted: 24,
//   ...
// }
```

---

#### `sumField(data, field)`

**Purpose**: Sum a numeric field across all records.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `data` | array | Array of records |
| `field` | string | Numeric field to sum |

**Returns**: Total sum

**Example**:
```javascript
const totalAttendance = sumField(services, 'total_attendance');
// Returns 3245
```

---

#### `averageField(data, field)`

**Purpose**: Calculate average of a numeric field.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `data` | array | Array of records |
| `field` | string | Numeric field to average |

**Returns**: Average value

**Example**:
```javascript
const avgAttendance = averageField(services, 'total_attendance');
// Returns 152.3
```

---

#### `groupByMonth(data, dateField)`

**Purpose**: Group records by month for charting.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `data` | array | Array of records |
| `dateField` | string | Date field name |

**Returns**: Array of `{ month: 'YYYY-MM', count: number, records: [] }`

---

#### `sortByDate(data, dateField, direction)`

**Purpose**: Sort records by a date field.

**Parameters**:
| Name | Type | Default | Description |
|------|------|---------|-------------|
| `data` | array | | Array to sort |
| `dateField` | string | | Date field name |
| `direction` | string | `'desc'` | `'asc'` or `'desc'` |

**Returns**: Sorted array

---

## 📅 dateUtils.js

**Location**: `src/lib/utils/dateUtils.js`

**Purpose**: Date manipulation, formatting, and calculation utilities.

### Functions

#### `getDateRange(filterState)`

**Purpose**: Convert filter state to actual start/end date strings.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `filterState` | object | Filter configuration from filterStore |

**Returns**: Object with `{ startDate, endDate, label }`

**Example**:
```javascript
import { getDateRange } from '$lib/utils/dateUtils';

const filterState = {
  type: 'thisMonth',
  year: 2025,
  month: 0  // January
};

const range = getDateRange(filterState);
// Returns:
// {
//   startDate: '2025-01-01',
//   endDate: '2025-01-31',
//   label: 'January 2025'
// }
```

---

#### `formatDate(dateString, format)`

**Purpose**: Format a date string for display.

**Parameters**:
| Name | Type | Default | Description |
|------|------|---------|-------------|
| `dateString` | string | | Date in YYYY-MM-DD format |
| `format` | string | `'medium'` | Format style |

**Format Options**:
| Value | Output Example |
|-------|----------------|
| `'short'` | "1/5/25" |
| `'medium'` | "Jan 5, 2025" |
| `'long'` | "January 5, 2025" |
| `'full'` | "Sunday, January 5, 2025" |
| `'iso'` | "2025-01-05" |
| `'relative'` | "3 days ago" |

**Example**:
```javascript
import { formatDate } from '$lib/utils/dateUtils';

formatDate('2025-01-05', 'long');  // "January 5, 2025"
formatDate('2025-01-05', 'short'); // "1/5/25"
```

---

#### `getQuarter(date)`

**Purpose**: Get the quarter (Q1-Q4) for a date.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `date` | Date/string | Date to check |

**Returns**: String `'Q1'`, `'Q2'`, `'Q3'`, or `'Q4'`

---

#### `getQuarterDateRange(year, quarter)`

**Purpose**: Get start and end dates for a specific quarter.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `year` | number | Year |
| `quarter` | string | `'Q1'`, `'Q2'`, `'Q3'`, or `'Q4'` |

**Returns**: Object with `{ start, end }`

**Example**:
```javascript
const q2Range = getQuarterDateRange(2025, 'Q2');
// Returns:
// { start: '2025-04-01', end: '2025-06-30' }
```

---

#### `daysAgo(days)`

**Purpose**: Get a date that is N days in the past.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `days` | number | Number of days ago |

**Returns**: ISO date string

---

#### `monthsAgo(months)`

**Purpose**: Get a date that is N months in the past.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `months` | number | Number of months ago |

**Returns**: ISO date string

---

#### `isWithinRange(dateString, startDate, endDate)`

**Purpose**: Check if a date falls within a range.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `dateString` | string | Date to check |
| `startDate` | string | Range start |
| `endDate` | string | Range end |

**Returns**: Boolean

---

#### `getMonthName(monthIndex)`

**Purpose**: Get the name of a month from its index.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `monthIndex` | number | 0-11 (January = 0) |

**Returns**: Month name string

---

#### `getDayOfWeek(dateString)`

**Purpose**: Get the day of the week for a date.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `dateString` | string | Date in YYYY-MM-DD |

**Returns**: Day name (Monday, Tuesday, etc.)

---

#### `getLastSunday()`

**Purpose**: Get the date of the most recent Sunday.

**Returns**: ISO date string

**Use case**: Default date for new Sunday services.

---

## ✅ validation.js

**Location**: `src/lib/utils/validation.js`

**Purpose**: Form validation rules and helper functions.

### Functions

#### `required(value, fieldName)`

**Purpose**: Check if a value is provided.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `value` | any | Value to check |
| `fieldName` | string | Field name for error message |

**Returns**: Error message or null

**Example**:
```javascript
required('', 'First Name');  // "First Name is required"
required('John', 'First Name');  // null
```

---

#### `minLength(value, length, fieldName)`

**Purpose**: Check minimum string length.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `value` | string | String to check |
| `length` | number | Minimum length |
| `fieldName` | string | Field name for error |

**Returns**: Error message or null

---

#### `maxLength(value, length, fieldName)`

**Purpose**: Check maximum string length.

---

#### `isEmail(value)`

**Purpose**: Validate email format.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `value` | string | Email to validate |

**Returns**: Error message or null

**Example**:
```javascript
isEmail('john@example.com');  // null (valid)
isEmail('john');  // "Please enter a valid email"
```

---

#### `isPhone(value)`

**Purpose**: Validate phone number format.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `value` | string | Phone number to validate |

**Returns**: Error message or null

---

#### `isDate(value)`

**Purpose**: Validate date format (YYYY-MM-DD).

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `value` | string | Date string |

**Returns**: Error message or null

---

#### `isAfterDate(value, compareDate, fieldName)`

**Purpose**: Check if a date comes after another date.

**Use case**: Membership date must be after first visit date.

---

#### `isPositiveNumber(value, fieldName)`

**Purpose**: Check if value is a positive number.

---

#### `validatePerson(data)`

**Purpose**: Run all validations for a person record.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `data` | object | Person form data |

**Returns**: Object with errors `{ firstName: "...", email: "..." }` or empty object if valid

**Example**:
```javascript
const errors = validatePerson({
  first_name: '',
  last_name: 'Doe',
  email: 'invalid-email'
});
// Returns:
// { first_name: "First name is required", email: "Please enter a valid email" }
```

---

#### `validateService(data)`

**Purpose**: Run all validations for a service record.

---

#### `validateMeeting(data)`

**Purpose**: Run all validations for a meeting record.

---

#### `validateVisitation(data)`

**Purpose**: Run all validations for a visitation record.

---

## 📤 exportUtils.js

**Location**: `src/lib/utils/exportUtils.js`

**Purpose**: Data export functionality to various formats.

### Functions

#### `exportToCSV(data, columns, filename)`

**Purpose**: Export data to CSV file and trigger download.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `data` | array | Array of records |
| `columns` | array | Column definitions with keys and labels |
| `filename` | string | Filename without extension |

**Example**:
```javascript
import { exportToCSV } from '$lib/utils/exportUtils';

const columns = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'email', label: 'Email' }
];

exportToCSV(people, columns, 'members-export');
// Downloads: members-export.csv
```

---

#### `exportToExcel(data, columns, filename)`

**Purpose**: Export data to Excel format.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `data` | array | Array of records |
| `columns` | array | Column definitions |
| `filename` | string | Filename without extension |

---

#### `formatForExport(value, type)`

**Purpose**: Format a value appropriately for export.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `value` | any | Value to format |
| `type` | string | Data type (date, boolean, etc.) |

**Type Handling**:
| Type | Formatting |
|------|------------|
| `date` | Formatted as readable date |
| `boolean` | "Yes" / "No" |
| `array` | Joined with commas |
| `null/undefined` | Empty string |

---

#### `generatePrintView(data, columns, title)`

**Purpose**: Generate HTML for printing.

**Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `data` | array | Data to print |
| `columns` | array | Column definitions |
| `title` | string | Report title |

**Returns**: HTML string

---

#### `printData(data, columns, title)`

**Purpose**: Open print dialog with formatted data.

---

## 🔧 Common Patterns

### Combining Utils

```javascript
import { filterByDateRange, aggregateByProperty } from '$lib/utils/dataService';
import { getDateRange } from '$lib/utils/dateUtils';
import { filterStore } from '$lib/stores/filterStore';
import { get } from 'svelte/store';

// Get date range from filter store
const range = getDateRange(get(filterStore));

// Filter data
const filteredPeople = filterByDateRange(
  people, 
  range.startDate, 
  range.endDate, 
  'membership_date'
);

// Aggregate
const statusBreakdown = aggregateByProperty(filteredPeople, 'member_status');
```

### Form Validation Pattern

```javascript
import { validatePerson } from '$lib/utils/validation';

let errors = {};

function handleSubmit() {
  errors = validatePerson(formData);
  
  if (Object.keys(errors).length > 0) {
    // Show errors
    return;
  }
  
  // Proceed with submission
  await create(formData);
}
```
