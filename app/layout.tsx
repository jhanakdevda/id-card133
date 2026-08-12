import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Playfair_Display, Victor_Mono } from 'next/font/google'
import './globals.css'

const displaySerif = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display-serif',
  weight: ['700', '800', '900'],
  display: 'swap',
})

const victorMono = Victor_Mono({
  subsets: ['latin'],
  variable: '--font-mono-victor',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Hacker House Goa 2026 — Frame Generator',
  description:
    'Less noise. More signal. Drop a photo and get an instant, on-brand Hacker House Goa 2026 ID frame. Download it and share to X with #FrameInGoa.',
  generator: 'v0.app',
  openGraph: {
    title: 'Hacker House Goa 2026 — #FrameInGoa',
    description:
      'Make your Hacker House Goa 2026 builder frame in seconds. Less noise, more signal. #FrameInGoa',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hacker House Goa 2026 — #FrameInGoa',
    description:
      'Make your Hacker House Goa 2026 builder frame in seconds. #FrameInGoa',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#064026',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`dark bg-background ${displaySerif.variable} ${victorMono.variable}`}
    >
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
