import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'System Admin | Persona Insight',
  description: '시스템 관리자 페이지',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 