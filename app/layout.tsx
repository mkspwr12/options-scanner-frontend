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
    <html lang="en">
      <body>
        <Navigation />
        <main className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  )
}
