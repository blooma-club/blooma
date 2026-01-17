# Blooma 결제 시스템 문서

> 최종 업데이트: 2025-02-01
> 결제 프로바이더: Polar
> 인증: Supabase Auth
> 데이터베이스: Supabase (Postgres)

---

## 핵심 엔드포인트
- `POST /api/billing/checkout` : 체크아웃 세션 생성
- `GET /api/billing/status` : 구독 활성 상태 확인
- `POST /api/billing/webhook` : Polar 웹훅 수신
- `GET /api/user/credits` : 크레딧 조회 (연간 월별 지급 동기화 포함)
- `GET /api/user/subscription` : Polar 구독 정보 조회
- `/customerportal` : 고객 포털

---

## 데이터 모델 (Supabase)
### users
- `subscription_tier`: Small Brands | Agency | Studio | null
- `subscription_status`: active | trialing | canceled | revoked | ended | null
- `polar_customer_id`, `polar_subscription_id`
- `current_period_start`, `current_period_end`
- `cancel_at_period_end`
- `credits`, `credits_used`, `credits_reset_date`

### webhook_events
- `event_id`, `event_type`, `status`, `received_at`, `processed_at`, `error`

---

## 플랜/상품 매핑
- `PlanId`: Small Brands | Agency | Studio
- `BillingInterval`: month | year

### Monthly Product IDs
- `POLAR_BLOOMA_SMALL_BRANDS_PRODUCT_ID`
- `POLAR_BLOOMA_AGENCY_PRODUCT_ID`
- `POLAR_BLOOMA_STUDIO_PRODUCT_ID`

### Yearly Product IDs
- `POLAR_BLOOMA_SMALL_BRANDS_YEARLY_PRODUCT_ID`
- `POLAR_BLOOMA_AGENCY_YEARLY_PRODUCT_ID`
- `POLAR_BLOOMA_STUDIO_YEARLY_PRODUCT_ID`

---

## 체크아웃 흐름
1) 클라이언트가 `/api/billing/checkout`에 `{ plan, interval }` 전송
2) 서버가 `plans.ts`로 상품 ID 결정
3) Polar 체크아웃 URL 반환
4) 결제 완료 후 Polar 웹훅 수신 (`order.paid`, `subscription.*`)

---

## 크레딧 정책
### 월간 결제
- `order.paid`(billing_reason: `subscription_create`, `subscription_cycle`)에서 월별 크레딧 지급
- `credits_reset_date`를 다음 달 동일 일자로 설정

### 연간 결제 (월별 지급)
- 연간 결제여도 **크레딧은 월별 지급**
- 연간 `order.paid`에서 연간 총량 일괄 지급하지 않음
- 월별 지급은 `syncSubscriptionCredits`가 담당
  - 기준: `current_period_start/end` + `credits_reset_date`
  - 트리거: `/api/user/credits`, `ensureCredits()`, `consumeCredits()`
- 예외: `order.paid`가 먼저 도착해 구독 메타가 없을 때는 **1회(1개월) 초기 지급** 후 reset date 설정

---

## 웹훅 이벤트
- `subscription.created` / `subscription.updated` / `subscription.active`
- `subscription.canceled` / `subscription.uncanceled` / `subscription.revoked`
- `order.paid`

---

## 검증 시나리오 (필수)
1) 신규 결제: `order.paid`(subscription_create) 수신 → 크레딧 지급 + 트랜잭션 기록
2) 월간 갱신: `order.paid`(subscription_cycle) 수신 → 매월 크레딧 지급
3) 연간 결제: `order.paid` 수신 → 일괄 지급 없음 (필요 시 1회 초기 지급만)
4) 구독 취소: `subscription.canceled` → `cancel_at_period_end` 반영
5) 구독 복구: `subscription.uncanceled` → 상태 복구 + 취소 플래그 해제
6) 구독 회수: `subscription.revoked` → 즉시 비활성화
7) 웹훅 중복: 같은 `webhook-id` 재전송 시 중복 처리 없음

---

## 환경 변수
- `POLAR_ACCESS_TOKEN` (또는 `POLAR_API_KEY`)
- `POLAR_WEBHOOK_SECRET`
- `POLAR_SERVER` (`sandbox` | `production`)
- `POLAR_BLOOMA_*_PRODUCT_ID`
- `POLAR_BLOOMA_*_YEARLY_PRODUCT_ID`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 트러블슈팅
- 연간 플랜인데 크레딧이 안 보임: `/api/user/credits` 호출로 동기화 확인
- 상품 ID 매핑 오류: `plans.ts` 및 환경 변수 확인
- 구독 상태가 안 맞음: `users.subscription_status`, `current_period_end`, `cancel_at_period_end` 확인
