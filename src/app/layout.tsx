import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    template: '%s | TorneoTenis',
    default:  'TorneoTenis — Seguí tu torneo en vivo',
  },
  description: 'Plataforma de gestión y seguimiento de torneos de tenis amateur.',
  keywords:    ['tenis', 'torneo', 'resultados', 'llaves', 'grupos'],
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
