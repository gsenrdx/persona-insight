'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Search, 
  Image as ImageIcon, 
  Loader2, 
  Check,
  AlertCircle
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

interface StorageImage {
  url: string
  name: string
  created_at: string
  size: number
}

interface ImageGalleryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectImage: (imageUrl: string) => void
  currentImageUrl?: string | null
}

export function ImageGalleryModal({ 
  open, 
  onOpenChange, 
  onSelectImage,
  currentImageUrl 
}: ImageGalleryModalProps) {
  const { session } = useAuth()
  const [images, setImages] = useState<StorageImage[]>([])
  const [filteredImages, setFilteredImages] = useState<StorageImage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedImage, setSelectedImage] = useState<string | null>(currentImageUrl || null)

  // 이미지 목록 불러오기
  useEffect(() => {
    if (open && session?.access_token) {
      fetchImages()
    }
  }, [open, session?.access_token])

  // 검색 필터링
  useEffect(() => {
    let filtered = images

    // 검색어 필터링
    if (searchQuery) {
      filtered = filtered.filter(img => 
        img.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredImages(filtered)
  }, [images, searchQuery])

  const fetchImages = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/storage/images', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('이미지 목록을 불러올 수 없습니다')
      }

      const data = await response.json()
      setImages(data.images || [])
    } catch (error) {
      console.error('Failed to fetch images:', error)
      setError('이미지 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectImage = () => {
    if (selectedImage) {
      onSelectImage(selectedImage)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Storage 이미지 선택</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 검색 영역 */}
          <div className="px-6 py-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="이미지 이름으로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* 이미지 갤러리 */}
          <ScrollArea className="flex-1 px-6 py-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <p className="mt-4 text-sm text-gray-500">이미지를 불러오는 중...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-64">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <p className="mt-4 text-sm text-red-600">{error}</p>
                <Button
                  onClick={fetchImages}
                  variant="outline"
                  size="sm"
                  className="mt-4"
                >
                  다시 시도
                </Button>
              </div>
            ) : filteredImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <ImageIcon className="h-12 w-12 text-gray-300" />
                <p className="mt-4 text-sm text-gray-500">
                  {searchQuery ? '검색 결과가 없습니다' : '이미지가 없습니다'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                <AnimatePresence>
                  {filteredImages.map((image, index) => (
                    <motion.div
                      key={image.url}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.02 }}
                      className="group relative"
                    >
                      <button
                        onClick={() => setSelectedImage(image.url)}
                        className={cn(
                          "relative w-full aspect-square rounded-lg overflow-hidden border-2 transition-all",
                          selectedImage === image.url
                            ? "border-blue-500 ring-2 ring-blue-500/20"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <img
                          src={image.url}
                          alt={image.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        
                        {/* 선택됨 표시 */}
                        {selectedImage === image.url && (
                          <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                            <div className="bg-blue-500 rounded-full p-1">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        )}

                        {/* 호버 시 정보 표시 */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="absolute bottom-0 left-0 right-0 p-2 text-white">
                            <p className="text-xs truncate">{image.name}</p>
                          </div>
                        </div>
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* 하단 버튼 영역 */}
        <div className="px-6 py-4 border-t flex items-center justify-between bg-gray-50">
          <div className="text-sm text-gray-500">
            {selectedImage && `선택됨: 1개`}
            {!selectedImage && filteredImages.length > 0 && `${filteredImages.length}개 이미지`}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button
              onClick={handleSelectImage}
              disabled={!selectedImage}
              className="bg-blue-600 hover:bg-blue-700"
            >
              선택
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}