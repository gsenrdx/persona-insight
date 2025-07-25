import SuperAdminGuard from '@/components/auth/super-admin-guard'
import AdminDashboard from '@/components/admin/admin-dashboard'

export default function AdminPage() {
  return (
    <SuperAdminGuard>
      <AdminDashboard />
    </SuperAdminGuard>
  )
} 