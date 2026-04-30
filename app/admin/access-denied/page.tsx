'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const messages: Record<string, { heading: string; body: string }> = {
  unauthorized: {
    heading: 'Access denied',
    body: 'Your account does not have permission to access the admin panel.',
  },
  auth: {
    heading: 'Authentication failed',
    body: 'Something went wrong during sign-in. Please try again.',
  },
  missing_code: {
    heading: 'Invalid link',
    body: 'This sign-in link is invalid or has already been used.',
  },
}

function AccessDeniedContent() {
  const params = useSearchParams()
  const reason = params.get('reason') ?? 'unauthorized'
  const { heading, body } = messages[reason] ?? messages.unauthorized

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-background-tertiary)',
      fontFamily: 'var(--font-sans)',
      padding: '2rem',
    }}>
      <div style={{
        background: 'var(--color-background-primary)',
        border: '0.5px solid var(--color-border-tertiary)',
        borderRadius: 'var(--border-radius-lg)',
        padding: '2.5rem 3rem',
        maxWidth: 400,
        width: '100%',
        textAlign: 'center',
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'var(--color-background-danger)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          fontSize: 22,
        }}>
          ✕
        </div>

        <h1 style={{
          fontSize: 18,
          fontWeight: 500,
          color: 'var(--color-text-primary)',
          margin: '0 0 8px',
        }}>
          {heading}
        </h1>

        <p style={{
          fontSize: 13,
          color: 'var(--color-text-secondary)',
          margin: '0 0 2rem',
          lineHeight: 1.6,
        }}>
          {body}
        </p>

        <a href="/" style={{
          display: 'inline-block',
          padding: '8px 20px',
          fontSize: 13,
          color: 'var(--color-text-secondary)',
          border: '0.5px solid var(--color-border-secondary)',
          borderRadius: 'var(--border-radius-md)',
          textDecoration: 'none',
        }}>
          ← Back to home
        </a>
      </div>
    </div>
  )
}

export default function AccessDeniedPage() {
  return (
    <Suspense>
      <AccessDeniedContent />
    </Suspense>
  )
}