/**
 * Unsubscribe confirmation page.
 *
 * Server Component — no client-side JS required. The undo action uses a
 * standard HTML <form> POST to /api/unsubscribe which handles the resubscribe
 * logic (action=resubscribe flow in the API route).
 *
 * URL patterns:
 *   /unsubscribe?token=xxx&done=true         — Successfully unsubscribed
 *   /unsubscribe?token=xxx&resubscribed=true — Successfully re-subscribed (undo worked)
 *   /unsubscribe?error=invalid               — Invalid or expired token
 */

interface SearchParams {
  token?: string
  done?: string
  resubscribed?: string
  error?: string
  storeName?: string
}

interface Props {
  searchParams: Promise<SearchParams>
}

export default async function UnsubscribePage({ searchParams }: Props) {
  const params = await searchParams
  const { token, done, resubscribed, error, storeName } = params
  const store = storeName ?? 'this store'

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '24px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          padding: '40px',
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
        }}
      >
        {/* ── Error state ─────────────────────────────────────────────────── */}
        {error === 'invalid' && (
          <>
            <div
              style={{
                width: '48px',
                height: '48px',
                backgroundColor: '#fee2e2',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                fontSize: '24px',
              }}
            >
              ✕
            </div>
            <h1
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: '#1f2937',
                marginBottom: '12px',
              }}
            >
              Invalid link
            </h1>
            <p style={{ color: '#6b7280', fontSize: '15px', lineHeight: '1.5', margin: 0 }}>
              This unsubscribe link is invalid or has expired. Please contact us if you need
              help managing your email preferences.
            </p>
          </>
        )}

        {/* ── Unsubscribed state ───────────────────────────────────────────── */}
        {done === 'true' && (
          <>
            <div
              style={{
                width: '48px',
                height: '48px',
                backgroundColor: '#dbeafe',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                fontSize: '24px',
              }}
            >
              ✓
            </div>
            <h1
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: '#1f2937',
                marginBottom: '12px',
              }}
            >
              You&apos;ve been unsubscribed
            </h1>
            <p
              style={{
                color: '#6b7280',
                fontSize: '15px',
                lineHeight: '1.5',
                marginBottom: '32px',
              }}
            >
              You will no longer receive marketing emails from {store}.
            </p>

            {/* Undo / re-subscribe form */}
            <p
              style={{
                color: '#6b7280',
                fontSize: '13px',
                marginBottom: '12px',
              }}
            >
              Changed your mind?
            </p>
            <form method="POST" action="/api/unsubscribe">
              <input type="hidden" name="action" value="resubscribe" />
              {token && <input type="hidden" name="token" value={token} />}
              <button
                type="submit"
                style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 24px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Re-subscribe
              </button>
            </form>
          </>
        )}

        {/* ── Re-subscribed state ──────────────────────────────────────────── */}
        {resubscribed === 'true' && (
          <>
            <div
              style={{
                width: '48px',
                height: '48px',
                backgroundColor: '#d1fae5',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                fontSize: '24px',
              }}
            >
              ✓
            </div>
            <h1
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: '#1f2937',
                marginBottom: '12px',
              }}
            >
              You&apos;re back!
            </h1>
            <p style={{ color: '#6b7280', fontSize: '15px', lineHeight: '1.5', margin: 0 }}>
              You will continue to receive marketing emails from {store}.
            </p>
          </>
        )}

        {/* ── Fallback / no state params ───────────────────────────────────── */}
        {!error && done !== 'true' && resubscribed !== 'true' && (
          <>
            <h1
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: '#1f2937',
                marginBottom: '12px',
              }}
            >
              Email preferences
            </h1>
            <p style={{ color: '#6b7280', fontSize: '15px', lineHeight: '1.5', margin: 0 }}>
              Use the unsubscribe link in any email you received from {store} to manage your
              preferences.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
