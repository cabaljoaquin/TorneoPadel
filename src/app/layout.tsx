import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    template: '%s | TorneoPadel',
    default:  'TorneoPadel — Seguí tu torneo en vivo',
  },
  description: 'Plataforma de gestión y seguimiento de torneos de padel amateur.',
  keywords:    ['padel', 'torneo', 'resultados', 'llaves', 'grupos'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
