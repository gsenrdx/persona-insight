'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Plus, Edit, Trash2, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'

interface Company {
  id: string
  name: string
  description?: string
  domains: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

interface CompanyFormData {
  name: string
  description: string
  domains: string
}

function CompanyForm({ 
  company, 
  onClose 
}: { 
  company?: Company, 
  onClose: () => void 
}) {
  const { session } = useAuth()
  const [formData, setFormData] = useState<CompanyFormData>({
    name: company?.name || '',
    description: company?.description || '',
    domains: company?.domains.join(', ') || ''
  })
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: async (data: CompanyFormData) => {
      const response = await fetch('/api/admin/companies', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          ...data,
          domains: data.domains.split(',').map(d => d.trim()).filter(Boolean)
        })
      })
      if (!response.ok) throw new Error('회사 생성에 실패했습니다')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] })
      toast.success('회사가 성공적으로 생성되었습니다')
      onClose()
    },
    onError: () => {
      toast.error('회사 생성에 실패했습니다')
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (data: CompanyFormData) => {
      const response = await fetch(`/api/admin/companies/${company?.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          ...data,
          domains: data.domains.split(',').map(d => d.trim()).filter(Boolean)
        })
      })
      if (!response.ok) throw new Error('회사 수정에 실패했습니다')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] })
      toast.success('회사 정보가 성공적으로 수정되었습니다')
      onClose()
    },
    onError: () => {
      toast.error('회사 정보 수정에 실패했습니다')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (company) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">회사명 *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>
      <div>
        <Label htmlFor="description">설명</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="회사 설명을 입력하세요"
        />
      </div>
      <div>
        <Label htmlFor="domains">도메인 (쉼표로 구분)</Label>
        <Input
          id="domains"
          value={formData.domains}
          onChange={(e) => setFormData({ ...formData, domains: e.target.value })}
          placeholder="example.com, subdomain.example.com"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          취소
        </Button>
        <Button 
          type="submit" 
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {company ? '수정' : '생성'}
        </Button>
      </div>
    </form>
  )
}

export default function CompanyManagement() {
  const { session } = useAuth()
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: companies = [], isLoading, error } = useQuery({
    queryKey: ['admin-companies'],
    queryFn: async (): Promise<Company[]> => {
      const response = await fetch('/api/admin/companies', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })
      if (!response.ok) throw new Error('회사 목록을 불러오는데 실패했습니다')
      return response.json()
    },
    enabled: !!session?.access_token
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/companies/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })
      if (!response.ok) throw new Error('회사 삭제에 실패했습니다')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] })
      toast.success('회사가 성공적으로 삭제되었습니다')
    },
    onError: () => {
      toast.error('회사 삭제에 실패했습니다')
    }
  })

  const handleEdit = (company: Company) => {
    setSelectedCompany(company)
    setIsFormOpen(true)
  }

  const handleDelete = (company: Company) => {
    if (confirm(`정말로 "${company.name}" 회사를 삭제하시겠습니까?`)) {
      deleteMutation.mutate(company.id)
    }
  }

  const handleCloseForm = () => {
    setSelectedCompany(null)
    setIsFormOpen(false)
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">회사 목록을 불러오는데 실패했습니다.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              회사 관리
            </CardTitle>
            <CardDescription>
              시스템에 등록된 회사들을 관리할 수 있습니다.
            </CardDescription>
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setSelectedCompany(null)}>
                <Plus className="h-4 w-4 mr-2" />
                새 회사 추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {selectedCompany ? '회사 정보 수정' : '새 회사 추가'}
                </DialogTitle>
                <DialogDescription>
                  {selectedCompany ? '회사 정보를 수정합니다.' : '새로운 회사를 시스템에 추가합니다.'}
                </DialogDescription>
              </DialogHeader>
              <CompanyForm company={selectedCompany || undefined} onClose={handleCloseForm} />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>회사명</TableHead>
              <TableHead>설명</TableHead>
              <TableHead>도메인</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>생성일</TableHead>
              <TableHead className="text-right">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company) => (
              <TableRow key={company.id}>
                <TableCell className="font-medium">{company.name}</TableCell>
                <TableCell>{company.description || '-'}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {company.domains.map((domain) => (
                      <Badge key={domain} variant="secondary" className="text-xs">
                        {domain}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={company.is_active ? 'default' : 'secondary'}>
                    {company.is_active ? '활성' : '비활성'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(company.created_at).toLocaleDateString('ko-KR')}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(company)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(company)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {companies.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            등록된 회사가 없습니다.
          </div>
        )}
      </CardContent>
    </Card>
  )
} 