# Production 배포 체크리스트

## ✅ 완료된 항목

- [x] Customer Portal 리다이렉트 작동 확인
- [x] Pricing 페이지에서 Checkout 작동 확인
- [x] PlanId 매핑 정확히 설정 (Small Brands, Agency, Studio)
- [x] Webhook 핸들러 개선 (external_id 사용)
- [x] 구독 상태별 처리 로직 구현 (canceled, revoked, active 등)
- [x] 구독 취소/해지 시 subscription_tier를 null로 설정
- [x] isActiveTier 함수 개선 (실제 플랜만 확인)
- [x] Polar.sh MCP를 통한 전체 검토 완료
- [x] 환경변수 설정 완료

## 🔧 Polar.sh 대시보드 설정

### 1. Webhook 엔드포인트 설정

**Polar.sh 대시보드** → **Settings** → **Webhooks** → **Add Endpoint**

- **URL**: `https://blooma.club/api/billing/webhook`
- **Events** 선택:
  - ✅ `subscription.created` - 구독 생성 시 크레딧 지급 + 플랜 업데이트
  - ✅ `subscription.updated` - 구독 상태 변경 시 처리 (canceled/revoked 감지 포함)
  - ✅ `subscription.active` - 구독 갱신 시 크레딧 지급 + 플랜 업데이트
  - ✅ `subscription.canceled` - 구독 취소 시 subscription_tier를 null로 설정
  - ✅ `subscription.revoked` - 구독 즉시 해지 시 subscription_tier를 null로 설정
  - ✅ `order.paid` - 일회성 구매 처리 (필요시 크레딧 지급)

**Webhook 처리 로직:**
- `subscription.created`: 크레딧 지급 + 플랜 업데이트
- `subscription.updated`: Status 확인 후 취소/해지 시 null 처리, 활성 구독 시 플랜 업데이트
- `subscription.active`: 매월 갱신 시 크레딧 지급 + 플랜 업데이트
- `subscription.canceled`: subscription_tier → null (기간 종료까지 유지)
- `subscription.revoked`: subscription_tier → null (즉시 해지)

### 2. Webhook Secret 확인

- `.env` 파일의 `POLAR_WEBHOOK_SECRET`이 Polar.sh 대시보드의 Webhook Secret과 일치하는지 확인

## 🧪 테스트 체크리스트

### 구독 플로우 테스트

1. **Pricing 페이지 접근**
   - [ ] Small Brands, Agency, Studio 플랜이 정상 표시되는지 확인
   - [ ] 각 플랜의 가격과 크레딧이 정확한지 확인

2. **Checkout 테스트**
   - [ ] 플랜 선택 → Polar.sh Checkout 페이지로 리다이렉트
   - [ ] 결제 완료 → `/dashboard?checkout=success`로 리다이렉트

3. **Webhook 테스트**
   - [ ] 구독 생성 후 서버 로그에서 `[webhook] subscription.created` 확인
   - [ ] 크레딧이 정상적으로 지급되었는지 확인
   - [ ] Credits Indicator에서 크레딧 증가 확인

4. **Customer Portal 테스트**
   - [ ] "Manage Subscription" 버튼 클릭
   - [ ] Polar.sh Customer Portal로 정상 리다이렉트
   - [ ] 구독 정보 확인 가능
   - [ ] 구독 취소/변경 가능

5. **구독 갱신 테스트**
   - [ ] 구독 갱신 시 `[webhook] subscription.active` 이벤트 수신
   - [ ] 크레딧이 자동으로 지급되는지 확인
   - [ ] 플랜 정보가 정상적으로 업데이트되는지 확인

6. **구독 취소/해지 테스트**
   - [ ] 구독 취소 시 `[webhook] subscription.canceled` 이벤트 수신
   - [ ] 구독 즉시 해지 시 `[webhook] subscription.revoked` 이벤트 수신
   - [ ] subscription_tier가 null로 설정되는지 확인
   - [ ] Credits Indicator에서 구독 상태가 정상 반영되는지 확인

