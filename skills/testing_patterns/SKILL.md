---
description: Testing patterns with Vitest for components and services.
---

# Testing Patterns

Guide for writing tests with Vitest.

---

## Setup

Tests are in `src/tests/`. Run with:
```bash
npm run test           # Watch mode
npm run test:unit      # Single run
npm run test:coverage  # With coverage
```

---

## Component Testing

```javascript
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import Button from '$lib/components/ui/Button.svelte';

describe('Button', () => {
  it('renders with text', () => {
    render(Button, { props: { children: 'Click me' } });
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });
  
  it('shows loading state', () => {
    render(Button, { props: { loading: true } });
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

---

## Mocking Convex

```javascript
import { vi } from 'vitest';

vi.mock('$lib/convex', () => ({
  convex: {
    query: vi.fn(),
    mutation: vi.fn(),
  }
}));

// In test
import { convex } from '$lib/convex';

convex.query.mockResolvedValue([{ id: '1', name: 'Test' }]);
```

---

## User Events

```javascript
import { render, screen, fireEvent } from '@testing-library/svelte';

it('handles click', async () => {
  const handleClick = vi.fn();
  render(Button, { props: { onclick: handleClick } });
  
  await fireEvent.click(screen.getByRole('button'));
  expect(handleClick).toHaveBeenCalled();
});
```

---

## Checklist

- [ ] Test component renders
- [ ] Test props change appearance
- [ ] Test user interactions
- [ ] Mock external services
- [ ] Test loading/error states
