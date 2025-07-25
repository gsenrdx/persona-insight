'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings } from 'lucide-react'

export default function SystemSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          시스템 설정
        </CardTitle>
        <CardDescription>
          시스템 전반적인 설정을 관리할 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">시스템 설정 기능은 곧 제공될 예정입니다.</p>
      </CardContent>
    </Card>
  )
} 