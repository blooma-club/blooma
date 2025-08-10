'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardInput } from '@/types'
import { useCanvasStore } from '@/store/canvas'
import { 
  Type,
  Palette,
  Upload,
  Trash2,
  Copy
} from 'lucide-react'

interface CardEditorProps {
  selectedCard: Card | null
}

export const CardEditor = ({ selectedCard }: CardEditorProps) => {
  const [uploading, setUploading] = useState(false)
  const [colorPickerOpen, setColorPickerOpen] = useState<'background' | 'text' | null>(null)
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
      console.log("🔍 Debug: Image upload called (Supabase removed)")
      
      // Mock 이미지 URL 생성
      const mockImageUrl = `https://via.placeholder.com/400x300?text=Mock+Image`
      
      await handleUpdateCard({ image_url: mockImageUrl })
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

  // 색상 선택 핸들러
  const handleColorChange = (type: 'background' | 'text', color: string) => {
    if (type === 'background') {
      handleUpdateCard({ background_color: color })
    } else {
      handleUpdateCard({ text_color: color })
    }
    setColorPickerOpen(null)
  }

  // 미리 정의된 색상 팔레트
  const colorPalette = [
    '#ffffff', '#f8f9fa', '#e9ecef', '#dee2e6', '#ced4da', '#adb5bd',
    '#6c757d', '#495057', '#343a40', '#212529', '#000000', '#ff6b6b',
    '#ff8cc8', '#ffa8a8', '#ff922b', '#ffd93d', '#6bcf7f', '#4dabf7',
    '#748ffc', '#9775fa', '#f06292', '#ba68c8'
  ]

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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title
          </label>
          <input
            type="text"
            value={selectedCard.title}
            onChange={(e) => handleUpdateCard({ title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter card title"
          />
        </div>

        {/* 내용 편집 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Content
          </label>
          <textarea
            value={selectedCard.content}
            onChange={(e) => handleUpdateCard({ content: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
            placeholder="Enter card content"
          />
        </div>

        {/* 이미지 업로드 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Image
          </label>
          <div className="space-y-2">
            {selectedCard.image_url && (
              <div className="relative w-full h-32">
                <Image
                  src={selectedCard.image_url}
                  alt="Card Image"
                  fill
                  className="object-cover rounded-md border border-gray-300"
                />
                <div className="neo-btn-wrapper absolute top-2 right-2">
                  <span className="neo-btn-shadow" />
                  <button className="neo-btn bg-white" onClick={() => handleUpdateCard({ image_url: '' })}>
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
            <div className="neo-btn-wrapper w-full">
              <span className="neo-btn-shadow" />
              <button className="neo-btn w-full flex items-center gap-2" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading ? 'Uploading...' : 'Upload Image'}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* 색상 설정 */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Background Color
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setColorPickerOpen(colorPickerOpen === 'background' ? null : 'background')}
                className="w-10 h-10 rounded-md border border-gray-300 flex items-center justify-center"
                style={{ backgroundColor: selectedCard.background_color }}
              >
                <Palette className="h-4 w-4 text-gray-500" />
              </button>
              <span className="text-sm text-gray-600">{selectedCard.background_color}</span>
            </div>
            {colorPickerOpen === 'background' && (
              <div className="mt-2 p-3 bg-gray-50 rounded-md">
                <div className="grid grid-cols-6 gap-2">
                  {colorPalette.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleColorChange('background', color)}
                      className="w-8 h-8 rounded-md border border-gray-300 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Text Color
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setColorPickerOpen(colorPickerOpen === 'text' ? null : 'text')}
                className="w-10 h-10 rounded-md border border-gray-300 flex items-center justify-center"
                style={{ backgroundColor: selectedCard.text_color }}
              >
                <Type className="h-4 w-4 text-gray-500" />
              </button>
              <span className="text-sm text-gray-600">{selectedCard.text_color}</span>
            </div>
            {colorPickerOpen === 'text' && (
              <div className="mt-2 p-3 bg-gray-50 rounded-md">
                <div className="grid grid-cols-6 gap-2">
                  {colorPalette.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleColorChange('text', color)}
                      className="w-8 h-8 rounded-md border border-gray-300 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 텍스트 스타일 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Text Style
          </label>
          <div className="space-y-2"> 
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Size:</label>
              <input
                type="range"
                min="10"
                max="24"
                value={selectedCard.font_size}
                onChange={(e) => handleUpdateCard({ font_size: parseInt(e.target.value) })}
                className="flex-1"
              />
              <span className="text-sm text-gray-600 w-8">{selectedCard.font_size}px</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Thickness:</label>
              <select
                value={selectedCard.font_weight}
                onChange={(e) => handleUpdateCard({ font_weight: e.target.value })}
                className="flex-1 px-2 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="normal">Normal</option>
                <option value="bold">Bold</option>
                <option value="lighter">Lighter</option>
              </select>
            </div>
          </div>
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