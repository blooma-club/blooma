import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Card } from '@/types'
import type { StoryboardFrame } from '@/types/storyboard'

type CardSnakeCaseFields = {
  duration?: number
  audio_url?: string
  voice_over_url?: string
  voice_over_text?: string
  start_time?: number
  video_url?: string
  video_key?: string
  video_prompt?: string
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 이미지 URL 추출 함수
export function getImageUrlFromCard(card: Card): string | undefined {
  // 1. 단일 image_url 필드 먼저 확인
  if (card.image_url) {
    return card.image_url;
  }
  // 2. image_url이 없으면 image_urls 배열 확인
  if (card.image_urls && card.image_urls.length > 0) {
    if (card.selected_image_url !== undefined && 
        card.selected_image_url >= 0 && 
        card.selected_image_url < card.image_urls.length) {
      return card.image_urls[card.selected_image_url];
    } else {
      // selected_image_url이 없거나 잘못된 경우, 첫 번째 이미지 사용
      return card.image_urls[0];
    }
  }
  return undefined;
}

// Card를 StoryboardFrame으로 변환하는 함수
export function cardToFrame(card: Card, index?: number): StoryboardFrame {
  const snakeCaseCard = card as Card & CardSnakeCaseFields
  return {
    id: card.id,
    scene: card.scene_number || (index !== undefined ? index + 1 : 1),
    shotDescription: card.shot_description || card.content || '',
    shot: card.shot_type || '',
    dialogue: card.dialogue || '',
    sound: card.sound || '',
    imagePrompt: card.image_prompt || '',
    status: (card.storyboard_status as 'pending' | 'enhancing' | 'prompted' | 'generating' | 'ready' | 'error') || 'ready',
    imageUrl: getImageUrlFromCard(card),
    // Timeline fields (mapping from snake_case to camelCase)
    duration: card.duration ?? snakeCaseCard.duration ?? 3,
    audioUrl: card.audioUrl ?? snakeCaseCard.audio_url,
    voiceOverUrl: card.voiceOverUrl ?? snakeCaseCard.voice_over_url,
    voiceOverText: card.voiceOverText ?? snakeCaseCard.voice_over_text,
    startTime: card.startTime ?? snakeCaseCard.start_time,
    videoUrl: card.videoUrl ?? snakeCaseCard.video_url,
    videoKey: card.videoKey ?? snakeCaseCard.video_key,
    videoPrompt: card.videoPrompt ?? snakeCaseCard.video_prompt,
    cardWidth: typeof card.card_width === 'number' ? card.card_width : undefined,
  };
}

// Project ownership verification function
export async function verifyProjectOwnership(
  projectId: string,
  userId: string
): Promise<{ isOwner: boolean; project?: unknown; error?: string }> {
  try {
    if (!projectId || !userId) {
      return { isOwner: false, error: 'Project ID and User ID are required' };
    }

    const baseUrl =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL ??
          process.env.NEXT_PUBLIC_SITE_URL ??
          process.env.NEXT_PUBLIC_BASE_URL ??
          'http://localhost:3000';

    const url = new URL(
      `/api/projects/${encodeURIComponent(projectId)}/ownership`,
      baseUrl
    );
    url.searchParams.set('userId', userId);

    const response = await fetch(url.toString(), {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const typedPayload = payload as {
      error?: unknown
      project?: unknown
      isOwner?: unknown
    }

    if (!response.ok) {
      const errorMessage =
        typeof typedPayload.error === 'string'
          ? typedPayload.error
          : 'Failed to verify project access';

      return { isOwner: false, error: errorMessage };
    }

    const project = typedPayload.project
    const isOwner = typeof typedPayload.isOwner === 'boolean' ? typedPayload.isOwner : Boolean(typedPayload.isOwner)

    return {
      isOwner,
      project,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'object'
        ? JSON.stringify(error)
        : 'Unknown error'
    console.error('[verifyProjectOwnership] Unexpected error:', error)
    return { 
      isOwner: false, 
      error: message.includes('Failed to fetch')
        ? 'Network error while verifying access. Please check your connection and retry.'
        : message 
    };
  }
}
