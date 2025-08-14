'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, RefreshCw, Plus, Trash2 } from 'lucide-react'
import type { CustomCardNodeData } from '@/types'

// Flat-style SVG placeholder
const ImagePlaceholderSVG = () => (
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    className="opacity-50"
  >
    <rect x="0" y="0" width="100" height="100" fill="none" rx="10" />
    <path d="M 0 70 L 25 50 L 50 65 L 75 40 L 100 65 V 100 H 0 Z" fill="#D1D5DB" />
    <circle cx="75" cy="25" r="15" fill="#FDE047" />
  </svg>
)

interface EditModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: CustomCardNodeData) => void
  onDelete?: () => void
  nodeData: CustomCardNodeData
}

const EditModal = ({ isOpen, onClose, onSave, onDelete, nodeData }: EditModalProps) => {
  const [title, setTitle] = useState(nodeData.title)
  const [content, setContent] = useState(nodeData.content)
  const [userInput, setUserInput] = useState(nodeData.userInput || '')
  const [imageUrls, setImageUrls] = useState<string[]>(nodeData.imageUrls || [])
  const [selectedImageUrl, setSelectedImageUrl] = useState<number>(nodeData.selectedImageUrl || 0)
  const [imagePrompt, setImagePrompt] = useState('')
  const [imageStyle, setImageStyle] = useState<'realistic' | 'sketch'>('realistic')
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const objectUrlRef = useRef<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  useEffect(() => {
    if (isOpen) {
      setTitle(nodeData.title || '')
      setContent(nodeData.content || '')
      setUserInput(nodeData.userInput || '')
      setImageUrls(nodeData.imageUrls || [])
      setSelectedImageUrl(nodeData.selectedImageUrl || 0)
      // Initialize prompt as empty
      setImagePrompt('')
    }
  }, [isOpen, nodeData])

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }
    }
  }, [])

  const handleImageUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current)
        }
        const objectUrl = URL.createObjectURL(file)
        objectUrlRef.current = objectUrl

        // Add new image to the array (max 3)
        if (imageUrls.length < 3) {
          setImageUrls(prev => [...prev, objectUrl])
          // Set as selected if it's the first image
          if (imageUrls.length === 0) {
            setSelectedImageUrl(imageUrls.length)
          }
        } else {
          // Replace the last image
          const newImageUrls = [...imageUrls]
          newImageUrls[2] = objectUrl
          setImageUrls(newImageUrls)
          setSelectedImageUrl(2)
        }
      }
    },
    [imageUrls]
  )

  const removeImage = (index: number) => {
    const newImageUrls = imageUrls.filter((_, i) => i !== index)
    setImageUrls(newImageUrls)

    // Adjust selected image index if necessary
    if (selectedImageUrl >= newImageUrls.length) {
      setSelectedImageUrl(Math.max(0, newImageUrls.length - 1))
    }
  }

  const generateImage = async () => {
    if (!imagePrompt.trim()) {
      alert('Please enter an image prompt')
      return
    }

    if (imageUrls.length >= 3) {
      alert('Maximum 3 images allowed. Please remove an image first.')
      return
    }

    setIsGeneratingImage(true)
    try {
      const promptResponse = await fetch('/api/imagePromptGenerator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userPrompt: imagePrompt,
          imageStyle: imageStyle,
        }),
      })

      if (!promptResponse.ok) {
        const errorText = await promptResponse.text()
        console.error('Prompt API error:', promptResponse.status, errorText)
        throw new Error(`Failed to enhance the prompt: ${promptResponse.status} - ${errorText}`)
      }

      const promptData = await promptResponse.json()
      const enhancedPrompt = promptData.generatedPrompt

      /*
      // Developer logging - show the enhanced prompt
      console.log('=== ENHANCED PROMPT DEBUG ===')
      console.log('Original prompt:', imagePrompt)
      console.log('Enhanced prompt:', enhancedPrompt)
      console.log('Prompt length:', enhancedPrompt.length, 'characters')
      console.log('================================')

      // Then generate the image using the optimized prompt
      console.log('=== IMAGE GENERATION DEBUG ===')
      console.log('Sending enhanced prompt to image API:', enhancedPrompt)
      console.log('=====================================')
      */

      const imageResponse = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: enhancedPrompt,
          useFluxPrompt: imageStyle === 'realistic',
        }),
      })

      if (!imageResponse.ok) {
        const errorText = await imageResponse.text()
        console.error('Image API error:', imageResponse.status, errorText)
        throw new Error(`Failed to generate image: ${imageResponse.status} - ${errorText}`)
      }

      const imageData = await imageResponse.json()

      // Add new image to the array
      const newImageUrls = [...imageUrls, imageData.imageUrl]
      /*
      // Developer logging - show the result
      console.log('=== IMAGE GENERATION RESULT ===')
      console.log('Generated image URL:', imageData.imageUrl)
      console.log('Total images now:', newImageUrls.length)
      console.log('==================================')
      */

      setImageUrls(newImageUrls)

      // Set as selected if it's the first image
      if (imageUrls.length === 0) {
        setSelectedImageUrl(0)
      }
    } catch (error) {
      console.error('Error generating image:', error)
      alert('Failed to generate image. Please try again.')
    } finally {
      setIsGeneratingImage(false)
    }
  }

  const handleSave = () => {
    onSave({
      title,
      content,
      userInput,
      imageUrls,
      selectedImageUrl,
    })
    onClose()
  }

  if (!isOpen || !isMounted) return null

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-end mb-4">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <X size={24} />
          </button>
        </div>
        <div className="flex flex-col gap-4">
          {/* Title Input */}
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="text-2xl font-bold bg-gray-100 p-2 rounded-md outline-none w-full transition-colors duration-200"
            placeholder="Enter a title"
          />

          {/* Used Prompt */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Used Prompt</label>
            <textarea
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 focus:border-blue-500 outline-none resize-none transition-colors duration-200"
              placeholder="Enter your input prompt or instructions for this card..."
              rows={3}
            />
          </div>

          {/* Image Regeneration Section */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-700">Image Regeneration</h4>

            {/* Image Prompt Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image Prompt</label>
              <textarea
                value={imagePrompt}
                onChange={e => setImagePrompt(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 focus:border-blue-500 outline-none resize-none transition-colors duration-200"
                placeholder="Describe the image you want to generate..."
                rows={3}
              />
            </div>

            {/* Style Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image Style</label>
              <select
                value={imageStyle}
                onChange={e => setImageStyle(e.target.value as 'realistic' | 'sketch')}
                className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 focus:border-blue-500 outline-none transition-colors duration-200"
              >
                <option value="realistic">Realistic Style</option>
                <option value="sketch">Simple Sketch</option>
              </select>
            </div>

            {/* Regenerate Button */}
            <button
              onClick={generateImage}
              disabled={isGeneratingImage || !imagePrompt.trim() || imageUrls.length >= 3}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isGeneratingImage ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Generating Image...
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  Generate Image ({imageUrls.length}/3)
                </>
              )}
            </button>
          </div>

          {/* Multiple Images Display */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-700">Images ({imageUrls.length}/3)</h4>

            {imageUrls.length === 0 ? (
              <div
                className="relative w-full rounded-2xl overflow-hidden flex items-center justify-center group border-2 border-dashed border-gray-900 mb-4"
                style={{ minHeight: 120 }}
              >
                <div className="text-gray-400 flex flex-col items-center justify-center p-4 w-full">
                  <div className="w-full max-w-sm mx-auto">
                    <ImagePlaceholderSVG />
                  </div>
                  <span>Upload an image or generate one</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {imageUrls.map((url, index) => (
                  <div key={index} className="relative">
                    <div
                      className={`relative w-full rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${
                        selectedImageUrl === index
                          ? 'ring-2 ring-blue-500 ring-offset-2'
                          : 'ring-1 ring-gray-300'
                      }`}
                      onClick={() => setSelectedImageUrl(index)}
                    >
                      <img
                        src={url}
                        alt={`Image ${index + 1}`}
                        className="w-full h-32 object-cover"
                      />
                      {selectedImageUrl === index && (
                        <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                          ✓
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-2 left-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                    <div className="text-center mt-2 text-sm text-gray-600">Image {index + 1}</div>
                  </div>
                ))}

                {/* Add Image Button */}
                {imageUrls.length < 3 && (
                  <div
                    className="relative w-full rounded-xl overflow-hidden flex items-center justify-center group border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors cursor-pointer"
                    style={{ minHeight: 128 }}
                    onClick={() => document.getElementById('image-upload')?.click()}
                  >
                    <div className="text-gray-400 flex flex-col items-center justify-center p-4">
                      <Plus size={24} />
                      <span className="text-sm">Add Image</span>
                    </div>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Content Textarea */}
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            className="w-full min-h-[120px] p-4 border border-gray-300 rounded-xl bg-gray-100 focus:border-blue-500 outline-none resize-none transition-colors duration-200"
            placeholder="Enter storyboard content..."
          />

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default EditModal
