import { NextRequest, NextResponse } from "next/server";

// Simple in-memory rate limiter for AI endpoints
// 10 requests per hour per IP
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 10;

const hits = new Map<string, { count: number; resetAt: number }>();

// Cleanup stale entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  hits.forEach((val, key) => {
    if (now > val.resetAt) hits.delete(key);
  });
}, 10 * 60 * 1000);

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);

  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > MAX_REQUESTS;
}

export function middleware(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/customers/:id/insights", "/api/automations/:id/generate-copy"],
};
