export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600 mx-auto mb-3"></div>
        <p className="text-sm text-slate-600">로딩 중...</p>
      </div>
    </div>
  )
}
