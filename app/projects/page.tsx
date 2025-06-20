import AuthGuard from "@/components/auth/auth-guard"
import { ProjectPageContent } from "@/components/project/pages/project-page-content"

export default function ProjectListPage() {
  return (
    <AuthGuard>
      <div className="relative min-h-screen bg-gradient-to-b from-background to-muted/20 overflow-hidden">
        {/* 배경 장식 요소 */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none" />
        <div className="absolute top-20 -left-96 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-1/2 -right-96 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
        
        <ProjectPageContent />
      </div>
    </AuthGuard>
  )
} 