import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { WorkbenchProvider } from '@/app/lib/workbench-context'

export const metadata: Metadata = {
  title: 'Workbench',
  description: 'Prompt testing workbench',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <WorkbenchProvider>
          {children}
        </WorkbenchProvider>
      </body>
    </html>
  )
}
