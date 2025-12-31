'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import useSWRInfinite from 'swr/infinite'
import { useUser } from '@clerk/nextjs'
import { Search, MoreHorizontal, Trash2, Image as ImageIcon, RefreshCw, Eye, X, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Image from 'next/image'
import { useToast } from '@/components/ui/toast'

const formatDate = (dateString: string, style: 'short' | 'long' = 'short') => {
    const date = new Date(dateString)
    if (style === 'short') {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }
    return date.toLocaleString('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).replace(/\. /g, '-').replace('.', '') + ' KST'
}

// 슬림 이미지 타입 (그리드용)

import { useGeneratedImages, GeneratedImageSlim } from '@/hooks/useGeneratedImages'

// 상세 이미지 타입 (모달용)
type GeneratedImageDetail = GeneratedImageSlim & {
    source_model_url?: string
    source_outfit_urls?: string[]
    generation_params?: Record<string, unknown>
}

// 간단한 blur placeholder (동적 생성 불필요 시 사용)
const BLUR_DATA_URL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQCEAPEAAB/cAf/Z'

export default function GeneratedPage() {
    const { user, isLoaded } = useUser()
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedImage, setSelectedImage] = useState<GeneratedImageSlim | null>(null)
    const [imageDetail, setImageDetail] = useState<GeneratedImageDetail | null>(null)
    const [loadingDetail, setLoadingDetail] = useState(false)
    const { push: toast } = useToast()
    const loadMoreRef = useRef<HTMLDivElement>(null)
    const detailCacheRef = useRef<Record<string, GeneratedImageDetail>>({})
    const detailRequestRef = useRef<string | null>(null)

    // Use Custom SWR Hook
    const {
        data,
        images,
        isLoading,
        isLoadingMore,
        hasMore,
        error,
        size,
        setSize,
        mutate,
        isValidating
    } = useGeneratedImages({ enabled: !!user })

    // IntersectionObserver for infinite scroll
    useEffect(() => {
        if (!loadMoreRef.current) return

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isValidating) {
                    setSize(size + 1)
                }
            },
            { threshold: 0.1 }
        )

        observer.observe(loadMoreRef.current)
        return () => observer.disconnect()
    }, [hasMore, isValidating, setSize, size])

    // Fetch image detail when modal opens
    const handleOpenModal = async (image: GeneratedImageSlim) => {
        setSelectedImage(image)
        const cachedDetail = detailCacheRef.current[image.id]
        if (cachedDetail) {
            setImageDetail(cachedDetail)
            setLoadingDetail(false)
            return
        }

        setImageDetail(null)
        setLoadingDetail(true)
        detailRequestRef.current = image.id

        try {
            const response = await fetch(`/api/studio/generated/${image.id}`)
            const result = await response.json()
            if (result.success && result.data) {
                if (detailRequestRef.current !== image.id) return
                detailCacheRef.current[image.id] = result.data
                setImageDetail(result.data)
            }
        } catch (error) {
            console.error('Error fetching image detail:', error)
        } finally {
            if (detailRequestRef.current === image.id) {
                setLoadingDetail(false)
            }
        }
    }

    const handleCloseModal = () => {
        setSelectedImage(null)
        setImageDetail(null)
        setLoadingDetail(false)
        detailRequestRef.current = null
    }

    // Optimistic Delete: UI 즉시 반영 후 서버 처리
    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this image?')) return

        // 현재 데이터 백업 (롤백용)
        const previousData = data

        // Optimistic update: 즉시 UI에서 제거
        mutate(
            (currentData) => {
                if (!currentData) return []
                return currentData.map(page => ({
                    ...page,
                    data: page.data.filter(img => img.id !== id)
                }))
            },
            false // revalidate 하지 않음
        )
        handleCloseModal()
        toast({
            title: 'Deleted',
            description: 'Image has been removed.',
        })

        try {
            const response = await fetch('/api/generated-images', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            })

            const result = await response.json()

            if (!result.success) {
                throw new Error(result.error)
            }
        } catch (error) {
            console.error('Error deleting image:', error)
            // 롤백: 원래 데이터 복원
            mutate(previousData, false)
            toast({
                title: 'Error',
                description: 'Failed to delete image. Restored.',
            })
        }
    }

    // Download original image (CORS-free method)
    const handleDownload = useCallback((imageUrl: string, filename?: string) => {
        try {
            const link = document.createElement('a')
            link.href = imageUrl
            link.download = filename || `blooma-${Date.now()}.png`
            link.target = '_blank' // Fallback if download fails
            link.rel = 'noopener noreferrer'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            toast({ title: 'Downloaded', description: 'Original image saved to your device' })
        } catch (error) {
            console.error('Download error:', error)
            toast({ title: 'Error', description: 'Failed to download image' })
        }
    }, [toast])

    const filteredImages = images.filter(img =>
        !searchQuery || img.prompt?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // 그룹별 대표 이미지만 표시 (group_id가 같은 이미지 중 첫 번째만)
    const displayImages = filteredImages.reduce<GeneratedImageSlim[]>((acc, img) => {
        // group_id가 없으면 개별 이미지로 표시
        if (!img.group_id) {
            acc.push(img)
            return acc
        }
        // 이미 같은 group_id가 추가되었는지 확인
        const alreadyAdded = acc.some(existing => existing.group_id === img.group_id)
        if (!alreadyAdded) {
            acc.push(img)
        }
        return acc
    }, [])

    // 그룹당 이미지 개수 계산
    const getGroupCount = (groupId?: string): number => {
        if (!groupId) return 1
        return images.filter(img => img.group_id === groupId).length
    }

    // Get siblings for variations in modal
    const getSiblings = (groupId?: string) => {
        if (!groupId) return []
        return images.filter(img => img.group_id === groupId)
    }

    if (!isLoaded) {
        return (
            <div className="min-h-[calc(100vh-7rem)] bg-background flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    // Error state with retry
    if (error) {
        return (
            <div className="min-h-[calc(100vh-7rem)] bg-background flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                    <X className="w-7 h-7 text-destructive" />
                </div>
                <h3 className="text-sm font-medium mb-1">Failed to load images</h3>
                <p className="text-xs text-muted-foreground mb-6">
                    Please check your connection and try again
                </p>
                <Button
                    onClick={() => mutate()}
                    variant="outline"
                    className="h-10 px-5 rounded-xl text-sm"
                >
                    Try Again
                </Button>
            </div>
        )
    }

    return (
        <div className="min-h-[calc(100vh-7rem)] bg-background">
            <div className="max-w-6xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="flex items-end justify-between mb-10">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Generated</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Your AI-generated fashion images
                        </p>
                    </div>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search..."
                            className="pl-10 h-10 bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-foreground/20 rounded-xl text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Gallery Grid */}
                {isLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="aspect-[3/4] rounded-2xl bg-muted/30 animate-pulse" />
                        ))}
                    </div>
                ) : displayImages.length > 0 ? (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {displayImages.map((image) => (
                                <div
                                    key={image.id}
                                    className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted/30 cursor-pointer ring-1 ring-border/30 hover:ring-border transition-all"
                                    onClick={() => handleOpenModal(image)}
                                >
                                    {/* Optimized Thumbnail with Blur Placeholder */}
                                    <Image
                                        src={image.image_url}
                                        alt={image.prompt || 'Generated image'}
                                        fill
                                        className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                        quality={75}
                                        loading="lazy"
                                        placeholder="blur"
                                        blurDataURL={BLUR_DATA_URL}
                                    />

                                    {/* Group count badge */}
                                    {getGroupCount(image.group_id) > 1 && (
                                        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-lg">
                                            {getGroupCount(image.group_id)} images
                                        </div>
                                    )}

                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                    {/* Info on hover */}
                                    <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                                        <p className="text-white text-sm font-medium truncate">{image.prompt || 'Untitled'}</p>
                                        <p className="text-white/60 text-xs mt-0.5" suppressHydrationWarning>
                                            {formatDate(image.created_at, 'short')}
                                        </p>
                                    </div>

                                    {/* Menu */}
                                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                <Button
                                                    variant="secondary"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 text-white border-0 backdrop-blur-sm"
                                                >
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-40 rounded-xl">
                                                <DropdownMenuItem
                                                    className="rounded-lg text-xs"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleOpenModal(image)
                                                    }}
                                                >
                                                    <Eye className="w-3.5 h-3.5 mr-2" />
                                                    View
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="rounded-lg text-xs"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleDownload(image.image_url, `blooma-${image.id}.png`)
                                                    }}
                                                >
                                                    <Download className="w-3.5 h-3.5 mr-2" />
                                                    Download
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="rounded-lg text-xs text-destructive focus:text-destructive"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleDelete(image.id)
                                                    }}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Load More Trigger */}
                        <div ref={loadMoreRef} className="h-20 flex items-center justify-center mt-4">
                            {isLoadingMore && (
                                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-32">
                        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                            <ImageIcon className="w-7 h-7 text-muted-foreground/40" />
                        </div>
                        <h3 className="text-sm font-medium mb-1">No images yet</h3>
                        <p className="text-xs text-muted-foreground mb-6">
                            Create your first AI-generated image
                        </p>
                        <Button
                            onClick={() => window.location.href = '/studio/create'}
                            variant="outline"
                            className="h-10 px-5 rounded-xl text-sm"
                        >
                            Start Creating
                        </Button>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
                    onClick={handleCloseModal}
                >
                    <div
                        className="bg-background rounded-3xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Preview - High Quality for Modal */}
                        <div className="flex-1 bg-muted/20 flex items-center justify-center p-8">
                            <div className="relative w-full aspect-[3/4] max-h-[65vh] rounded-2xl overflow-hidden">
                                <Image
                                    src={selectedImage.image_url}
                                    alt={selectedImage.prompt || 'Generated image'}
                                    fill
                                    className="object-contain"
                                    sizes="(max-width: 1024px) 80vw, 50vw"
                                    quality={90}
                                    priority
                                />
                            </div>
                        </div>

                        {/* Details */}
                        <div className="w-80 p-8 flex flex-col relative overflow-y-auto">
                            <button
                                onClick={handleCloseModal}
                                className="absolute top-6 right-6 p-2 rounded-full hover:bg-muted transition-colors z-10"
                            >
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>

                            {/* Loading indicator for detail */}
                            {loadingDetail && (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                </div>
                            )}

                            {/* Variations Loop */}
                            {selectedImage.group_id && (
                                <div className="mb-8 mt-4">
                                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Variations</h4>
                                    <div className="flex gap-2 flex-wrap">
                                        {getSiblings(selectedImage.group_id).map((sibling) => (
                                            <div
                                                key={sibling.id}
                                                className={`relative w-16 aspect-[3/4] rounded-xl overflow-hidden cursor-pointer transition-all ${sibling.id === selectedImage.id
                                                    ? 'ring-2 ring-foreground'
                                                    : 'ring-1 ring-border/50 opacity-70 hover:opacity-100 hover:ring-foreground/50'
                                                    }`}
                                                onClick={() => {
                                                    setSelectedImage(sibling)
                                                    // Fetch detail for new selection
                                                    handleOpenModal(sibling)
                                                }}
                                            >
                                                <Image
                                                    src={sibling.image_url}
                                                    alt="Variation"
                                                    fill
                                                    className="object-cover"
                                                    sizes="64px"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Model Image (from detail API) */}
                            {imageDetail?.source_model_url && (
                                <div className="mb-6">
                                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Model Photo</h4>
                                    <div className="relative w-24 aspect-[3/4] rounded-xl overflow-hidden ring-1 ring-border/50">
                                        <Image
                                            src={imageDetail.source_model_url}
                                            alt="Model"
                                            fill
                                            className="object-cover"
                                            sizes="96px"
                                            quality={60}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Outfit Images (from detail API) */}
                            {imageDetail?.source_outfit_urls && imageDetail.source_outfit_urls.length > 0 && (
                                <div className="mb-8">
                                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Outfit Photos</h4>
                                    <div className="flex gap-2 flex-wrap">
                                        {imageDetail.source_outfit_urls.map((img, idx) => (
                                            <div key={`o-${idx}`} className="relative w-16 h-16 rounded-xl overflow-hidden ring-1 ring-border/50">
                                                <Image
                                                    src={img}
                                                    alt="Outfit"
                                                    fill
                                                    className="object-cover"
                                                    sizes="64px"
                                                    quality={60}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Date */}
                            <div className="mb-8">
                                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Created</h4>
                                <p className="text-sm" suppressHydrationWarning>{formatDate(selectedImage.created_at, 'long')}</p>
                            </div>

                            {/* Actions */}
                            <div className="mt-auto space-y-3">
                                {/* Download Original Button */}
                                <Button
                                    variant="outline"
                                    className="w-full h-11 rounded-xl text-sm"
                                    onClick={() => handleDownload(selectedImage.image_url, `blooma-${selectedImage.id}.png`)}
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Download Original
                                </Button>
                                <Button
                                    className="w-full h-11 rounded-xl bg-foreground hover:bg-foreground/90 text-background text-sm"
                                    onClick={() => {
                                        toast({ title: 'Regenerating...', description: 'Creating a new variation' })
                                    }}
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Regenerate
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
