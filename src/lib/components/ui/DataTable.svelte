<!--
  DataTable.svelte
  A sortable, paginated data table component for the church tracker dashboard.
  
  Features:
  - Column sorting (ascending/descending)
  - Pagination with page numbers
  - Search/filter input
  - Row selection with "select all" checkbox
  - Empty state message
  - Loading state
  - Responsive: horizontal scroll on mobile
  - Dark theme with subtle row hover
  - Sticky header
  - Accessible with proper ARIA attributes
  - Uses Svelte 5 runes syntax
-->

<script>
  /**
   * @typedef {Object} Column
   * @property {string} key - Column data key
   * @property {string} label - Column header label
   * @property {boolean} [sortable=false] - Whether column is sortable
   * @property {string} [width] - Column width (e.g., '100px', '20%')
   * @property {(value: any, row: Object) => string} [render] - Custom render function
   */

  let {
    columns = [],
    data = [],
    pageSize = 10,
    searchable = false,
    selectable = false,
    loading = false,
    emptyMessage = "No data available",
    searchPlaceholder = "Search...",
    onselectionchange,
    onrowclick,
    ...restProps
  } = $props();

  // State
  let searchQuery = $state("");
  let sortColumn = $state(null);
  let sortDirection = $state("asc"); // 'asc' or 'desc'
  let currentPage = $state(1);
  let selectedRows = $state(new Set());

  // Filter data based on search query
  const filteredData = $derived(() => {
    if (!searchQuery.trim()) return data;

    const query = searchQuery.toLowerCase();
    return data.filter((row) => {
      return columns.some((col) => {
        const value = row[col.key];
        if (value == null) return false;
        return String(value).toLowerCase().includes(query);
      });
    });
  });

  // Sort filtered data
  const sortedData = $derived(() => {
    const filtered = filteredData();
    if (!sortColumn) return filtered;

    return [...filtered].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      // Handle null/undefined
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortDirection === "asc" ? 1 : -1;
      if (bVal == null) return sortDirection === "asc" ? -1 : 1;

      // Compare values
      let comparison = 0;
      if (typeof aVal === "number" && typeof bVal === "number") {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  });

  // Paginate sorted data
  const paginatedData = $derived(() => {
    const sorted = sortedData();
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return sorted.slice(start, end);
  });

  // Calculate total pages
  const totalPages = $derived(Math.ceil(sortedData().length / pageSize));

  // Generate page numbers for pagination
  const pageNumbers = $derived(() => {
    const pages = [];
    const maxVisible = 5;
    const total = totalPages;

    if (total <= maxVisible) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate range around current page
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(total - 1, currentPage + 1);

      // Adjust if at edges
      if (currentPage <= 2) {
        end = 4;
      } else if (currentPage >= total - 1) {
        start = total - 3;
      }

      // Add ellipsis if needed
      if (start > 2) {
        pages.push("...");
      }

      // Add middle pages
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Add ellipsis if needed
      if (end < total - 1) {
        pages.push("...");
      }

      // Always show last page
      pages.push(total);
    }

    return pages;
  });

  // Check if all visible rows are selected
  const allSelected = $derived(() => {
    const paginated = paginatedData();
    if (paginated.length === 0) return false;
    return paginated.every((row, index) => {
      const rowId = row.id ?? `row-${(currentPage - 1) * pageSize + index}`;
      return selectedRows.has(rowId);
    });
  });

  // Check if some (but not all) visible rows are selected
  const someSelected = $derived(() => {
    const paginated = paginatedData();
    if (paginated.length === 0) return false;
    const selectedCount = paginated.filter((row, index) => {
      const rowId = row.id ?? `row-${(currentPage - 1) * pageSize + index}`;
      return selectedRows.has(rowId);
    }).length;
    return selectedCount > 0 && selectedCount < paginated.length;
  });

  // Reset to first page when search changes
  $effect(() => {
    // Access searchQuery to track it
    searchQuery;
    currentPage = 1;
  });

  // Handle column sort
  function handleSort(column) {
    if (!column.sortable) return;

    if (sortColumn === column.key) {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      sortColumn = column.key;
      sortDirection = "asc";
    }

    // Reset to first page when sorting
    currentPage = 1;
  }

  // Handle page change
  function goToPage(page) {
    if (page >= 1 && page <= totalPages) {
      currentPage = page;
    }
  }

  // Handle row selection
  function toggleRowSelection(rowId) {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(rowId)) {
      newSelected.delete(rowId);
    } else {
      newSelected.add(rowId);
    }
    selectedRows = newSelected;
    onselectionchange?.(Array.from(selectedRows));
  }

  // Handle select all
  function toggleSelectAll() {
    const newSelected = new Set(selectedRows);
    const paginated = paginatedData();

    if (allSelected()) {
      // Deselect all visible rows
      paginated.forEach((row, index) => {
        const rowId = row.id ?? `row-${(currentPage - 1) * pageSize + index}`;
        newSelected.delete(rowId);
      });
    } else {
      // Select all visible rows
      paginated.forEach((row, index) => {
        const rowId = row.id ?? `row-${(currentPage - 1) * pageSize + index}`;
        newSelected.add(rowId);
      });
    }

    selectedRows = newSelected;
    onselectionchange?.(Array.from(selectedRows));
  }

  // Get cell value with optional render function
  function getCellValue(row, column) {
    const value = row[column.key];
    if (column.render) {
      return column.render(value, row);
    }
    return value ?? "";
  }

  // Get row ID
  function getRowId(row, index) {
    return row.id ?? `row-${(currentPage - 1) * pageSize + index}`;
  }

  // Clear search
  function clearSearch() {
    searchQuery = "";
  }
