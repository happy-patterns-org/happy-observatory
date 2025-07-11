import { ErrorBoundary } from '@/components/error-boundary'
import { NonceProvider } from '@/components/nonce-provider'
import { BroadcastMonitorProvider } from '@/components/providers/broadcast-monitor-provider'
import { SWRProvider } from '@/components/providers/swr-provider'
import { cn } from '@/lib/utils'
import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { headers } from 'next/headers'
// import Script from 'next/script' // Not used
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Happy Observatory - Agentic Development Control Center',
  description: 'Monitor and control Happy-DevKit agents in real-time',
  keywords: ['devkit', 'agents', 'monitoring', 'dashboard'],
  authors: [{ name: 'Happy DevKit Team' }],
  creator: 'Happy DevKit',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get nonce from headers set by middleware
  const nonce = headers().get('x-nonce')

  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={cn(
          'min-h-screen bg-stone-200 font-sans antialiased',
          inter.variable,
          jetbrainsMono.variable
        )}
      >
        {/* Theme setup without Script component to avoid hydration issues */}
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Required for theme initialization before hydration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Theme initialization script
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark')
                } else {
                  document.documentElement.classList.remove('dark')
                }
              } catch (_) {}
            `,
          }}
        />
        <NonceProvider {...(nonce && { nonce })}>
          <SWRProvider>
            <BroadcastMonitorProvider>
              <ErrorBoundary>{children}</ErrorBoundary>
              <Toaster position="top-right" richColors />
            </BroadcastMonitorProvider>
          </SWRProvider>
        </NonceProvider>
      </body>
    </html>
  )
}
