const accessCodes = ['ACCOUNT_NOT_APPROVED', 'EMAIL_VERIFICATION_REQUIRED', 'UNAUTHENTICATED'];

// Production Convex errors hide server messages but retain ConvexError.data.
// Read that structured value before the development/locally generated message.
export function accessErrorCode(error) {
  const data = error?.data;
  if (typeof data === 'string' && accessCodes.includes(data)) return data;
  if (data && typeof data === 'object' && accessCodes.includes(data.code)) return data.code;
  const message = String(error);
  return accessCodes.find(code => new RegExp(`\\b${code}\\b`).test(message)) || null;
}
