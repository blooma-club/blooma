# 배포 가이드

## 1. Next.js 배포 (Vercel)

### 환경 변수 설정

Vercel Dashboard → Settings → Environment Variables에 아래 값을 설정합니다.

```bash
# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL=<YOUR_SUPABASE_URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<YOUR_SUPABASE_ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<YOUR_SUPABASE_SERVICE_ROLE_KEY>

# Supabase Database
SUPABASE_DATABASE_URL=<YOUR_SUPABASE_DATABASE_URL>
SUPABASE_DB_SSL=true  # optional

# Cloudflare R2
R2_ACCOUNT_ID=<YOUR_R2_ACCOUNT_ID>
R2_ACCESS_KEY_ID=<YOUR_R2_ACCESS_KEY_ID>
R2_SECRET_ACCESS_KEY=<YOUR_R2_SECRET_ACCESS_KEY>
R2_BUCKET_NAME=<YOUR_R2_BUCKET_NAME>
R2_PUBLIC_BASE_URL=<YOUR_R2_PUBLIC_BASE_URL>

# AI Services
GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>

# Payments (Polar)
POLAR_ACCESS_TOKEN=<YOUR_POLAR_ACCESS_TOKEN>
POLAR_WEBHOOK_SECRET=<YOUR_POLAR_WEBHOOK_SECRET>
POLAR_API_BASE_URL=https://api.polar.sh

# App
NEXT_PUBLIC_APP_URL=<YOUR_APP_URL>
```

### 배포 순서

1. GitHub 레포 연결
2. 환경 변수 등록
3. 자동 배포 또는 수동 배포

---

## 2. Supabase 마이그레이션

- 마이그레이션: `supabase/migrations/` 적용
- 이미 적용된 경우 재적용 불필요

---

## 3. 배포 체크리스트

- [ ] Supabase Auth 로그인 정상 동작
- [ ] 결제(POLAR) 체크아웃/웹훅 정상
- [ ] 크레딧 적립/소모 정상
- [ ] 이미지 생성 및 갤러리 조회 정상

---

## 4. 문제 해결

### SUPABASE_DATABASE_URL 관련 오류
- Vercel 환경 변수에 DB URL이 등록되었는지 확인

### 인증 관련 오류
- NEXT_PUBLIC_SUPABASE_URL / ANON KEY / SERVICE ROLE KEY 확인

