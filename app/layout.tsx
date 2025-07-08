import type { Metadata } from 'next'
import { Inter as FontSans } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils/index'
import { ThemeProvider, MobileNotSupported } from '@/components/shared'
import { AuthProvider } from '@/hooks/use-auth'
import { QueryProvider } from '@/components/providers/query-provider'
import { Toaster } from 'sonner'

const fontSans = FontSans({ 
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'Persona Insight | MISO',
  description: 'Persona Insight는 고객의 니즈와 행동 패턴을 더 깊이 이해하고 대화할 수 있는 서비스입니다',
  generator: 'Next.js',
  icons: {
    icon: '/logo.svg',
    apple: '/logo.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {

  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={cn('min-h-screen bg-background font-sans antialiased', fontSans.variable)}>
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
              <MobileNotSupported />
              {children}
            </AuthProvider>
            <Toaster 
              position="top-right" 
              richColors 
              visibleToasts={1}
              duration={3000}
              expand={false}
              toastOptions={{
                style: {
                  marginTop: '80px',
                },
                className: 'toast-slide-in',
              }} 
            />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
