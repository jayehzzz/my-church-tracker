/**
 * Convex Client Configuration
 * 
 * IMPORTANT: Convex requires you to run `npx convex dev` to generate the API.
 * Until then, the app will fall back to mock data.
 * 
 * Setup Steps:
 * 1. Create a Convex project at https://convex.dev
 * 2. Run: npx convex dev
 * 3. Copy the deployment URL to .env file as VITE_CONVEX_URL
 */

const convexUrl = typeof import.meta !== 'undefined'
    ? (import.meta.env?.VITE_CONVEX_URL_PROD || import.meta.env?.VITE_CONVEX_URL)
    : undefined;

// Handle missing environment variables gracefully
// If var is missing, we return null so the app doesn't crash on startup.
// API calls will fail, but the app allows falling back to mock data.
const isConfigured = !!convexUrl;

// We dynamically import Convex to avoid errors if the generated files don't exist
let convexClient = null;

async function getConvexClient() {
    if (!isConfigured) return null;

    if (convexClient) return convexClient;

    try {
        const { ConvexClient } = await import("convex/browser");
        convexClient = new ConvexClient(convexUrl);
        return convexClient;
    } catch (error) {
        console.warn("Could not initialize Convex client:", error.message);
        return null;
    }
}

// Helper to check configuration
export const isConvexConfigured = () => isConfigured;

// Export a function to get the client (async)
export { getConvexClient };

// Export null by default - services should use getConvexClient()
export const convex = null;
