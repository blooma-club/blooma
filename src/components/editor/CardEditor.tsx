'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardInput } from '@/types'
import { useCanvasStore } from '@/store/canvas'
import { Type, Upload, Trash2, Copy } from 'lucide-react'

interface CardEditorProps {
  selectedCard: Card | null
}

export const CardEditor = ({ selectedCard }: CardEditorProps) => {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { updateCard, deleteCard } = useCanvasStore()

  // 카드가 선택되지 않은 경우
  if (!selectedCard) {
    return (
      <div className="p-4 h-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
            <Type className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-sm">Select a card to edit</p>
          <p className="text-sm">You can edit it</p>
        </div>
      </div>
    )
  }

  // 카드 업데이트 핸들러
  const handleUpdateCard = async (updates: Partial<CardInput>) => {
    await updateCard(selectedCard.id, updates)
  }

  // 이미지 업로드 핸들러 (Supabase 연동 제거)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      // Mock 이미지 URL 생성
      const mockImageUrl = `https://via.placeholder.com/400x300?text=Mock+Image`

      // Add new image to existing array or create new array
      const currentImageUrls = selectedCard.image_urls || []
      const newImageUrls = [...currentImageUrls, mockImageUrl]

      await handleUpdateCard({
        image_urls: newImageUrls,
        selected_image_url: currentImageUrls.length, // Set new image as selected
      })
    } catch (error) {
      console.error('Image upload failed:', error)
    } finally {
      setUploading(false)
    }
  }

  // 카드 삭제 핸들러
  const handleDeleteCard = async () => {
    if (confirm('Do you want to delete this card?')) {
      await deleteCard(selectedCard.id)
    }
  }

  // Color and font styling are now hardcoded for consistency

  return (
    <div className="h-full bg-white">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Card Editor</h2>
            <p className="text-sm text-gray-500">{selectedCard.type.toUpperCase()}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="reverse"
              size="sm"
              onClick={() => navigator.clipboard.writeText(selectedCard.id)}
              className="flex items-center gap-1"
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              variant="reverse"
              size="sm"
              onClick={handleDeleteCard}
              className="flex items-center gap-1 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* 편집 영역 */}
      <div className="p-4 space-y-6">
        {/* 제목 편집 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
          <input
            type="text"
            value={selectedCard.title}
            onChange={e => handleUpdateCard({ title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter card title"
          />
        </div>

        {/* 내용 편집 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
          <textarea
            value={selectedCard.content}
            onChange={e => handleUpdateCard({ content: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
            placeholder="Enter card content"
          />
        </div>

        {/* 이미지 업로드 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Images ({selectedCard.image_urls?.length || 0}/3)
          </label>
          <div className="space-y-2">
            {selectedCard.image_urls && selectedCard.image_urls.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {selectedCard.image_urls.map((imageUrl, index) => (
                  <div key={index} className="relative w-full h-32">
                    <Image
                      src={imageUrl}
                      alt={`Card Image ${index + 1}`}
                      fill
                      className="object-cover rounded-md border border-gray-300"
                    />
                    <div className="neo-btn-wrapper absolute top-2 right-2">
                      <span className="neo-btn-shadow" />
                      <button
                        className="neo-btn bg-white"
                        onClick={() => {
                          const newImageUrls =
                            selectedCard.image_urls?.filter((_, i) => i !== index) || []
                          handleUpdateCard({
                            image_urls: newImageUrls,
                            selected_image_url: Math.max(
                              0,
                              (selectedCard.selected_image_url || 0) - 1
                            ),
                          })
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    {index === (selectedCard.selected_image_url || 0) && (
                      <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                        ✓
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {(!selectedCard.image_urls || selectedCard.image_urls.length < 3) && (
              <div className="neo-btn-wrapper w-full">
                <span className="neo-btn-shadow" />
                <button
                  className="neo-btn w-full flex items-center gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {uploading ? 'Uploading...' : 'Upload Image'}
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Styling is now hardcoded for consistency */}
        <div className="p-4 bg-gray-50 rounded-md">
          <p className="text-sm text-gray-600">
            Card styling (background, text color, font size, font weight) is now standardized across
            all cards for consistency.
          </p>
        </div>

        {/* 위치 정보 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Position Information
          </label>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">X:</span>
              <span className="text-gray-900">{Math.round(selectedCard.position_x)}px</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Y:</span>
              <span className="text-gray-900">{Math.round(selectedCard.position_y)}px</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Width:</span>
              <span className="text-gray-900">{selectedCard.width}px</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Height:</span>
              <span className="text-gray-900">{selectedCard.height}px</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
