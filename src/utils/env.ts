import dotenv from "dotenv";

// Load environment variables with .env.local precedence in non-production
// Behavior:
// - production: do not load any files; rely on platform env (e.g., Render)
// - non-production: load .env (if present), then .env.local to override

if (process.env.NODE_ENV !== "production") {
  // Load base .env first
  dotenv.config();
  // Then override with .env.local if it exists
  dotenv.config({ path: ".env.local", override: true });
}

// No export needed; importing this module has side effects of loading env