## 📋 환경변수 최종 확인

```bash
# Polar.sh 설정
POLAR_ACCESS_TOKEN=<YOUR_POLAR_ACCESS_TOKEN>  # 또는 POLAR_API_KEY
POLAR_API_BASE_URL=https://api.polar.sh  # ✅ 올바른 API URL
POLAR_WEBHOOK_SECRET=<YOUR_POLAR_WEBHOOK_SECRET>  # Webhook 검증용 Secret
POLAR_SERVER=production  # 또는 sandbox (테스트 환경)

# Product IDs (Small Brands, Agency, Studio)
POLAR_BLOOMA_SMALL_BRANDS_PRODUCT_ID=<YOUR_SMALL_BRANDS_PRODUCT_ID>  # $49/month, 2,000 credits
POLAR_BLOOMA_AGENCY_PRODUCT_ID=<YOUR_AGENCY_PRODUCT_ID>              # $99/month, 5,000 credits
POLAR_BLOOMA_STUDIO_PRODUCT_ID=<YOUR_STUDIO_PRODUCT_ID>              # $189/month, 10,000 credits

# Legacy 환경변수 (월간 fallback)
# POLAR_BLOOMA_STARTER_PRODUCT_ID (Small Brands로 매핑)
# POLAR_BLOOMA_PRO_PRODUCT_ID (Agency로 매핑)
```

**중요:** 
- `POLAR_API_BASE_URL`은 API 엔드포인트 URL이어야 합니다 (Customer Portal URL 아님)
- `POLAR_WEBHOOK_SECRET`은 Polar.sh 대시보드의 Webhook Secret과 정확히 일치해야 합니다

## 🚀 배포 전 확인사항

- [ ] 모든 환경변수가 Production 환경에 설정되었는지 확인
- [ ] Webhook 엔드포인트가 Production URL로 설정되었는지 확인
- [ ] Polar.sh 대시보드에서 Webhook Secret이 `.env`와 일치하는지 확인
- [ ] 테스트 구독을 생성하여 전체 플로우가 작동하는지 확인
- [ ] 구독 취소/해지 플로우가 정상 작동하는지 확인
- [ ] 서버 로그에서 에러가 없는지 확인
- [ ] `subscription_tier`가 null로 올바르게 설정되는지 확인 (구독 없음 상태)

## 📊 모니터링

배포 후 다음을 모니터링하세요:

1. **Webhook 수신률**: Polar.sh 대시보드에서 Webhook 전송 성공률 확인
2. **크레딧 지급**: 구독 생성/갱신 시 크레딧이 정상 지급되는지 확인
3. **구독 상태 동기화**: subscription_tier가 Polar.sh 구독 상태와 일치하는지 확인
4. **에러 로그**: 서버 로그에서 `[webhook]` 또는 `[customerportal]` 관련 에러 확인
5. **구독 취소/해지**: 구독 취소/해지 시 subscription_tier가 null로 설정되는지 확인

## 🔍 주요 개선사항 (최신)

### Webhook 핸들러 개선
- `subscription.updated`: Status 기반 처리 (canceled/revoked 감지)
- `subscription.canceled`: subscription_tier → null
- `subscription.revoked`: subscription_tier → null
- `isActiveTier`: 실제 플랜만 확인 (Small Brands, Agency, Studio)

### 구독 상태 처리
- **활성 구독**: `active`, `trialing` → 플랜 정보 업데이트
- **구독 취소**: `canceled` → subscription_tier → null (기간 종료까지 유지)
- **구독 해지**: `revoked` → subscription_tier → null (즉시 해지)
- **기타 상태**: `past_due`, `unpaid` → 플랜 정보 유지

### Polar.sh MCP 검토 완료
- ✅ 구독 상태별 처리 로직 검증 완료
- ✅ Webhook 이벤트 타입 확인 완료
- ✅ external_id 사용 확인 완료
- ✅ 구독 취소/해지 구분 확인 완료

