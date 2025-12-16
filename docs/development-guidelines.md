# Blooma 개발 가이드라인

> **최종 업데이트**: 2025-12-15

---

## 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────┐
│                     API Route Layer                         │
│  (src/app/api/*)                                            │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer (NEW)                      │
│  creditService │ authService │ billingService               │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     Data Layer                              │
│  src/lib/db/* │ src/lib/credits.ts                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 서비스 사용 가이드

### 1. 인증이 필요한 API

```typescript
// ❌ 기존 방식
import { auth } from '@clerk/nextjs/server'

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ...
}

// ✅ 새로운 방식
import { requireAuthentication } from '@/services'

export async function GET() {
  const { userId } = await requireAuthentication()  // 자동으로 401 throw
  // ...
}
```

### 2. 크레딧 관련 작업

```typescript
// ❌ 기존 방식
import { consumeCredits, refundCredits } from '@/lib/credits'
import { InsufficientCreditsError } from '@/lib/credits-utils'

// ✅ 새로운 방식
import { 
  consumeCredits, 
  getCreditBalance,
  withCreditConsumption 
} from '@/services'
import { InsufficientCreditsError } from '@/lib/errors'

// 크레딧 차감 후 작업 실행 (실패 시 자동 환불)
const result = await withCreditConsumption(
  userId,
  creditCost,
  async () => await generateImage(params)
)
```

### 3. 구독 상태 확인

```typescript
// ❌ 기존 방식
import { hasActiveSubscription } from '@/lib/billing/subscription'

// ✅ 새로운 방식
import { hasActiveSubscription, getSubscriptionInfo } from '@/services'

// 상세 정보가 필요한 경우
const info = await getSubscriptionInfo(userId)
// { isActive, tier, status, periodEnd, willCancel, ... }
```

### 4. 권한 확인

```typescript
// 구독 필수 API
import { requireActiveSubscription } from '@/services'

export async function POST() {
  const user = await requireActiveSubscription()  // 구독 없으면 403 throw
  // ...
}

// 최소 플랜 요구
import { requireMinimumPlan } from '@/services'

export async function POST() {
  await requireMinimumPlan('Pro')  // Pro 이상 필요
  // ...
}
```

### 5. 결제 관련

```typescript
import { createCheckoutSession, getCustomerPortalUrl } from '@/services'

// 체크아웃
const { url } = await createCheckoutSession(userId, 'Pro')

// 고객 포털
const portalUrl = await getCustomerPortalUrl(userId)
```

---

## 에러 처리 가이드

### 도메인 에러 사용

```typescript
import { 
  InsufficientCreditsError,
  SubscriptionAlreadyActiveError,
  AuthorizationError,
  ResourceNotFoundError
} from '@/lib/errors'

// 크레딧 부족
throw new InsufficientCreditsError(required, available)

// 이미 구독 중
throw new SubscriptionAlreadyActiveError(currentTier)

// 권한 없음
throw new AuthorizationError('This feature requires Pro plan')

// 리소스 없음
throw new ResourceNotFoundError('Project', projectId)
```

### API 핸들러에서 에러 처리

```typescript
import { createErrorHandler } from '@/lib/errors'

export async function POST(request: Request) {
  const handleError = createErrorHandler('api/my-endpoint')
  
  try {
    // ... 비즈니스 로직
  } catch (error) {
    return handleError(error)  // 자동으로 적절한 HTTP 응답 생성
  }
}
```

---

## 상태 관리 가이드

### 계층 구조

| 레이어 | 용도 | 예시 |
|--------|------|------|
| **SWR** | 서버 데이터 | 프로젝트, 카드, 크레딧, 구독 |
| **Zustand** | UI 상태 | 모달, 뷰 모드, 선택 상태 |
| **useState** | 로컬 상태 | 폼 입력, 토글 |

### SWR 설정

```typescript
import useSWR from 'swr'
import { SWR_CONFIG, SWRKeys, fetcher } from '@/lib/state'

// 기본 사용
const { data, mutate } = useSWR(SWRKeys.userCredits, fetcher, SWR_CONFIG.default)

// 자주 변경되는 데이터
const { data } = useSWR(key, fetcher, SWR_CONFIG.frequent)

// 거의 변경되지 않는 데이터
const { data } = useSWR(key, fetcher, SWR_CONFIG.static)
```

### 낙관적 업데이트

```typescript
const updateItem = async (id: string, updates: Partial<Item>) => {
  const original = data  // 1. 원본 저장
  
  mutate(prev => ({      // 2. 낙관적 업데이트
    ...prev,
    data: prev.data.map(item => item.id === id ? { ...item, ...updates } : item)
  }), false)
  
  try {
    await fetch('/api/items', { method: 'PUT', body: JSON.stringify(updates) })
  } catch (error) {
    mutate(original, false)  // 3. 실패 시 롤백
    throw error
  }
}
```

### Zustand (UI 상태만)

```typescript
// ✅ 올바른 사용 - UI 상태
const isModalOpen = useUIStore(state => state.isModalOpen)
const viewMode = useUIStore(state => state.storyboardViewMode)

// ❌ 피해야 할 패턴 - 서버 데이터 복사
const projects = useStore(state => state.projects)  // SWR 사용
```

### 피해야 할 패턴

| 패턴 | 문제점 | 해결책 |
|------|--------|--------|
| Zustand에 서버 데이터 저장 | SWR과 중복 | SWR만 사용 |
| sessionStorage 캐싱 | SWR 캐시와 중복 | SWR fallbackData 사용 |
| 여러 곳에서 같은 API 호출 | 중복 요청 | SWR dedupingInterval |

---

## 마이그레이션 전략

### 점진적 마이그레이션 권장

| 상황 | 권장 방식 |
|------|----------|
| 새 API 추가 | 서비스 레이어 사용 |
| 기존 API 버그 수정 | 수정 부분만 서비스로 전환 |
| 기존 API 기능 추가 | 해당 핸들러 전체를 서비스로 전환 |
| 대규모 리팩토링 | 일괄 전환 (별도 PR) |

### 마이그레이션 예시

```typescript
// Before: 기존 API 핸들러
export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const alreadyActive = await hasActiveSubscription(userId)
  if (alreadyActive) return NextResponse.json({ error: 'Already active' }, { status: 409 })
  
  // ... checkout logic
}

// After: 서비스 레이어 사용
export async function POST(request: Request) {
  const handleError = createErrorHandler('api/billing/checkout')
  
  try {
    const { userId } = await requireAuthentication()
    const { url } = await createCheckoutSession(userId, 'Pro')
    return NextResponse.json({ url })
  } catch (error) {
    return handleError(error)
  }
}
```

---

## Import 경로 정리

```typescript
// 서비스
import { ... } from '@/services'

// 에러
import { ... } from '@/lib/errors'

// 데이터베이스
import { ... } from '@/lib/db'

// 타입 (필요시)
import type { CreditBalance, SubscriptionInfo } from '@/services'
import type { PlanId } from '@/lib/billing/plans'
```

---

## 데이터베이스 최적화

### 1. 캐싱 사용

```typescript
import { 
  getOrSet, 
  invalidateUserCache,
  CacheTTL 
} from '@/lib/db'

// 캐시된 쿼리 (자동 TTL)
const user = await getOrSet(
  `user:${userId}`,
  () => getUserById(userId),
  { ttl: CacheTTL.MEDIUM }  // 5분
)

// 데이터 변경 시 캐시 무효화
await updateUser(userId, data)
invalidateUserCache(userId)
```

### 2. 배치 쿼리

```typescript
import { batchedQuery, getUsersByIds } from '@/lib/db'

// 개별 쿼리 → 자동 배치화
const [user1, user2, user3] = await Promise.all([
  batchedQuery<User>('SELECT * FROM users WHERE id = ?', [id1]),
  batchedQuery<User>('SELECT * FROM users WHERE id = ?', [id2]),
  batchedQuery<User>('SELECT * FROM users WHERE id = ?', [id3]),
])

// 또는 bulk 헬퍼 사용
const usersMap = await getUsersByIds(userIds)  // Map<id, User>
```

### 3. 캐시 TTL 가이드

| 데이터 유형 | 권장 TTL | 상수 |
|------------|----------|------|
| 사용자 기본 정보 | 30초 | `CacheTTL.SHORT` |
| 크레딧 잔액 | 30초 | `CacheTTL.SHORT` |
| 구독 정보 | 5분 | `CacheTTL.MEDIUM` |
| 프로젝트 목록 | 5분 | `CacheTTL.MEDIUM` |
| 설정/메타 데이터 | 30분 | `CacheTTL.LONG` |

### 4. 캐시 무효화 규칙

```typescript
// 크레딧 변경 시
invalidateUserCache(userId)  // user, credits, subscription 모두

// 프로젝트 변경 시
invalidateProjectCache(projectId, userId)  // project + user's projects

// 구독 변경 시 (웹훅에서)
invalidateSubscriptionCache(userId)  // subscription + user
```

---

## 파일 구조

```
src/
├── services/
│   ├── index.ts           # 통합 export
│   ├── creditService.ts   # 크레딧 관련
│   ├── authService.ts     # 인증/권한
│   └── billingService.ts  # 결제/구독
├── lib/
│   ├── errors/
│   │   ├── index.ts       # 통합 export
│   │   ├── api.ts         # ApiError, ErrorCodes
│   │   ├── domain.ts      # 도메인 에러 클래스
│   │   └── handlers.ts    # createErrorHandler
│   ├── db/
│   │   ├── index.ts       # 통합 export
│   │   ├── d1.ts          # D1 REST API 기본
│   │   ├── cache.ts       # 메모리 캐시
│   │   ├── cachedQueries.ts # 캐시된 쿼리
│   │   └── batcher.ts     # 쿼리 배치화
│   ├── billing/           # (레거시 - 점진적 마이그레이션)
│   └── credits.ts         # (레거시 - creditService로 대체)
└── app/api/               # API 핸들러
```

