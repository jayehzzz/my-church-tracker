import { expect, it } from 'vitest';
import { ConvexError } from 'convex/values';
import { accessErrorCode } from './errors.js';

it('reads access reasons even when production hides the server message', () => {
  for (const code of ['ACCOUNT_NOT_APPROVED', 'EMAIL_VERIFICATION_REQUIRED', 'UNAUTHENTICATED']) {
    const error = new ConvexError(code);
    error.message = '[CONVEX Q(access:me)] Server Error';
    expect(accessErrorCode(error)).toBe(code);
  }
});

it('retains local errors and does not classify an unrelated failure as missing approval', () => {
  expect(accessErrorCode(new Error('UNAUTHENTICATED'))).toBe('UNAUTHENTICATED');
  expect(accessErrorCode(new Error('Server Error'))).toBeNull();
  expect(accessErrorCode({ data: 'DATABASE_UNAVAILABLE' })).toBeNull();
});
