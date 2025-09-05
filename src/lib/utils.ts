import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Card } from '@/types'
import type { StoryboardFrame } from '@/types/storyboard'

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
  return {
    id: card.id,
    scene: card.scene_number || (index !== undefined ? index + 1 : 1),
    shotDescription: card.shot_description || card.content || '',
    shot: card.shot_type || '',
    dialogue: card.dialogue || '',
    sound: card.sound || '',
    imagePrompt: card.image_prompt || '',
    status: (card.storyboard_status as 'pending' | 'enhancing' | 'prompted' | 'generating' | 'ready' | 'error') || 'ready',
    imageUrl: getImageUrlFromCard(card)
  };
}
