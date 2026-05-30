import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { RealtimeContextProvider } from '@/components/RealtimeContext'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
})

export const metadata: Metadata = {
  title: 'Mini Farm',
  description: 'ESP32センサーデータのリアルタイム監視',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={`${inter.className} ${jetbrainsMono.variable}`}>
        <RealtimeContextProvider>{children}</RealtimeContextProvider>
      </body>
    </html>
  )
}
