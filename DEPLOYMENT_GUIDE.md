# 배포 가이드

## 배포 구조

이 프로젝트는 두 가지를 배포해야 합니다:

1. **Next.js 앱** → Vercel에 배포
2. **Cloudflare Worker** (`workers/clerk-sync.ts`) → Cloudflare에 배포

---

## 1. Next.js 앱 배포 (Vercel)

### 환경변수 설정 위치

**Vercel Dashboard**에서 설정:

1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. 프로젝트 선택 → **Settings** → **Environment Variables**
3. 다음 환경변수 추가:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<YOUR_CLERK_PUBLISHABLE_KEY>
CLERK_SECRET_KEY=<YOUR_CLERK_SECRET_KEY>

# Cloudflare D1
CLOUDFLARE_ACCOUNT_ID=<YOUR_CLOUDFLARE_ACCOUNT_ID>
CLOUDFLARE_D1_DATABASE_ID=<YOUR_D1_DATABASE_ID>
CLOUDFLARE_D1_API_TOKEN=<YOUR_D1_API_TOKEN>

# Cloudflare R2
R2_ACCOUNT_ID=<YOUR_R2_ACCOUNT_ID>
R2_ACCESS_KEY_ID=<YOUR_R2_ACCESS_KEY_ID>
R2_SECRET_ACCESS_KEY=<YOUR_R2_SECRET_ACCESS_KEY>
R2_BUCKET_NAME=<YOUR_R2_BUCKET_NAME>
R2_PUBLIC_BASE_URL=<YOUR_R2_PUBLIC_BASE_URL>

# AI Services
FAL_KEY=<YOUR_FAL_KEY>
OPENROUTER_API_KEY=<YOUR_OPENROUTER_KEY>  # Optional

# Payments (Polar)
POLAR_ACCESS_TOKEN=<YOUR_POLAR_ACCESS_TOKEN>  # Optional
POLAR_WEBHOOK_SECRET=<YOUR_POLAR_WEBHOOK_SECRET>  # Optional

# App
NEXT_PUBLIC_APP_URL=<YOUR_APP_URL>
```

### 배포 방법

1. GitHub 저장소를 Vercel에 연결
2. 환경변수 설정 (위 참고)
3. 자동 배포 또는 수동 배포

---

## 2. Cloudflare Worker 배포

### Secrets 설정 위치

**터미널에서 Wrangler CLI로 설정** (로컬 또는 CI/CD):

```bash
# 1. Cloudflare에 로그인 (처음 한 번만)
npx wrangler login

# 2. Secrets 설정
npx wrangler secret put CLERK_SECRET_KEY
# 프롬프트가 나오면 Clerk Secret Key 입력

npx wrangler secret put CLERK_PUBLISHABLE_KEY
# 프롬프트가 나오면 Clerk Publishable Key 입력

# 3. 선택적 환경변수 (필요한 경우)
npx wrangler secret put DEFAULT_CREDITS
# 기본값: 100

# 4. ALLOWED_ORIGINS는 wrangler.toml의 [vars]에 이미 설정되어 있음
# 필요시 수정: wrangler.toml → [vars] → ALLOWED_ORIGINS
```

### 배포 방법

```bash
# 프로젝트 루트에서 실행
npx wrangler deploy
```

### Secrets 확인

```bash
# 설정된 secrets 목록 확인 (값은 표시되지 않음)
npx wrangler secret list
```

### Secrets 삭제

```bash
npx wrangler secret delete CLERK_SECRET_KEY
```

---

## 3. 배포 전 체크리스트

### Next.js 앱 (Vercel)

- [ ] 모든 환경변수가 Vercel Dashboard에 설정됨
- [ ] `NEXT_PUBLIC_*` 변수는 Production, Preview, Development 모두에 설정
- [ ] 비공개 변수는 Production에만 설정
- [ ] 빌드 명령어: `npm run build`
- [ ] 출력 디렉토리: `.next`

### Cloudflare Worker

- [ ] `wrangler.toml`의 `database_id`가 실제 D1 DB ID와 일치
- [ ] `CLERK_SECRET_KEY` secret 설정됨
- [ ] `CLERK_PUBLISHABLE_KEY` secret 설정됨
- [ ] `ALLOWED_ORIGINS`가 프로덕션 도메인으로 설정됨 (또는 `*`)

### D1 데이터베이스

- [ ] `users` 테이블에 `clerk_user_id` 컬럼 존재
- [ ] 필요한 인덱스 생성됨

---

## 4. 배포 후 확인

### Worker 배포 확인

```bash
# Worker 상태 확인
npx wrangler deployments list

# Worker 로그 확인
npx wrangler tail
```

### 테스트

1. **인증 테스트**: Clerk 로그인/회원가입이 정상 작동하는지 확인
2. **Worker 테스트**: 인증 후 사용자 정보가 D1에 동기화되는지 확인
3. **API 테스트**: 이미지 생성, 프로젝트 생성 등 주요 기능 테스트

---

## 5. 문제 해결

### Worker에서 "CLERK_SECRET_KEY is not configured" 에러

→ Secrets가 제대로 설정되지 않음. `npx wrangler secret put CLERK_SECRET_KEY` 재실행

### Worker에서 "D1 database binding is not configured" 에러

→ `wrangler.toml`의 `database_id` 확인 및 수정

### Vercel에서 환경변수 에러

→ Vercel Dashboard에서 환경변수 재확인 및 재배포

---

## 참고

- **Wrangler CLI 문서**: https://developers.cloudflare.com/workers/wrangler/
- **Vercel 환경변수**: https://vercel.com/docs/projects/environment-variables
- **Cloudflare Workers Secrets**: https://developers.cloudflare.com/workers/configuration/secrets/

