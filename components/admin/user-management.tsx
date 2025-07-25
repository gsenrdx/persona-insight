'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users } from 'lucide-react'

export default function UserManagement() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          사용자 관리
        </CardTitle>
        <CardDescription>
          시스템에 등록된 사용자들을 관리할 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">사용자 관리 기능은 곧 제공될 예정입니다.</p>
      </CardContent>
    </Card>
  )
} 