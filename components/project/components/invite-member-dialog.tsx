'use client'

import { useState, useEffect } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, UserPlus, Users, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { useProject } from '@/hooks/use-projects'
import { toast } from 'sonner'

interface InviteMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  currentMembers: string[] // Current member user IDs
  onInvite: (userIds: string[]) => Promise<void>
}

interface CompanyMember {
  id: string
  name: string
  avatar_url?: string | null
}

export function InviteMemberDialog({
  open,
  onOpenChange,
  projectId,
  currentMembers,
  onInvite
}: InviteMemberDialogProps) {
  const { profile } = useAuth()
  const { data: project } = useProject(projectId)
  const [activeTab, setActiveTab] = useState('members')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([])
  const [loading, setLoading] = useState(false)
  const [inviting, setInviting] = useState(false)

  // Load company members when dialog opens
  useEffect(() => {
    if (open && profile?.company_id) {
      loadCompanyMembers()
    }
  }, [open, profile?.company_id])

  const loadCompanyMembers = async () => {
    if (!profile?.company_id) return

    setLoading(true)
    try {
      const { data: members, error } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .eq('company_id', profile.company_id)
        .not('id', 'in', `(${currentMembers.join(',')})`) // Exclude current members
        .order('name', { ascending: true })

      if (error) throw error
      setCompanyMembers(members || [])
    } catch (error) {
      toast.error('회사 멤버를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async () => {
    if (selectedUsers.length === 0) {
      toast.error('초대할 멤버를 선택해주세요')
      return
    }

    setInviting(true)
    try {
      await onInvite(selectedUsers)
      setSelectedUsers([])
      onOpenChange(false)
      toast.success(`${selectedUsers.length}명의 멤버를 초대했습니다`)
    } catch (error) {
      toast.error('멤버 초대에 실패했습니다')
    } finally {
      setInviting(false)
    }
  }

  const filteredMembers = companyMembers.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleMemberSelection = (memberId: string) => {
    setSelectedUsers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    )
  }

  const selectAll = () => {
    setSelectedUsers(filteredMembers.map(m => m.id))
  }

  const deselectAll = () => {
    setSelectedUsers([])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>멤버 초대</DialogTitle>
          <DialogDescription>
            {project?.name} 프로젝트에 멤버를 초대합니다
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="members">
              <Users className="w-4 h-4 mr-2" />
              회사 멤버
            </TabsTrigger>
            <TabsTrigger value="email">
              <UserPlus className="w-4 h-4 mr-2" />
              이메일 초대
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="이름으로 검색"
                className="pl-9"
              />
            </div>

            {/* Select all/none */}
            {filteredMembers.length > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {selectedUsers.length}명 선택됨
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="link"
                    size="sm"
                    onClick={selectAll}
                    className="h-auto p-0"
                  >
                    모두 선택
                  </Button>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={deselectAll}
                    className="h-auto p-0"
                  >
                    선택 해제
                  </Button>
                </div>
              </div>
            )}

            {/* Members list */}
            <ScrollArea className="h-[300px] pr-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    {searchQuery
                      ? '검색 결과가 없습니다'
                      : '초대 가능한 멤버가 없습니다'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredMembers.map((member) => (
                    <label
                      key={member.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedUsers.includes(member.id)}
                        onCheckedChange={() => toggleMemberSelection(member.id)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {member.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {member.name}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={inviting}
              >
                취소
              </Button>
              <Button
                onClick={handleInvite}
                disabled={selectedUsers.length === 0 || inviting}
              >
                {inviting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    초대 중...
                  </>
                ) : (
                  `${selectedUsers.length}명 초대`
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">이메일 주소</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  className="mt-1"
                  disabled
                />
              </div>
              <p className="text-sm text-muted-foreground">
                이메일 초대 기능은 준비 중입니다
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}