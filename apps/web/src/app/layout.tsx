import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { cn } from '@/lib/utils'
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
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(
        'min-h-screen bg-stone-200 font-sans antialiased',
        inter.variable,
        jetbrainsMono.variable
      )}>
        {children}
      </body>
    </html>
  )
}
