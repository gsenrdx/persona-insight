import Link from "next/link"

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-3xl font-bold mb-4">페이지를 찾을 수 없습니다</h2>
      <p className="text-gray-600 mb-8">요청하신 페이지가 존재하지 않거나 삭제되었습니다.</p>
      <Link href="/" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
        홈으로 돌아가기
      </Link>
    </div>
  )
}
