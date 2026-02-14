import './globals.css'

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
      <body>{children}</body>
    </html>
  )
}
