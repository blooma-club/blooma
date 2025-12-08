/**
 * Image Upload Utilities
 * 
 * 공통 이미지 업로드 로직을 제공하는 유틸리티 모듈입니다.
 * blob URL, 상대 경로, 파일을 R2에 업로드하는 기능을 제공합니다.
 */

// ============================================================================
// URL Type Helpers
// ============================================================================

/**
 * URL이 blob URL인지 확인합니다.
 */
export function isBlobUrl(url: string): boolean {
    return url.startsWith('blob:')
}

/**
 * URL이 상대 경로인지 확인합니다.
 */
export function isRelativeUrl(url: string): boolean {
    return url.startsWith('/') && !url.startsWith('//')
}

/**
 * URL이 외부 URL(http/https)인지 확인합니다.
 */
export function isExternalUrl(url: string): boolean {
    return url.startsWith('https://') || url.startsWith('http://')
}

// ============================================================================
// Upload Options
// ============================================================================

export interface UploadOptions {
    /** 에셋 타입 (model, background) */
    type?: 'model' | 'background'
    /** 프로젝트 ID */
    projectId?: string
    /** 프레임 ID */
    frameId?: string
    /** 에셋 ID */
    assetId?: string
    /** 업데이트 여부 */
    isUpdate?: boolean
}

export interface UploadResult {
    success: boolean
    publicUrl?: string
    signedUrl?: string
    key?: string
    size?: number
    type?: string
    error?: string
}

// ============================================================================
// Upload Functions
// ============================================================================

/**
 * File 객체를 R2에 업로드하고 공개 URL을 반환합니다.
 */
export async function uploadFileToR2(
    file: File,
    options: UploadOptions = {}
): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)

    if (options.type) {
        formData.append('type', options.type)
    }
    if (options.projectId) {
        formData.append('projectId', options.projectId)
    }
    if (options.frameId) {
        formData.append('frameId', options.frameId)
    }
    if (options.assetId) {
        formData.append('assetId', options.assetId)
    }
    if (options.isUpdate) {
        formData.append('isUpdate', 'true')
    }

    const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
    })

    const result: UploadResult = await response.json()

    if (!result.success) {
        throw new Error(result.error || 'Failed to upload image')
    }

    const publicUrl = result.publicUrl || result.signedUrl
    if (!publicUrl) {
        throw new Error('No image URL returned from server')
    }

    return publicUrl
}

/**
 * URL(blob 또는 상대 경로)을 R2에 업로드하고 공개 URL을 반환합니다.
 * 
 * @param url - blob URL 또는 상대 경로 URL
 * @param options - 업로드 옵션
 * @returns R2 공개 URL
 */
export async function uploadUrlToR2(
    url: string,
    options: UploadOptions = {}
): Promise<string> {
    // URL을 fetch하여 blob으로 변환
    const fetchUrl = isRelativeUrl(url)
        ? new URL(url, window.location.origin).href
        : url

    const response = await fetch(fetchUrl)
    const blob = await response.blob()

    // File 객체 생성
    const fileName = `upload-${Date.now()}.jpg`
    const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' })

    // R2에 업로드
    return uploadFileToR2(file, options)
}

/**
 * 다양한 형식의 이미지 URL을 R2 URL로 변환합니다.
 * 이미 외부 URL인 경우 그대로 반환합니다.
 * 
 * @param url - 변환할 URL (blob, relative, external)
 * @param options - 업로드 옵션
 * @returns R2 공개 URL 또는 기존 외부 URL
 */
export async function ensureR2Url(
    url: string,
    options: UploadOptions = {}
): Promise<string> {
    // 이미 외부 URL인 경우 그대로 반환
    if (isExternalUrl(url)) {
        return url
    }

    // blob URL 또는 상대 경로인 경우 R2에 업로드
    if (isBlobUrl(url) || isRelativeUrl(url)) {
        return uploadUrlToR2(url, options)
    }

    // 알 수 없는 형식: 경고 후 그대로 반환
    console.warn('[imageUpload] Unknown URL format:', url)
    return url
}
