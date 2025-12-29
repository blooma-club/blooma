# Blooma 개발 가이드라인

> 작성일: 2025-02-01

---

## 1. 프로젝트 구조

```
src/
├─ app/                      # Next.js App Router
│  ├─ (workspace)/           # 인증된 사용자 페이지
│  │  └─ studio/            # Studio 기능
│  ├─ api/                   # API Routes
│  └─ pricing/               # 가격 페이지
├─ components/               # UI 컴포넌트
│  ├─ ui/                   # shadcn/ui 기반
│  ├─ billing/              # 결제 관련
│  └─ libraries/            # 모델 라이브러리 등
├─ hooks/                    # 커스텀 훅
├─ lib/                      # 유틸리티/비즈니스 로직
│  ├─ db/                   # D1 데이터베이스 레이어
│  ├─ fal-ai/               # Fal AI 클라이언트
│  ├─ billing/              # 결제 로직
│  └─ errors/               # 에러 핸들링
└─ store/                    # Zustand UI 상태
```

---

## 2. API 라우트 규칙

### 인증
- 모든 API에서 `auth()` 또는 `requireAuth()` 호출 필수
- 인증 실패 시 401 반환

### 에러 처리
- 모든 API에 `createErrorHandler()` 사용
- 에러 메시지는 클라이언트에 안전하게 전달

```ts
import { createErrorHandler, requireAuth } from '@/lib/errors/handlers'

export async function POST(request: Request) {
  const handleError = createErrorHandler('api/my-endpoint')
  try {
    const { userId } = await requireAuth()
    // ...
  } catch (error) {
    return handleError(error)
  }
}
```

---

## 3. 이미지 생성

### 모델 티어
| 티어 | 모델 ID | 크레딧 |
|------|---------|------:|
| Standard | `fal-ai/gpt-image-1.5/edit` | 10 |
| Pro | `fal-ai/nano-banana-pro/edit` | 50 |

### 프롬프트 시스템
- JSON 구조 기반 프롬프트 사용
- View type에 따라 pose 자동 설정
- 사용자 입력은 `user_details` 필드에 추가

### 생성 플로우
```
1. 클라이언트: 모델 + 의류 이미지 수집
2. ensureR2Url()로 blob URL을 R2 URL로 변환
3. POST /api/generate-image 호출
4. Fal AI에서 이미지 생성
5. 결과를 R2에 캐시
6. POST /api/studio/generated로 메타데이터 저장
```

---

## 4. 크레딧 관리

### 기본 패턴
```ts
// 생성 전 차감
await consumeCredits(userId, creditCost)

try {
  const result = await generateImage(...)
  if (!result.success) {
    await refundCredits(userId, creditCost)
  }
} catch {
  await refundCredits(userId, creditCost)
}
```

### 비용 계산
- `getCreditCostForModel(modelId, category, options)`
- Pro 모델 4K 선택 시 2배 비용

---

## 5. 파일 업로드

### 클라이언트
```ts
import { ensureR2Url } from '@/lib/imageUpload'

// blob URL -> R2 URL 변환
const r2Url = await ensureR2Url(blobUrl, { projectId: 'studio' })
```

### 서버
- `uploadImageToR2()`: URL에서 이미지 다운로드 후 R2 업로드
- `uploadModelImageToR2()`: 모델 에셋 전용 업로드

---

## 6. 데이터베이스 (D1)

### 쿼리 함수
```ts
import { queryD1, queryD1Single } from '@/lib/db/d1'

const rows = await queryD1<User>('SELECT * FROM users WHERE id = ?', [id])
const user = await queryD1Single<User>('SELECT * FROM users WHERE id = ?', [id])
```

### 테이블 자동 생성
- 각 모듈에서 `ensure*Table()` 함수로 테이블 존재 보장
- 첫 쿼리 시 자동 생성

---

## 7. 상태 관리

### 서버 데이터
- SWR / SWRInfinite 사용
- API 응답 캐싱 및 자동 재검증

### UI 상태
- 간단한 상태: `useState`
- 복잡한 공유 상태: Zustand

---

## 8. UI 컴포넌트

### 스타일 규칙
- shadcn/ui 컴포넌트 기반
- Tailwind CSS 유틸리티 사용
- 다크 모드 지원 (CSS 변수 활용)

### 반응형
- 모바일 우선 접근
- `md:`, `lg:` 브레이크포인트 활용

---

## 9. 문서 유지보수

### 변경 시 업데이트 필요 문서
- `/docs/BloomaPRD.txt`: 기능 변경 시
- `/docs/BloomaTRD.txt`: 기술 구조 변경 시
- `/docs/billing-credit-reference.md`: 결제/크레딧 변경 시
- `/docs/development-guidelines.md`: 개발 규칙 변경 시
