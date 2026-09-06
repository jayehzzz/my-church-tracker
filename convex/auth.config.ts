import type { AuthConfig } from "convex/server";

// Auth0 validates Google sign-in; Convex validates the resulting ID token.
// No configured provider means every API remains unauthenticated (fail closed).
export default {
  providers: process.env.AUTH0_DOMAIN && process.env.AUTH0_CLIENT_ID ? [{
    domain: `https://${process.env.AUTH0_DOMAIN}/`,
    applicationID: process.env.AUTH0_CLIENT_ID,
  }] : [],
} satisfies AuthConfig;
