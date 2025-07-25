'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/hooks/use-auth'

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table'

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

interface User {
  id: string
  name: string
  email: string
  role: 'super_admin' | 'company_admin' | 'company_user'
  company_id: string | null
  created_at: string
  updated_at: string
  companies?: {
    id: string
    name: string
  } | null
}

interface UserEditData {
  role: 'super_admin' | 'company_admin' | 'company_user'
  companyId: string
}

const columnHelper = createColumnHelper<Company>()
const userColumnHelper = createColumnHelper<User>()

// 사이드바 메뉴 아이템들
const sidebarItems = [
  {
    id: 'companies',
    name: '회사 관리',
    icon: '🏢',
    active: true,
  },
  {
    id: 'users',
    name: '사용자 관리',
    icon: '👥',
    active: false,
  },
  {
    id: 'settings',
    name: '시스템 설정',
    icon: '⚙️',
    active: false,
  },
  {
    id: 'analytics',
    name: '통계 분석',
    icon: '📊',
    active: false,
  },
  {
    id: 'logs',
    name: '로그 관리',
    icon: '📝',
    active: false,
  },
]

export default function AdminDashboard() {
  const { session, profile, signOut } = useAuth()
  
  // 회사 관리 상태
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null)
  
  // 사용자 관리 상태
  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isUserEditModalOpen, setIsUserEditModalOpen] = useState(false)
  const [isUserDeleteModalOpen, setIsUserDeleteModalOpen] = useState(false)
  const [userDeleteConfirmText, setUserDeleteConfirmText] = useState('')
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [userEditData, setUserEditData] = useState<UserEditData>({
    role: 'company_user',
    companyId: ''
  })
  
  // 공통 상태
  const [activeMenu, setActiveMenu] = useState('companies')
  const [formData, setFormData] = useState<CompanyFormData>({
    name: '',
    description: '',
    domains: ''
  })
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  
  // 사용자 테이블 상태
  const [userSorting, setUserSorting] = useState<SortingState>([])
  const [userColumnFilters, setUserColumnFilters] = useState<ColumnFiltersState>([])
  const [userGlobalFilter, setUserGlobalFilter] = useState('')

  // 회사 목록 조회
  const fetchCompanies = async () => {
    if (!session?.access_token) return
    
    try {
      const response = await fetch('/api/admin/companies', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setCompanies(data)
      }
    } catch (error) {
      console.error('회사 목록 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  // 회사 생성/수정
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.access_token) return

    try {
      const url = selectedCompany 
        ? `/api/admin/companies/${selectedCompany.id}`
        : '/api/admin/companies'
      
      const method = selectedCompany ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          ...formData,
          domains: formData.domains.split(',').map(d => d.trim()).filter(Boolean)
        })
      })

      if (response.ok) {
        await fetchCompanies()
        handleCloseForm()
        alert(selectedCompany ? '회사 정보가 수정되었습니다' : '회사가 생성되었습니다')
      } else {
        alert('오류가 발생했습니다')
      }
    } catch (error) {
      console.error('회사 저장 실패:', error)
      alert('오류가 발생했습니다')
    }
  }

  // 회사 삭제 모달 열기
  const handleDelete = (company: Company) => {
    setCompanyToDelete(company)
    setDeleteConfirmText('')
    setIsDeleteModalOpen(true)
  }

  // 실제 회사 삭제 실행
  const confirmDelete = async () => {
    if (!companyToDelete || !session?.access_token) return

    try {
      const response = await fetch(`/api/admin/companies/${companyToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        await fetchCompanies()
        alert('회사가 삭제되었습니다')
        handleCloseDeleteModal()
      } else {
        alert('오류가 발생했습니다')
      }
    } catch (error) {
      console.error('회사 삭제 실패:', error)
      alert('오류가 발생했습니다')
    }
  }

  // 삭제 모달 닫기
  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false)
    setCompanyToDelete(null)
    setDeleteConfirmText('')
  }

  // 사용자 목록 조회
  const fetchUsers = async () => {
    if (!session?.access_token) return
    
    try {
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('사용자 목록 조회 실패:', error)
    } finally {
      setUsersLoading(false)
    }
  }

  // 사용자 역할 변경
  const handleUserEdit = (user: User) => {
    setSelectedUser(user)
    setUserEditData({
      role: user.role,
      companyId: user.company_id || ''
    })
    setIsUserEditModalOpen(true)
  }

  // 사용자 역할 변경 저장
  const saveUserRole = async () => {
    if (!selectedUser || !session?.access_token) return

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          role: userEditData.role,
          companyId: userEditData.role !== 'super_admin' ? userEditData.companyId : null
        })
      })

      if (response.ok) {
        await fetchUsers()
        handleCloseUserEditModal()
        alert('사용자 역할이 변경되었습니다')
      } else {
        alert('오류가 발생했습니다')
      }
    } catch (error) {
      console.error('사용자 역할 변경 실패:', error)
      alert('오류가 발생했습니다')
    }
  }

  // 사용자 삭제 모달 열기
  const handleUserDelete = (user: User) => {
    setUserToDelete(user)
    setUserDeleteConfirmText('')
    setIsUserDeleteModalOpen(true)
  }

  // 실제 사용자 삭제 실행
  const confirmUserDelete = async () => {
    if (!userToDelete || !session?.access_token) return

    try {
      const response = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        await fetchUsers()
        alert('사용자가 삭제되었습니다')
        handleCloseUserDeleteModal()
      } else {
        const data = await response.json()
        alert(data.error || '오류가 발생했습니다')
      }
    } catch (error) {
      console.error('사용자 삭제 실패:', error)
      alert('오류가 발생했습니다')
    }
  }

  // 사용자 편집 모달 닫기
  const handleCloseUserEditModal = () => {
    setIsUserEditModalOpen(false)
    setSelectedUser(null)
    setUserEditData({ role: 'company_user', companyId: '' })
  }

  // 사용자 삭제 모달 닫기
  const handleCloseUserDeleteModal = () => {
    setIsUserDeleteModalOpen(false)
    setUserToDelete(null)
    setUserDeleteConfirmText('')
  }

  const handleEdit = (company: Company) => {
    setSelectedCompany(company)
    setFormData({
      name: company.name,
      description: company.description || '',
      domains: company.domains.join(', ')
    })
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    setSelectedCompany(null)
    setFormData({ name: '', description: '', domains: '' })
    setIsFormOpen(false)
  }

  // 테이블 컬럼 정의
  const columns = useMemo(() => [
    columnHelper.accessor('name', {
      header: '회사',
      cell: info => (
        <div className="font-semibold text-slate-900 truncate">
          {info.getValue()}
        </div>
      ),
      size: 200,
    }),
    columnHelper.accessor('domains', {
      header: '도메인',
      cell: info => {
        const domains = info.getValue()
        return (
          <div className="flex flex-wrap gap-1 min-w-0">
            {domains.slice(0, 3).map((domain) => (
              <span key={domain} className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                {domain}
              </span>
            ))}
            {domains.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                +{domains.length - 3}
              </span>
            )}
          </div>
        )
      },
      enableSorting: false,
      size: 300,
    }),
    columnHelper.accessor('is_active', {
      header: '상태',
      cell: info => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          info.getValue() 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {info.getValue() ? '활성' : '비활성'}
        </span>
      ),
      size: 100,
    }),
    columnHelper.accessor('created_at', {
      header: '생성일',
      cell: info => (
        <span className="text-sm text-slate-500">
          {new Date(info.getValue()).toLocaleDateString('ko-KR')}
        </span>
      ),
      size: 120,
    }),
    columnHelper.display({
      id: 'actions',
      header: '작업',
      cell: info => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => handleEdit(info.row.original)}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
          >
            수정
          </button>
          <button
            onClick={() => handleDelete(info.row.original)}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
          >
            삭제
          </button>
        </div>
      ),
      size: 140,
      enableSorting: false,
    }),
  ], [])

  // 사용자 테이블 컬럼 정의
  const userColumns = useMemo(() => [
    userColumnHelper.accessor('name', {
      header: '이름',
      cell: info => (
        <div className="font-medium text-slate-900">
          {info.getValue()}
        </div>
      ),
      size: 150,
    }),
    userColumnHelper.accessor('email', {
      header: '이메일',
      cell: info => (
        <div className="text-slate-600">
          {info.getValue()}
        </div>
      ),
      size: 250,
    }),
    userColumnHelper.accessor('role', {
      header: '역할',
      cell: info => {
        const role = info.getValue()
        const roleColors = {
          super_admin: 'bg-purple-100 text-purple-800',
          company_admin: 'bg-blue-100 text-blue-800',
          company_user: 'bg-green-100 text-green-800'
        }
        const roleNames = {
          super_admin: '시스템 관리자',
          company_admin: '회사 관리자',
          company_user: '일반 사용자'
        }
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[role]}`}>
            {roleNames[role]}
          </span>
        )
      },
      size: 130,
    }),
    userColumnHelper.accessor('companies', {
      header: '회사',
      cell: info => {
        const company = info.getValue()
        return (
          <div className="text-slate-600">
            {company ? company.name : '-'}
          </div>
        )
      },
      enableSorting: false,
      size: 150,
    }),
    userColumnHelper.accessor('created_at', {
      header: '가입일',
      cell: info => (
        <span className="text-sm text-slate-500">
          {new Date(info.getValue()).toLocaleDateString('ko-KR')}
        </span>
      ),
      size: 120,
    }),
    userColumnHelper.display({
      id: 'actions',
      header: '작업',
      cell: info => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => handleUserEdit(info.row.original)}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
          >
            역할 변경
          </button>
          <button
            onClick={() => handleUserDelete(info.row.original)}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
            disabled={info.row.original.id === profile?.id}
          >
            삭제
          </button>
        </div>
      ),
      size: 160,
      enableSorting: false,
    }),
  ], [profile?.id])

  // 회사 테이블 설정
  const table = useReactTable({
    data: companies,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  // 사용자 테이블 설정
  const userTable = useReactTable({
    data: users,
    columns: userColumns,
    state: {
      sorting: userSorting,
      columnFilters: userColumnFilters,
      globalFilter: userGlobalFilter,
    },
    onSortingChange: setUserSorting,
    onColumnFiltersChange: setUserColumnFilters,
    onGlobalFilterChange: setUserGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  useEffect(() => {
    fetchCompanies()
    if (activeMenu === 'users') {
      fetchUsers()
    }
  }, [session, activeMenu])

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* 사이드바 */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
        {/* 타이틀 */}
        <div className="p-6 border-b border-slate-200">
          <div>
            <h1 className="text-lg font-bold text-slate-900">PERSONA INSIGHT</h1>
            <p className="text-xs text-slate-500 font-medium">ADMIN</p>
          </div>
        </div>

        {/* 메뉴 항목들 */}
        <nav className="flex-1 px-4 py-6">
          <ul className="space-y-2">
            {sidebarItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveMenu(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeMenu === item.id
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* 사이드바 하단 */}
        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center text-sm font-medium">
              {profile?.name?.charAt(0) || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{profile?.name}</p>
              <p className="text-xs text-slate-500">시스템 관리자</p>
            </div>
          </div>
          
          <button
            onClick={signOut}
            className="w-full px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 상단 헤더 */}
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {sidebarItems.find(item => item.id === activeMenu)?.name}
              </h2>
                          {activeMenu === 'companies' && (
              <p className="text-sm text-slate-600 mt-1">
                총 {table.getFilteredRowModel().rows.length}개 회사
              </p>
            )}
            {activeMenu === 'users' && (
              <p className="text-sm text-slate-600 mt-1">
                총 {userTable.getFilteredRowModel().rows.length}명 사용자
              </p>
            )}
          </div>
          
          {activeMenu === 'companies' && (
            <div className="flex gap-3">
              <input
                value={globalFilter ?? ''}
                onChange={e => setGlobalFilter(e.target.value)}
                placeholder="회사명, 도메인 검색..."
                className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm w-64"
              />
              <button
                onClick={() => setIsFormOpen(true)}
                className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium whitespace-nowrap"
              >
                새 회사 추가
              </button>
            </div>
          )}
          
          {activeMenu === 'users' && (
            <div className="flex gap-3">
              <input
                value={userGlobalFilter ?? ''}
                onChange={e => setUserGlobalFilter(e.target.value)}
                placeholder="이름, 이메일 검색..."
                className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm w-64"
              />
            </div>
          )}
          </div>
        </header>

        {/* 메인 콘텐츠 영역 */}
        <main className="flex-1 overflow-auto p-6">
          {activeMenu === 'companies' ? (
            // 회사 관리 콘텐츠
            <div>
              {/* 테이블 */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin"></div>
            </div>
          ) : table.getRowModel().rows.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              {globalFilter ? '검색 결과가 없습니다' : '등록된 회사가 없습니다'}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    {table.getHeaderGroups().map(headerGroup => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map(header => (
                          <th key={header.id} className="px-4 py-4 text-left">
                            {header.isPlaceholder ? null : (
                              <div
                                className={`flex items-center gap-2 text-sm font-medium text-slate-600 ${
                                  header.column.getCanSort() ? 'cursor-pointer select-none hover:text-slate-900' : ''
                                }`}
                                onClick={header.column.getToggleSortingHandler()}
                              >
                                {flexRender(header.column.columnDef.header, header.getContext())}
                                {header.column.getCanSort() && (
                                  <span className="text-slate-400">
                                    {{
                                      asc: '↑',
                                      desc: '↓',
                                    }[header.column.getIsSorted() as string] ?? '↕'}
                                  </span>
                                )}
                              </div>
                            )}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {table.getRowModel().rows.map(row => (
                      <tr key={row.id} className="hover:bg-slate-50/50">
                        {row.getVisibleCells().map(cell => (
                          <td key={cell.id} className="px-4 py-4">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 페이지네이션 */}
              {table.getPageCount() > 1 && (
                <div className="px-4 py-4 border-t border-slate-200">
                  <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                    <div className="text-sm text-slate-600">
                      {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-
                      {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)} / {table.getFilteredRowModel().rows.length}개
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => table.setPageIndex(0)}
                        disabled={!table.getCanPreviousPage()}
                        className="px-3 py-1.5 text-sm border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        첫 페이지
                      </button>
                      <button
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className="px-3 py-1.5 text-sm border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        이전
                      </button>
                      <span className="px-3 py-1.5 text-sm bg-slate-100 rounded-md">
                        {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
                      </span>
                      <button
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className="px-3 py-1.5 text-sm border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        다음
                      </button>
                      <button
                        onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                        disabled={!table.getCanNextPage()}
                        className="px-3 py-1.5 text-sm border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        마지막 페이지
                      </button>
                    </div>
                  </div>
                </div>
                  )}
                </>
              )}
                        </div>
            </div>
          ) : activeMenu === 'users' ? (
            // 사용자 관리 콘텐츠
            <div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {usersLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin"></div>
                  </div>
                ) : userTable.getRowModel().rows.length === 0 ? (
                  <div className="text-center py-16 text-slate-500">
                    {userGlobalFilter ? '검색 결과가 없습니다' : '등록된 사용자가 없습니다'}
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[800px]">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          {userTable.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id}>
                              {headerGroup.headers.map(header => (
                                <th key={header.id} className="px-4 py-4 text-left">
                                  {header.isPlaceholder ? null : (
                                    <div
                                      className={`flex items-center gap-2 text-sm font-medium text-slate-600 ${
                                        header.column.getCanSort() ? 'cursor-pointer select-none hover:text-slate-900' : ''
                                      }`}
                                      onClick={header.column.getToggleSortingHandler()}
                                    >
                                      {flexRender(header.column.columnDef.header, header.getContext())}
                                      {header.column.getCanSort() && (
                                        <span className="text-slate-400">
                                          {{
                                            asc: '↑',
                                            desc: '↓',
                                          }[header.column.getIsSorted() as string] ?? '↕'}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </th>
                              ))}
                            </tr>
                          ))}
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {userTable.getRowModel().rows.map(row => (
                            <tr key={row.id} className="hover:bg-slate-50/50">
                              {row.getVisibleCells().map(cell => (
                                <td key={cell.id} className="px-4 py-4">
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* 페이지네이션 */}
                    {userTable.getPageCount() > 1 && (
                      <div className="px-4 py-4 border-t border-slate-200">
                        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                          <div className="text-sm text-slate-600">
                            {userTable.getState().pagination.pageIndex * userTable.getState().pagination.pageSize + 1}-
                            {Math.min((userTable.getState().pagination.pageIndex + 1) * userTable.getState().pagination.pageSize, userTable.getFilteredRowModel().rows.length)} / {userTable.getFilteredRowModel().rows.length}명
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => userTable.setPageIndex(0)}
                              disabled={!userTable.getCanPreviousPage()}
                              className="px-3 py-1.5 text-sm border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              첫 페이지
                            </button>
                            <button
                              onClick={() => userTable.previousPage()}
                              disabled={!userTable.getCanPreviousPage()}
                              className="px-3 py-1.5 text-sm border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              이전
                            </button>
                            <span className="px-3 py-1.5 text-sm bg-slate-100 rounded-md">
                              {userTable.getState().pagination.pageIndex + 1} / {userTable.getPageCount()}
                            </span>
                            <button
                              onClick={() => userTable.nextPage()}
                              disabled={!userTable.getCanNextPage()}
                              className="px-3 py-1.5 text-sm border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              다음
                            </button>
                            <button
                              onClick={() => userTable.setPageIndex(userTable.getPageCount() - 1)}
                              disabled={!userTable.getCanNextPage()}
                              className="px-3 py-1.5 text-sm border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              마지막 페이지
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            // 다른 메뉴 콘텐츠
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="text-6xl mb-4">🚧</div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">준비 중입니다</h3>
                <p className="text-slate-600">이 기능은 곧 제공될 예정입니다.</p>
              </div>
            </div>
          )}
         </main>
       </div>

      {/* 폼 모달 */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-slate-900">
                  {selectedCompany ? '회사 정보 수정' : '새 회사 추가'}
                </h3>
                <button
                  onClick={handleCloseForm}
                  className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    회사명 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="회사명을 입력하세요"
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    설명
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="회사에 대한 간단한 설명을 입력하세요"
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    도메인
                  </label>
                  <input
                    type="text"
                    value={formData.domains}
                    onChange={(e) => setFormData({ ...formData, domains: e.target.value })}
                    placeholder="example.com, subdomain.example.com"
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    여러 도메인을 쉼표(,)로 구분하여 입력하세요
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 pt-6">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="w-full sm:w-auto px-6 py-3 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
                  >
                    {selectedCompany ? '수정 완료' : '생성하기'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {isDeleteModalOpen && companyToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-red-600">
                  회사 삭제
                </h3>
                <button
                  onClick={handleCloseDeleteModal}
                  className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex">
                    <div className="text-red-400 mr-3">⚠️</div>
                    <div>
                      <h4 className="text-sm font-medium text-red-800 mb-1">
                        이 작업은 되돌릴 수 없습니다
                      </h4>
                      <p className="text-sm text-red-700">
                        회사와 관련된 모든 데이터가 영구적으로 삭제됩니다.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-slate-700 mb-3">
                    삭제하려면 회사명 <strong className="font-semibold text-slate-900">"{companyToDelete.name}"</strong>을 입력하세요:
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={companyToDelete.name}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    onClick={handleCloseDeleteModal}
                    className="w-full sm:w-auto px-6 py-3 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                  >
                    취소
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={deleteConfirmText !== companyToDelete.name}
                    className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:bg-red-300 disabled:cursor-not-allowed"
                  >
                    삭제하기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 사용자 역할 변경 모달 */}
      {isUserEditModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-slate-900">
                  사용자 역할 변경
                </h3>
                <button
                  onClick={handleCloseUserEditModal}
                  className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="text-sm text-slate-600">사용자 정보</div>
                  <div className="font-medium text-slate-900">{selectedUser.name}</div>
                  <div className="text-sm text-slate-500">{selectedUser.email}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    역할 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={userEditData.role}
                    onChange={(e) => setUserEditData({ 
                      ...userEditData, 
                      role: e.target.value as 'super_admin' | 'company_admin' | 'company_user' 
                    })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  >
                    <option value="company_user">일반 사용자</option>
                    <option value="company_admin">회사 관리자</option>
                    <option value="super_admin">시스템 관리자</option>
                  </select>
                </div>

                {userEditData.role !== 'super_admin' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      회사 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={userEditData.companyId}
                      onChange={(e) => setUserEditData({ ...userEditData, companyId: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                      required
                    >
                      <option value="">회사를 선택하세요</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    onClick={handleCloseUserEditModal}
                    className="w-full sm:w-auto px-6 py-3 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                  >
                    취소
                  </button>
                  <button
                    onClick={saveUserRole}
                    disabled={userEditData.role !== 'super_admin' && !userEditData.companyId}
                    className="w-full sm:w-auto px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium disabled:bg-slate-400 disabled:cursor-not-allowed"
                  >
                    변경하기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 사용자 삭제 확인 모달 */}
      {isUserDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-red-600">
                  사용자 삭제
                </h3>
                <button
                  onClick={handleCloseUserDeleteModal}
                  className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex">
                    <div className="text-red-400 mr-3">⚠️</div>
                    <div>
                      <h4 className="text-sm font-medium text-red-800 mb-1">
                        이 작업은 되돌릴 수 없습니다
                      </h4>
                      <p className="text-sm text-red-700">
                        사용자와 관련된 모든 데이터가 영구적으로 삭제됩니다.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-slate-700 mb-3">
                    삭제하려면 사용자 이름 <strong className="font-semibold text-slate-900">"{userToDelete.name}"</strong>을 입력하세요:
                  </p>
                  <input
                    type="text"
                    value={userDeleteConfirmText}
                    onChange={(e) => setUserDeleteConfirmText(e.target.value)}
                    placeholder={userToDelete.name}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    onClick={handleCloseUserDeleteModal}
                    className="w-full sm:w-auto px-6 py-3 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                  >
                    취소
                  </button>
                  <button
                    onClick={confirmUserDelete}
                    disabled={userDeleteConfirmText !== userToDelete.name}
                    className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:bg-red-300 disabled:cursor-not-allowed"
                  >
                    삭제하기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 