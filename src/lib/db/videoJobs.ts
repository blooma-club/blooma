/**
 * 비디오 생성 작업 상태 관리
 * 
 * 비동기 비디오 생성 작업의 상태를 추적합니다.
 */

import { queryD1, queryD1Single } from './d1'

let videoJobsTableEnsured = false
let ensureVideoJobsTablePromise: Promise<void> | null = null

const VIDEO_JOBS_TABLE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS video_jobs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    frame_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    video_url TEXT,
    video_key TEXT,
    error_message TEXT,
    model_id TEXT,
    prompt TEXT,
    credit_cost INTEGER DEFAULT 0,
    qstash_message_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS video_jobs_user_id_idx ON video_jobs(user_id)`,
  `CREATE INDEX IF NOT EXISTS video_jobs_frame_id_idx ON video_jobs(frame_id)`,
  `CREATE INDEX IF NOT EXISTS video_jobs_status_idx ON video_jobs(status)`,
]

/**
 * 비디오 작업 테이블 생성 보장
 */
export async function ensureVideoJobsTable(): Promise<void> {
  if (videoJobsTableEnsured) return

  if (!ensureVideoJobsTablePromise) {
    ensureVideoJobsTablePromise = (async () => {
      for (const statement of VIDEO_JOBS_TABLE_STATEMENTS) {
        try {
          await queryD1(statement)
        } catch (error) {
          console.warn('[VideoJobs] Failed to execute:', statement, error)
        }
      }
      videoJobsTableEnsured = true
      ensureVideoJobsTablePromise = null
    })().catch(error => {
      ensureVideoJobsTablePromise = null
      console.error('[VideoJobs] Error ensuring table:', error)
    })
  }

  return ensureVideoJobsTablePromise
}

export type VideoJobStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface VideoJob {
  id: string
  user_id: string
  frame_id: string
  project_id: string
  status: VideoJobStatus
  video_url: string | null
  video_key: string | null
  error_message: string | null
  model_id: string | null
  prompt: string | null
  credit_cost: number
  qstash_message_id: string | null
  created_at: string
  updated_at: string
}

/**
 * 비디오 작업 생성
 */
export async function createVideoJob(job: Omit<VideoJob, 'created_at' | 'updated_at'>): Promise<VideoJob> {
  await ensureVideoJobsTable()
  
  const now = new Date().toISOString()
  
  await queryD1(
    `INSERT INTO video_jobs (
      id, user_id, frame_id, project_id, status, video_url, video_key,
      error_message, model_id, prompt, credit_cost, qstash_message_id,
      created_at, updated_at
    ) VALUES (
      ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?13
    )`,
    [
      job.id,
      job.user_id,
      job.frame_id,
      job.project_id,
      job.status,
      job.video_url,
      job.video_key,
      job.error_message,
      job.model_id,
      job.prompt,
      job.credit_cost,
      job.qstash_message_id,
      now,
    ]
  )

  return {
    ...job,
    created_at: now,
    updated_at: now,
  }
}

/**
 * 비디오 작업 조회
 */
export async function getVideoJob(jobId: string): Promise<VideoJob | null> {
  await ensureVideoJobsTable()
  
  return queryD1Single<VideoJob>(
    `SELECT * FROM video_jobs WHERE id = ?1`,
    [jobId]
  )
}

/**
 * 프레임의 진행 중인 비디오 작업 조회
 */
export async function getPendingVideoJobForFrame(frameId: string): Promise<VideoJob | null> {
  await ensureVideoJobsTable()
  
  return queryD1Single<VideoJob>(
    `SELECT * FROM video_jobs 
     WHERE frame_id = ?1 AND status IN ('pending', 'processing')
     ORDER BY created_at DESC
     LIMIT 1`,
    [frameId]
  )
}

/**
 * 비디오 작업 상태 업데이트
 */
export async function updateVideoJobStatus(
  jobId: string,
  status: VideoJobStatus,
  updates?: Partial<Pick<VideoJob, 'video_url' | 'video_key' | 'error_message'>>
): Promise<void> {
  await ensureVideoJobsTable()
  
  const now = new Date().toISOString()
  
  if (updates) {
    await queryD1(
      `UPDATE video_jobs 
       SET status = ?1, 
           video_url = COALESCE(?2, video_url),
           video_key = COALESCE(?3, video_key),
           error_message = COALESCE(?4, error_message),
           updated_at = ?5
       WHERE id = ?6`,
      [
        status,
        updates.video_url ?? null,
        updates.video_key ?? null,
        updates.error_message ?? null,
        now,
        jobId,
      ]
    )
  } else {
    await queryD1(
      `UPDATE video_jobs SET status = ?1, updated_at = ?2 WHERE id = ?3`,
      [status, now, jobId]
    )
  }
}

/**
 * 사용자의 최근 비디오 작업 목록 조회
 */
export async function getRecentVideoJobs(
  userId: string,
  limit: number = 10
): Promise<VideoJob[]> {
  await ensureVideoJobsTable()
  
  return queryD1<VideoJob>(
    `SELECT * FROM video_jobs 
     WHERE user_id = ?1 
     ORDER BY created_at DESC 
     LIMIT ?2`,
    [userId, limit]
  )
}

