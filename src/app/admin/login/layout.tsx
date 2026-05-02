import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Acceso Admin | TorneoPadel',
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