</script>

<div class="data-table-container" {...restProps}>
  <!-- Search bar -->
  {#if searchable}
    <div class="data-table-search">
      <div class="search-input-wrapper">
        <svg
          class="search-icon"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          bind:value={searchQuery}
          placeholder={searchPlaceholder}
          class="search-input"
          aria-label="Search table"
        />
        {#if searchQuery}
          <button
            type="button"
            class="search-clear"
            onclick={clearSearch}
            aria-label="Clear search"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Table wrapper for horizontal scroll -->
  <div class="table-wrapper scrollbar-thin">
    <table class="data-table" role="grid" aria-busy={loading}>
      <thead>
        <tr>
          {#if selectable}
            <th class="checkbox-cell" scope="col">
              <input
                type="checkbox"
                checked={allSelected()}
                indeterminate={someSelected()}
                onchange={toggleSelectAll}
                aria-label="Select all rows"
                class="row-checkbox"
              />
            </th>
          {/if}

          {#each columns as column}
            <th
              scope="col"
              class:sortable={column.sortable}
              style={column.width ? `width: ${column.width}` : ""}
              onclick={() => handleSort(column)}
              onkeydown={(e) => e.key === "Enter" && handleSort(column)}
              tabindex={column.sortable ? 0 : undefined}
              aria-sort={sortColumn === column.key
                ? sortDirection === "asc"
                  ? "ascending"
                  : "descending"
                : undefined}
            >
              <div class="th-content">
                <span>{column.label}</span>
                {#if column.sortable}
                  <span class="sort-indicator" aria-hidden="true">
                    {#if sortColumn === column.key}
                      {#if sortDirection === "asc"}
                        <svg
                          class="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          stroke-width="2"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M5 15l7-7 7 7"
                          />
                        </svg>
                      {:else}
                        <svg
                          class="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          stroke-width="2"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      {/if}
                    {:else}
                      <svg
                        class="w-4 h-4 opacity-30"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                        />
                      </svg>
                    {/if}
                  </span>
                {/if}
              </div>
            </th>
          {/each}
        </tr>
      </thead>

      <tbody>
        {#if loading}
          <!-- Loading state -->
          <tr>
            <td
              colspan={columns.length + (selectable ? 1 : 0)}
              class="loading-cell"
            >
              <div class="loading-spinner">
                <svg
                  class="animate-spin w-6 h-6 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  />
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Loading...</span>
              </div>
            </td>
          </tr>
        {:else if paginatedData().length === 0}
          <!-- Empty state -->
          <tr>
            <td
              colspan={columns.length + (selectable ? 1 : 0)}
              class="empty-cell"
            >
              <div class="empty-state">
                <svg
                  class="w-12 h-12 text-muted-foreground/50"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="1"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
                <span>{emptyMessage}</span>
              </div>
            </td>
          </tr>
        {:else}
          {#each paginatedData() as row, index (getRowId(row, index))}
            {@const rowId = getRowId(row, index)}
            {@const isSelected = selectedRows.has(rowId)}
            <tr
              class:selected={isSelected}
              class:cursor-pointer={!!onrowclick}
              onclick={() => onrowclick?.(row)}
            >
              {#if selectable}
                <td class="checkbox-cell">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onchange={() => toggleRowSelection(rowId)}
                    aria-label="Select row"
                    class="row-checkbox"
                  />
                </td>
              {/if}

              {#each columns as column}
                <td>
                  {getCellValue(row, column)}
                </td>
              {/each}
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  <!-- Pagination -->
  {#if totalPages > 1 && !loading}
    <div class="pagination">
      <div class="pagination-info">
        Showing {(currentPage - 1) * pageSize + 1} to {Math.min(
          currentPage * pageSize,
          sortedData().length,
        )} of {sortedData().length} entries
      </div>

      <div class="pagination-controls">
        <button
          type="button"
          class="pagination-btn"
          disabled={currentPage === 1}
          onclick={() => goToPage(currentPage - 1)}
          aria-label="Previous page"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        {#each pageNumbers() as page}
          {#if page === "..."}
            <span class="pagination-ellipsis">...</span>
          {:else}
            <button
              type="button"
              class="pagination-btn"
              class:active={currentPage === page}
              onclick={() => goToPage(page)}
              aria-label="Page {page}"
              aria-current={currentPage === page ? "page" : undefined}
            >
              {page}
            </button>
          {/if}
        {/each}

        <button
          type="button"
          class="pagination-btn"
          disabled={currentPage === totalPages}
          onclick={() => goToPage(currentPage + 1)}
          aria-label="Next page"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .data-table-container {
    width: 100%;
    background: linear-gradient(
      135deg,
      hsl(var(--card)) 0%,
      hsl(0 0% 10%) 100%
    );
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius);
    overflow: hidden;
  }

  /* Search */
  .data-table-search {
    padding: 1rem;
    border-bottom: 1px solid hsl(var(--border));
  }

  .search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    max-width: 300px;
  }

  .search-icon {
    position: absolute;
    left: 0.75rem;
    width: 1rem;
    height: 1rem;
    color: hsl(var(--muted-foreground));
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    height: 2.25rem;
    padding: 0 2rem 0 2.25rem;
    background-color: hsl(var(--input));
    border: 1px solid hsl(var(--border));
    border-radius: 0.5rem;
    color: hsl(var(--foreground));
    font-size: 0.875rem;
    transition: all 150ms ease;
  }

  .search-input::placeholder {
    color: hsl(var(--muted-foreground) / 0.5);
  }

  .search-input:focus {
    outline: none;
    border-color: hsl(var(--primary));
    box-shadow: 0 0 0 1px hsl(var(--primary));
  }

  .search-clear {
    position: absolute;
    right: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 0.25rem;
    color: hsl(var(--muted-foreground));
    transition: all 150ms ease;
  }

  .search-clear:hover {
    background-color: hsl(var(--secondary));
    color: hsl(var(--foreground));
  }

  /* Table wrapper */
  .table-wrapper {
    overflow-x: auto;
  }

  /* Table */
  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  /* Header */
  .data-table thead {
    position: sticky;
    top: 0;
    z-index: 1;
    background-color: hsl(var(--card));
  }

  .data-table th {
    padding: 0.75rem 1rem;
    text-align: left;
    font-weight: 500;
    color: hsl(var(--muted-foreground));
    border-bottom: 1px solid hsl(var(--border));
    white-space: nowrap;
  }

  .data-table th.sortable {
    cursor: pointer;
    user-select: none;
    transition: color 150ms ease;
  }

  .data-table th.sortable:hover {
    color: hsl(var(--foreground));
  }

  .data-table th.sortable:focus-visible {
    outline: 2px solid hsl(var(--primary));
    outline-offset: -2px;
  }

  .th-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .sort-indicator {
    display: flex;
    align-items: center;
    color: hsl(var(--primary));
  }

  /* Body */
  .data-table td {
    padding: 0.75rem 1rem;
    color: hsl(var(--foreground));
    border-bottom: 1px solid hsl(var(--border) / 0.5);
  }

  .data-table tbody tr {
    transition: background-color 150ms ease;
  }

  .data-table tbody tr:hover {
    background-color: hsl(var(--secondary) / 0.3);
  }

  .data-table tbody tr.selected {
    background-color: hsl(var(--primary) / 0.1);
  }

  .data-table tbody tr:last-child td {
    border-bottom: none;
  }

  /* Checkbox cell */
  .checkbox-cell {
    width: 3rem;
    text-align: center;
  }

  .row-checkbox {
    width: 1rem;
    height: 1rem;
    border-radius: 0.25rem;
    border: 1px solid hsl(var(--border));
    background-color: transparent;
    cursor: pointer;
    accent-color: hsl(var(--primary));
  }

  .row-checkbox:focus-visible {
    outline: 2px solid hsl(var(--primary));
    outline-offset: 2px;
  }

  /* Loading state */
  .loading-cell {
    padding: 3rem 1rem;
    text-align: center;
  }

  .loading-spinner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    color: hsl(var(--muted-foreground));
  }

  /* Empty state */
  .empty-cell {
    padding: 3rem 1rem;
    text-align: center;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    color: hsl(var(--muted-foreground));
  }

  /* Pagination */
  .pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-top: 1px solid hsl(var(--border));
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .pagination-info {
    font-size: 0.75rem;
    color: hsl(var(--muted-foreground));
  }

  .pagination-controls {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .pagination-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 2rem;
    height: 2rem;
    padding: 0 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: hsl(var(--muted-foreground));
    background-color: transparent;
    border: 1px solid transparent;
    transition: all 150ms ease;
  }

  .pagination-btn:hover:not(:disabled) {
    background-color: hsl(var(--secondary));
    color: hsl(var(--foreground));
  }

  .pagination-btn:focus-visible {
    outline: 2px solid hsl(var(--primary));
    outline-offset: 2px;
  }

  .pagination-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .pagination-btn.active {
    background-color: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    border-color: hsl(var(--primary));
  }

  .pagination-ellipsis {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 2rem;
    height: 2rem;
    color: hsl(var(--muted-foreground));
  }

  /* Responsive */
  @media (max-width: 640px) {
    .pagination {
      flex-direction: column;
      align-items: stretch;
    }

    .pagination-info {
      text-align: center;
    }

    .pagination-controls {
      justify-content: center;
    }
  }
</style>
