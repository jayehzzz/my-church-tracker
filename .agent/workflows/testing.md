---
description: How to run and check tests
---

# Testing Workflow

## Run All Tests
// turbo
```bash
npm run test
```
This runs Vitest in watch mode.

---

## Run Tests Once (CI)
// turbo
```bash
npm run test:unit
```

---

## Run with Coverage
```bash
npm run test:coverage
```

---

## Run Specific Test File
```bash
npx vitest run src/tests/Button.test.js
```

---

## Write New Tests

1. Create file in `src/tests/[Component].test.js`
2. Follow patterns in `skills/testing_patterns`
3. Run tests to verify

---

## Before Committing

// turbo
```bash
npm run test:unit && npm run build
```
Ensure tests pass and build succeeds.
