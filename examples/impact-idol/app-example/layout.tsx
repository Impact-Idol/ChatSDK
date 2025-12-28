/**
 * Impact Idol Root Layout - ChatSDK Integration
 *
 * This is the root layout that wraps your entire Impact Idol application.
 * Copy this to your Impact Idol project: app/layout.tsx
 */

import { ChatProvider } from '@chatsdk/react';
import { impactIdolTheme, themeToCSSVariables } from '@chatsdk/react';
import { ChatClient } from '@chatsdk/core';
import { WorkspaceSwitcher } from '@chatsdk/react';
import './globals.css';

// Initialize ChatSDK client
// This should be done once at the app level
const chatClient = new ChatClient({
  apiUrl: process.env.NEXT_PUBLIC_CHATSDK_API_URL!,
  apiKey: process.env.NEXT_PUBLIC_CHATSDK_API_KEY!,
  // Optional: Configure connection settings
  options: {
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
  },
});

export const metadata = {
  title: 'Impact Idol - Community Chat',
  description: 'Real-time community messaging for Impact Idol',
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <head>
        {/* Inject ChatSDK theme CSS variables */}
        <style dangerouslySetInnerHTML={{ __html: themeToCSSVariables(impactIdolTheme) }} />
      </head>
      <body className="font-sans antialiased">
        <ChatProvider client={chatClient} theme={impactIdolTheme}>
          <div className="flex h-screen overflow-hidden">
            {/* Sidebar with Workspace Switcher */}
            <aside className="w-64 bg-gradient-to-b from-purple-600 to-purple-800 text-white p-4">
              {/* Workspace Switcher */}
              <div className="mb-6">
                <WorkspaceSwitcher />
              </div>

              {/* Navigation */}
              <nav className="space-y-2">
                <a
                  href="/channels"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <span>Channels</span>
                </a>

                <a
                  href="/direct-messages"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>Direct Messages</span>
                </a>

                <a
                  href="/mentions"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span>Mentions</span>
                </a>

                <a
                  href="/settings"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Settings</span>
                </a>
              </nav>

              {/* User Profile Footer */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="flex items-center gap-3 px-3 py-2 bg-purple-900 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">
                    JD
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">John Doe</p>
                    <p className="text-xs text-purple-300">Online</p>
                  </div>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden">
              {children}
            </main>
          </div>
        </ChatProvider>
      </body>
    </html>
  );
}
