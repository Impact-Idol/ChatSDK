'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getChatConfig, validateConfig } from '@/lib/chat-config';

export default function Home() {
  const [configStatus, setConfigStatus] = useState<{
    valid: boolean;
    errors: string[];
  } | null>(null);

  useEffect(() => {
    const config = getChatConfig();
    setConfigStatus(validateConfig(config));
  }, []);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <div
        style={{
          maxWidth: '600px',
          width: '100%',
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        }}
      >
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            marginBottom: '1rem',
          }}
        >
          ChatSDK Next.js Example
        </h1>

        <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
          This example demonstrates how to integrate ChatSDK with Next.js App
          Router.
        </p>

        {configStatus && !configStatus.valid && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <h3
              style={{
                color: '#dc2626',
                fontWeight: '600',
                marginBottom: '0.5rem',
              }}
            >
              Configuration Required
            </h3>
            <ul style={{ color: '#7f1d1d', paddingLeft: '1.25rem' }}>
              {configStatus.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
            <p
              style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: '#991b1b' }}
            >
              Copy <code>.env.example</code> to <code>.env.local</code> and fill
              in the values.
            </p>
          </div>
        )}

        {configStatus?.valid && (
          <div
            style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <p style={{ color: '#166534' }}>
              Configuration is valid. You can start chatting!
            </p>
          </div>
        )}

        <Link
          href="/chat"
          style={{
            display: 'inline-block',
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: '500',
          }}
        >
          Open Chat
        </Link>

        <div style={{ marginTop: '2rem', borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' }}>
          <h2 style={{ fontWeight: '600', marginBottom: '1rem' }}>Features</h2>
          <ul style={{ color: '#6b7280', lineHeight: '1.75', paddingLeft: '1.25rem' }}>
            <li>Next.js 15 App Router</li>
            <li>React 19</li>
            <li>@chatsdk/react hooks</li>
            <li>React Query for data fetching</li>
            <li>WebSocket real-time updates</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
