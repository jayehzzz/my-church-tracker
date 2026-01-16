---
description: Configure and customize DataTable with columns, filtering, sorting, and row actions.
---

# DataTable Customization

Guide for using the DataTable component.

---

## Basic Usage

```svelte
<script>
  import DataTable from '$lib/components/ui/DataTable.svelte';
  
  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email' },
    { key: 'status', label: 'Status', sortable: true },
  ];
</script>

<DataTable 
  {columns} 
  data={people} 
  onRowClick={(row) => openModal(row)}
/>
```

---

## Column Configuration

```javascript
const columns = [
  {
    key: 'name',           // Data field key
    label: 'Full Name',    // Display label
    sortable: true,        // Enable sorting
    filterable: true,      // Show filter dropdown
    width: '200px',        // Fixed width
    align: 'left',         // left | center | right
  },
  
  // Badge column
  {
    key: 'status',
    label: 'Status',
    type: 'badge',
    badgeColors: {
      guest: 'bg-blue-500/10 text-blue-500',
      member: 'bg-green-500/10 text-green-500',
    },
  },
  
  // Date column
  {
    key: 'created_at',
    label: 'Joined',
    type: 'date',
  },
];
```

---

## Row Click (Click = Action)

```svelte
<DataTable 
  {columns} 
  {data}
  onRowClick={(row) => {
    selectedPerson = row;
    isModalOpen = true;
  }}
/>
```

---

## Filtering

```svelte
<DataTable 
  {columns} 
  {data}
  searchable={true}
  searchPlaceholder="Search..."
  searchKeys={['first_name', 'last_name', 'email']}
  filters={[
    {
      key: 'member_status',
      label: 'Status',
      options: [
        { value: 'guest', label: 'Guests' },
        { value: 'member', label: 'Members' },
      ],
    },
  ]}
/>
```

---

## Sorting & Pagination

```svelte
<DataTable 
  {columns}
  {data}
  defaultSort={{ key: 'last_name', direction: 'asc' }}
  paginated={true}
  pageSize={25}
/>
```

---

## Row Actions

```svelte
<DataTable 
  {columns}
  {data}
  rowActions={[
    { label: 'Edit', onClick: (row) => editRow(row) },
    { label: 'Delete', variant: 'destructive', onClick: (row) => deleteRow(row) },
  ]}
/>
```

---

## States

```svelte
<DataTable 
  {columns}
  {data}
  loading={isLoading}
  emptyMessage="No data found"
  emptyAction={{ label: 'Add Item', onClick: openCreate }}
/>
```

---

## Checklist

- [ ] Define columns with proper types
- [ ] Set `onRowClick` for interactivity
- [ ] Enable `searchable` for large datasets
- [ ] Add `filters` for quick filtering
- [ ] Enable `sortable` on key columns
- [ ] Handle `loading` state
- [ ] Provide `emptyMessage`
