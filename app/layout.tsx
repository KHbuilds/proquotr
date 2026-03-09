import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ProQuotr — Professional quotes in 60 seconds',
  description: 'Send branded PDF quotes and invoices in under 60 seconds from your phone.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 min-h-screen">
        {children}
      </body>
    </html>
  )
}
