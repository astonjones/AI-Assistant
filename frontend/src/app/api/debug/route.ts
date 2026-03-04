import { NextResponse } from "next/server";

/**
 * GET /api/debug
 * Returns non-sensitive env config so you can verify what Vercel actually sees.
 * Remove this file once everything is working.
 */
export async function GET() {
  const config = {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "(not set)",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "(not set)",
    API_URL: process.env.API_URL ?? "(not set)",
    AUTH_URL: process.env.AUTH_URL ?? "(not set)",
    // Only show presence, never the actual secrets
    AUTH_SECRET: process.env.AUTH_SECRET ? "✓ set" : "✗ MISSING",
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? "✓ set" : "✗ not set",
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? "✓ set" : "✗ not set",
    NODE_ENV: process.env.NODE_ENV,
  };

  console.log("[debug] Config check:", JSON.stringify(config, null, 2));

  return NextResponse.json(config);
}
