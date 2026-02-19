import './globals.css'
import { Navigation } from './components/Navigation'

export const metadata = {
  title: 'Options Scanner',
  description: 'Options scanning and portfolio tracking',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0b1224] text-[#e6edf7] min-h-screen">
        <Navigation />
        <main className="min-h-screen">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  )
}
