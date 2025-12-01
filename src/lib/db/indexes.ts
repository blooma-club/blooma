/**
 * 데이터베이스 인덱스 정의
 * 
 * projects, cards 테이블의 조회 성능을 향상시키기 위한 인덱스를 생성합니다.
 * 각 인덱스는 IF NOT EXISTS를 사용하여 중복 생성을 방지합니다.
 */

import { queryD1 } from './d1'

let indexesEnsured = false
let ensureIndexesPromise: Promise<void> | null = null

/**
 * 성능 최적화를 위한 인덱스 SQL 문
 * 
 * projects 테이블:
 * - user_id: 사용자별 프로젝트 목록 조회 최적화
 * - updated_at: 최근 수정순 정렬 최적화
 * 
 * cards 테이블:
 * - project_id: 프로젝트별 카드 조회 최적화
 * - order_index: 카드 순서 정렬 최적화
 * - (project_id, order_index): 복합 인덱스로 프로젝트 내 카드 순서 조회 최적화
 * - user_id: 사용자별 카드 조회 최적화
 */
const INDEX_STATEMENTS = [
  // projects 테이블 인덱스
  `CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects(user_id)`,
  `CREATE INDEX IF NOT EXISTS projects_updated_at_idx ON projects(updated_at)`,
  
  // cards 테이블 인덱스
  `CREATE INDEX IF NOT EXISTS cards_project_id_idx ON cards(project_id)`,
  `CREATE INDEX IF NOT EXISTS cards_order_index_idx ON cards(order_index)`,
  `CREATE INDEX IF NOT EXISTS cards_project_order_idx ON cards(project_id, order_index)`,
  `CREATE INDEX IF NOT EXISTS cards_user_id_idx ON cards(user_id)`,
]

/**
 * 데이터베이스 인덱스 생성을 보장합니다.
 * 한 번만 실행되며, 이후 호출은 즉시 반환됩니다.
 * 
 * @example
 * ```ts
 * // 앱 초기화 시 호출
 * await ensureIndexes()
 * ```
 */
export async function ensureIndexes(): Promise<void> {
  if (indexesEnsured) return

  if (!ensureIndexesPromise) {
    ensureIndexesPromise = (async () => {
      for (const statement of INDEX_STATEMENTS) {
        try {
          await queryD1(statement)
        } catch (error) {
          // 인덱스 생성 실패는 치명적이지 않으므로 경고만 출력
          console.warn(`[ensureIndexes] Failed to create index:`, statement, error)
        }
      }
      indexesEnsured = true
      ensureIndexesPromise = null
    })().catch(error => {
      ensureIndexesPromise = null
      console.error('[ensureIndexes] Error ensuring indexes:', error)
      // 인덱스 생성 실패는 앱 실행을 막지 않음
    })
  }

  return ensureIndexesPromise
}

/**
 * 인덱스 생성 상태를 리셋합니다 (테스트용).
 */
export function resetIndexesState(): void {
  indexesEnsured = false
  ensureIndexesPromise = null
}

