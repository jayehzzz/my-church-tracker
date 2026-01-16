---
description: Implement a new full-stack feature using Convex and SvelteKit.
---

# Add Convex Feature

Follow this workflow to add a new feature backed by Convex.

## 1. Database Schema (`convex/schema.ts`)
- Add new tables or fields.
- **Rule**: Use `v.id("table")` for references.
- **Rule**: Index fields that will be queried often (e.g. `by_email`).

## 2. Backend Logic (`convex/[module].ts`)
- **Queries**: Use `query({})` for read-only.
- **Mutations**: Use `mutation({})` for writes.
- **Validation**: Validate all `args` using `v`.
- **Return**: Return flat objects or standard data structures.

## 3. Frontend Service (`src/lib/services/[feature]Service.js`)
- Create a service wrapper in typical JS (not TS unless requested) to keep UI clean.
- `export const [feature]Service = { ... }`
- **Pattern**: 
  ```javascript
  // src/lib/services/exampleService.js
  import { convex } from '$lib/convex';
  import { api } from '$convex/_generated/api';

  export const exampleService = {
      async getData(id) {
          return await convex.query(api.example.get, { id });
      },
      async updateData(id, data) {
          return await convex.mutation(api.example.update, { id, ...data });
      }
  };
  ```

## 4. UI Implementation
- Import service.
- If using `convex-svelte` specifically for reactivity:
  ```javascript
  import { useQuery, useMutation } from "convex-svelte";
  const data = useQuery(api.example.get, { id });
  ```
- **Vital**: Optimistic updates are preferred for "Instant Reactivity".
