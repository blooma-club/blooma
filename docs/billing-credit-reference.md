# Blooma Billing & Credits Reference

> 최종 업데이트: 2025-02-01
> 버전: 1.2

---

## 플랜/청구 주기
- `PlanId`: `Small Brands` | `Agency` | `Studio`
- `BillingInterval`: `month` | `year`

---

## 월별 크레딧 (PLAN_CREDIT_TOPUPS)
| PlanId | 월별 크레딧 |
|---|---:|
| Small Brands | 3,000 |
| Agency | 7,000 |
| Studio | 14,000 |

---

## Polar 상품 ID
### Monthly
- `POLAR_BLOOMA_SMALL_BRANDS_PRODUCT_ID`
- `POLAR_BLOOMA_AGENCY_PRODUCT_ID`
- `POLAR_BLOOMA_STUDIO_PRODUCT_ID`

### Yearly
- `POLAR_BLOOMA_SMALL_BRANDS_YEARLY_PRODUCT_ID`
- `POLAR_BLOOMA_AGENCY_YEARLY_PRODUCT_ID`
- `POLAR_BLOOMA_STUDIO_YEARLY_PRODUCT_ID`

### Legacy (월간 fallback)
- `POLAR_BLOOMA_STARTER_PRODUCT_ID`
- `POLAR_BLOOMA_PRO_PRODUCT_ID`

---

## 크레딧 비용 (CREDIT_COSTS)
| 카테고리 | 기본 비용 | ENV |
|---|---:|---|
| IMAGE | 1 | `CREDIT_COST_IMAGE` |
| IMAGE_EDIT | 1 | `CREDIT_COST_IMAGE_EDIT` |

## 모델별 기본 크레딧
> 모델 정의에 `credits`가 있으면 해당 값을 사용하고, 없을 때만 `CREDIT_COSTS`로 폴백합니다.

| 모델 | 크레딧/장 |
|---|---:|
| Gemini 2.5 Flash Image (Standard) | 15 |
| Gemini 3 Pro Image Preview (Pro) | 50 |
| Gemini 3 Pro Image Preview (4K) | 100 |

---

## 크레딧 지급 정책
### 월간 결제
- `order.paid` 이벤트(`subscription_create`, `subscription_cycle`)에서 월별 크레딧 지급
- `credits_reset_date`를 다음 달 동일 일자로 설정

### 연간 결제
- **연간 결제여도 크레딧은 월별 지급**
- 연간 결제에서 `order.paid` 시점에 연간 총량을 일괄 지급하지 않음
- 월별 지급은 `syncSubscriptionCredits`가 담당
  - 기준: `current_period_start/end` + `credits_reset_date`
  - 트리거: `/api/user/credits`, `ensureCredits()`, `consumeCredits()`
- 예외: `order.paid`가 먼저 도착해서 구독 메타(`current_period_*`)가 아직 저장되지 않은 경우
  - **1회(1개월)만 초기 지급** 후 `credits_reset_date` 설정

---

## API 참고
### POST `/api/billing/checkout`
```json
{ "plan": "Small Brands", "interval": "month" }
```

### GET `/api/billing/status`
```json
{ "hasActiveSubscription": true }
```

### GET `/api/user/credits`
```json
{
  "success": true,
    "data": {
    "total": 7000,
    "used": 1200,
    "remaining": 3800,
    "percentage": 76,
    "resetDate": "2025-02-15T00:00:00Z",
    "subscriptionTier": "Agency"
  }
}
```
