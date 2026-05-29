import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { RealtimeContextProvider } from '@/components/RealtimeContext'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ミニ農園モニタリング',
  description: 'ESP32センサーデータのリアルタイム監視',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <RealtimeContextProvider>{children}</RealtimeContextProvider>
      </body>
    </html>
  )
}
