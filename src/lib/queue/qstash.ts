/**
 * QStash Queue 클라이언트
 * 
 * Upstash QStash를 사용하여 장시간 실행되는 작업(비디오 생성 등)을
 * 백그라운드에서 처리합니다. Vercel Serverless 타임아웃 제한을 우회합니다.
 */

import { Client, Receiver } from '@upstash/qstash'

// QStash 환경변수
const QSTASH_TOKEN = process.env.QSTASH_TOKEN
const QSTASH_CURRENT_SIGNING_KEY = process.env.QSTASH_CURRENT_SIGNING_KEY
const QSTASH_NEXT_SIGNING_KEY = process.env.QSTASH_NEXT_SIGNING_KEY

// QStash 클라이언트 (환경변수가 있을 때만 초기화)
let qstashClient: Client | null = null
let qstashReceiver: Receiver | null = null

/**
 * QStash 클라이언트 가져오기
 */
export function getQStashClient(): Client | null {
  if (qstashClient) return qstashClient
  
  if (!QSTASH_TOKEN) {
    console.warn('[QStash] QSTASH_TOKEN not configured. Queue disabled.')
    return null
  }

  try {
    qstashClient = new Client({ token: QSTASH_TOKEN })
    return qstashClient
  } catch (error) {
    console.error('[QStash] Failed to initialize client:', error)
    return null
  }
}

/**
 * QStash Receiver 가져오기 (웹훅 검증용)
 */
export function getQStashReceiver(): Receiver | null {
  if (qstashReceiver) return qstashReceiver
  
  if (!QSTASH_CURRENT_SIGNING_KEY || !QSTASH_NEXT_SIGNING_KEY) {
    console.warn('[QStash] Signing keys not configured. Webhook verification disabled.')
    return null
  }

  try {
    qstashReceiver = new Receiver({
      currentSigningKey: QSTASH_CURRENT_SIGNING_KEY,
      nextSigningKey: QSTASH_NEXT_SIGNING_KEY,
    })
    return qstashReceiver
  } catch (error) {
    console.error('[QStash] Failed to initialize receiver:', error)
    return null
  }
}

/**
 * QStash 설정 여부 확인
 */
export function isQStashConfigured(): boolean {
  return Boolean(QSTASH_TOKEN)
}

/**
 * 비디오 생성 작업 데이터 타입
 */
export interface VideoJobPayload {
  jobId: string
  userId: string
  frameId: string
  projectId: string
  imageUrl: string
  startImageUrl: string | null
  endImageUrl: string | null
  prompt: string
  modelId: string
  creditCost: number
}

/**
 * 비디오 생성 작업을 큐에 추가
 * 
 * @param payload - 비디오 생성 작업 데이터
 * @param webhookUrl - 작업 완료 시 호출할 웹훅 URL
 * @returns 메시지 ID 또는 null (QStash 미설정 시)
 */
export async function enqueueVideoJob(
  payload: VideoJobPayload,
  webhookUrl: string
): Promise<string | null> {
  const client = getQStashClient()
  if (!client) {
    return null
  }

  try {
    const response = await client.publishJSON({
      url: webhookUrl,
      body: payload,
      retries: 3,
      // 10초 후 시작 (즉시 시작해도 됨)
      delay: 0,
    })

    console.log('[QStash] Video job enqueued:', {
      messageId: response.messageId,
      jobId: payload.jobId,
      frameId: payload.frameId,
    })

    return response.messageId
  } catch (error) {
    console.error('[QStash] Failed to enqueue video job:', error)
    throw error
  }
}

/**
 * 웹훅 요청 검증
 * 
 * @param signature - 요청 헤더의 Upstash-Signature
 * @param body - 요청 본문 (raw string)
 * @returns 검증 성공 여부
 */
export async function verifyWebhook(
  signature: string,
  body: string
): Promise<boolean> {
  const receiver = getQStashReceiver()
  
  // Receiver가 없으면 검증 스킵 (개발 환경)
  if (!receiver) {
    console.warn('[QStash] Webhook verification skipped (no receiver)')
    return true
  }

  try {
    await receiver.verify({
      signature,
      body,
    })
    return true
  } catch (error) {
    console.error('[QStash] Webhook verification failed:', error)
    return false
  }
}

