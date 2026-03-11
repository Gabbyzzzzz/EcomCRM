import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

// ─── Rate limiter for AI endpoints ──────────────────────────────────────────
const WINDOW_MS = 60 * 60 * 1000 // 1 hour
const MAX_REQUESTS = 10
const hits = new Map<string, { count: number; resetAt: number }>()

setInterval(() => {
  const now = Date.now()
  hits.forEach((val, key) => {
    if (now > val.resetAt) hits.delete(key)
  })
}, 10 * 60 * 1000)

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = hits.get(ip)
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  entry.count++
  return entry.count > MAX_REQUESTS
}

// ─── AI endpoint detection ──────────────────────────────────────────────────
const AI_PATHS = ["/api/customers/", "/api/automations/"]
const AI_SUFFIXES = ["/insights", "/generate-copy"]

function isAiEndpoint(pathname: string): boolean {
  return AI_PATHS.some((prefix) =>
    pathname.startsWith(prefix) &&
    AI_SUFFIXES.some((suffix) => pathname.endsWith(suffix))
  )
}

// ─── Demo mode ──────────────────────────────────────────────────────────────
const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true"

// ─── Middleware ──────────────────────────────────────────────────────────────
export default auth((req) => {
  const { pathname } = req.nextUrl

  // Demo mode — skip auth, only enforce rate limits
  if (isDemo) {
    // Redirect /login to / in demo mode (no login needed)
    if (pathname === "/login") {
      return NextResponse.redirect(new URL("/", req.url))
    }
  } else {
    // Production: enforce auth
    const isPublic =
      pathname === "/login" ||
      pathname.startsWith("/api/auth") ||
      pathname.startsWith("/api/webhooks") ||
      pathname.startsWith("/api/track") ||
      pathname.startsWith("/api/inngest") ||
      pathname === "/api/unsubscribe" ||
      pathname.startsWith("/unsubscribe") ||
      pathname.startsWith("/_next") ||
      pathname === "/favicon.ico"

    if (!isPublic && !req.auth) {
      const loginUrl = new URL("/login", req.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Rate limit AI endpoints
  if (isAiEndpoint(pathname)) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown"

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        { status: 429 }
      )
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
