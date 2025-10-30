# Start with AI - 스토리보드 생성 로직

## 개요

"Start with AI" 기능은 사용자가 스크립트를 입력하거나 AI가 생성한 스크립트를 기반으로 자동으로 스토리보드를 생성하는 시스템입니다.

## 전체 플로우

```
사용자 액션
    ↓
[1] Start with AI 버튼 클릭
    ↓
[2] Setup 페이지로 이동 (/project/[id]/setup)
    ↓
[3] 스크립트 입력 또는 AI 생성 (선택)
    ↓
[4] Generate Storyboard 버튼 클릭
    ↓
[5] API 호출: /api/storyboard/build
    ↓
[6] 스토리보드 엔진 처리
    ↓
[7] 데이터베이스에 카드 저장
    ↓
[8] 비동기 이미지 생성 시작
    ↓
[9] 스토리보드 뷰 Bett로 리디렉션
```

---

## 상세 단계

### 1. 진입점 - Start 페이지

**파일:** `src/app/project/[id]/storyboard/start/page.tsx`

사용자가 프로젝트에 처음 진입했을 때:

1. 기존 스토리보드(카드) 존재 여부 확인
2. 있으면 → 스토리보드 뷰로 리디렉션
3. 없으면 → 생성 옵션 페이지 표시
   - **Start with AI**: `/project/[id]/setup`으로 이동
   - **Manual Creation**: 빈 스토리보드로 시작

```tsx
// 시작 페이지에서 "Start with AI" 클릭 시
const navigateToSetup = () => {
  router.push(`/project/${projectId}/setup`)
}
```

---

### 2. Setup 페이지 - 스크립트 작성 및 설정

**파일:** `src/components/project/SetupForm.tsx`

#### 2.1 스크립트 생성 (선택사항)

**API:** `POST /api/script/generate`

사용자가 AI로 스크립트를 생성할 수 있습니다.

**요청 파라미터:**
```typescript
{
  userScript?: string           // 사용자가 직접 입력한 스크립트
  settings?: {                  // 선택적 설정
    intent?: string
    genre?: string
    tone?: string
    audience?: string
    objective?: string
    keyMessage?: string
    language?: string
    constraints?: string
  }
  model?: string                // LLM 모델 (기본: 'google/gemini-flash-1.5')
  questionMode?: boolean        // 질문 기반 모드 (기본: true)
  messages?: Array<{            // 채팅 히스토리
    role: 'user' | 'assistant' | 'system'
    content: string
  }>
}
```

**질문 기반 모드 (Question Mode):**
- 총 5개의 질문을 순차적으로 질문
- 질문 주제:
  1. 프로젝트 타입
  2. 타겟 오디언스
  3. 핵심 메시지/감정/스토리
  4. 비주얼 스타일, 무드, 미적 선호도
  5. 비디오 길이, 포맷, 플랫폼

**응답:**
```typescript
// 질문인 경우
{
  script: string              // 생성된 질문
  isQuestion: true
  questionNumber: number      // 현재 질문 번호
  totalQuestions: 5
  meta: { ... }
}

// 최종 스크립트인 경우
{
  script: string              // 생성된 스토리보드 스크립트
  isQuestion: false
  isFinalScript: true
  meta: { ... }
}
```

#### 2.2 스토리보드 생성

`handleGenerateStoryboard` 함수가 호출됩니다.

**요청 파라미터:**
```typescript
{
  projectId: string
  script: string              // 생성/입력된 스크립트
  visualStyle: string         // 비주얼 스타일 (예: "Photorealistic")
  ratio: string               // 종횡비 (예: "16:9")
  mode: 'async' | 'sync'      // 처리 모드
  aiModel?: string            // 이미지 생성 모델
  characters?: Array<{        // 캐릭터 정보
    id: string
    name: string
    imageUrl?: string
    originalImageUrl?: string
    editPrompt?: string
  }>
  sceneMetadata?: Array<{     // 씬별 캐릭터 메타데이터
    sceneId: string
    metadata: Array<{
      characterId: string
      characterName: string
      characterHandle?: string
      characterImageUrl?: string
      modelId: string
      modelLabel: string
    }>
  }>
}
```

**API 호출:**
```typescript
const res = await fetch('/api/storyboard/build', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
```

---

### 3. 스토리보드 빌드 API

**파일:** `src/app/api/storyboard/build/route.ts`

#### 3.1 요청 처리

1. **인증 확인** - Clerk를 통한 사용자 인증
2. **스크립트 가져오기**
   - `modelId`가 있으면 `script_models` 테이블에서 조회
   - 없으면 직접 제공된 `script` 사용

3. **스토리보드 생성**
   ```typescript
   const sb = await createStoryboard({
     projectId,
     rawScript: scriptWithoutTitle,
     aspectRatio: aspect,
     style: chosenStyle,
     processMode: mode,
     topTitle,
     aiModel,
     characters,
     sceneMetadata,
   })
   ```

#### 3.2 카드 데이터베이스 저장

각 프레임을 데이터베이스의 `cards` 테이블에 저장:

```typescript
const cardsToInsert: PersistedCardInput[] = frames.map((frame, idx) => ({
  id: randomUUID(),
  projectId,
  userId: ownerId,
  type: 'scene',
  title: `Scene ${frame.scene}`,
  content: frame.shotDescription || '',
  userInput: frame.imagePrompt || '',
  sceneNumber: frame.scene ?? idx + 1,
  shotType: frame.shot || '',
  shotDescription: frame.shotDescription || '',
  dialogue: frame.dialogue || '',
  sound: frame.sound || '',
  imagePrompt: frame.imagePrompt || '',
  background: frame.background || '',
  storyboardStatus: 'pending',
  orderIndex: idx,
  metadata: frame.characterMetadata ? { characterMetadata: frame.characterMetadata } : undefined,
}))
```

**응답:**
```typescript
{
  projectId: string
  storyboardId: string
  mode: 'async' | 'sync'
  framesCount: number
  title: string
  frames: Array<{...}>
  backgrounds: Array<{...}>
}
```

---

### 4. 스토리보드 엔진

**파일:** `src/lib/storyboardEngine.ts`

#### 4.1 `createStoryboard` 함수

주요 처리 단계:

**1. 스크립트 파싱**
```typescript
const scenes: ParsedScene[] = parseScript(scriptWithoutTitle)
```
- 스크립트를 개별 씬으로 분해
- 각 씬에서 Shot, Camera Shot, Angle, Background, Dialogue, Sound 추출

**2. 배경 후보 추출**
```typescript
const backgroundCandidates = await extractBackgrounds(scenes)
```
- LLM을 사용하여 씬들에서 공통 배경 추출
- 배경 일관성 관리

**3. 메타데이터 보강**
```typescript
if (process.env.OPENROUTER_API_KEY) {
  for (let i =不敢 0; i < scenes.length; i++) {
    const enriched = await extractMetadataWithLLM(...)
    scenes[i] = { ...s, ...enriched }
  }
}
```
- 누락된 메타데이터(shotDescription, shotType, dialogue, sound)를 LLM으로 보강

**4. 프레임 생성**
```typescript
const provisionalFrames: FrameRecord[] = []
for (let i = 0; i < scenes.length; i++) {
  const s = scenes[i]
  // 배경 상속 결정
  const backgroundMetadata = await backgroundManager.decideBackgroundInheritance(...)
  
  provisionalFrames.push({
    id: crypto.randomUUID(),
    storyboardId,
    sceneOrder: initialSceneOrder,
    order: i,
    baseDescription: s.shotDescription,
    shotType: s.shotType,
    dialogue: s.dialogue,
    sound: s.sound,
    status: 'pending',
    characterMetadata: sceneMetadataEntry?.metadata || [],
    backgroundId: backgroundMetadata?.id || null,
    backgroundDescription: finalBackgroundDescription || null,
    backgroundMetadata,
  })
}
```

**5. 씬 순서 정렬 및 재번호 매기기**
```typescript
provisionalFrames.sort((a, b) => (a.sceneOrder ?? 0) - (b.sceneOrder ?? 0))
for (let i = 0; i < provisionalFrames.length; i++) {
  provisionalFrames[i].sceneOrder = i
}
```

**6. 이미지 프롬프트 생성**
```typescript
for (let i = 0; i < frames.length; i++) {
  const frame = frames[i]
  const basicPrompt = buildImagePrompt(frame, record)
  
  // LLM으로 프롬프트 향상
  if (process.env.OPENROUTER_API_KEY) {
    const enhancedPrompt = await enhanceWithLLM(basicPrompt, params.style)
    frame.imagePrompt = enhancedPrompt
  } else {
    frame.imagePrompt = basicPrompt
  }
}
```

**7. 이미지 프롬프트 구성 (`buildImagePrompt`)**

프롬프트는 다음 요소들을 결합하여 생성됩니다:
- 기본 설명 (`baseDescription`)
- 배경 설명 (`backgroundDescription`)
- 캐릭터 참조 (드래그된 캐릭터 또는 스크립트에서 언급된 캐릭터)
- 샷 타입
- 스타일 및 종횡비

```typescript
function buildImagePrompt(frame: FrameRecord, sb: StoryboardRecord) {
  const parts = [baseDescription]
  
  // 배경 추가
  if (frame.backgroundDescription) {
    parts.push(`background: ${frame.backgroundDescription}`)
  }
  
  // 캐릭터 추가
  if (characterRefs.length > 0) {
    parts.push(`featuring: ${characterRefs.join(', ')}`)
  }
  
  // 샷 타입 및 스타일 추가
  if (frame.shotType) parts.push(frame.shotType)
  parts.push(sb.style, `aspect ${sb.aspectRatio}`)
  
  return parts.join(', ')
}
```

**8. 비동기 이미지 생성 시작**
```typescript
if (params.processMode === 'async') {
  processFramesAsync(storyboardId, record)
}
```

---

### 5. 비동기 이미지 생성

**파일:** `src/lib/storyboardEngine.ts` - `processFramesAsync` 함수

#### 5.1 처리 순서

각 프레임을 순차적으로 처리:

1. **프레임 상태 업데이트**: `status: 'generating'`

2. **이미지 생성**
   ```typescript
   const result = await generateImageWithModel(
     frame.imagePrompt,
     record.aiModel || DEFAULT_MODEL,
     {
       aspectRatio: record.aspectRatio,
       style: record.style,
       imageUrls: frame.characterImageUrls, // 캐릭터 참조 이미지
       enhancePrompt: true,
     }
   )
   ```

3. **R2 업로드**
   ```typescript
   const uploaded = await uploadImageToR2(storyboardId, frame.id, result.imageUrl)
   ```

4. **데이터베이스 업데이트**
   ```typescript
   await updateCardRecord(record.projectId, i, {
     image_url: frame.imageUrl,
     image_urls: [frame.imageUrl],
     selected_image_url: 0,
     image_key: key,
     image_size: size,
     image_type: 'generated',
     storyboard_status: 'ready',
   })
   ```

5. **프레임 상태 업데이트**: `status: 'ready'` 또는 `status: 'error'`

#### 5.2 상태 관리

- **스토리보드 상태:**
  - `pending`: 초기 상태
  - `processing`: 이미지 생성 진행 중
  - `ready`: 모든 프레임 이미지 생성 완료
  - `partial`: 일부 프레임 실패
  - `error`: 전체 실패

- **프레임 상태:**
  - `pending`: 초기 상태
  - `enhancing`: 메타데이터 보강 중
  - `prompted`: 프롬프트 생성 완료
  - `generating`: 이미지 생성 중
  - `ready`: 완료
  - `error`: 실패

---

## 주요 컴포넌트 및 함수

### 스크립트 파싱
- **파일:** `src/lib/scriptParser.ts`
- `parseScript()`: 마크다운 스크립트를 ParsedScene 배열로 변환
- `extractTitle()`: 스크립트에서 제목 추출
- `stripTitle()`: 스크립트에서 제목 제거

### 배경 관리
- **파일:** `src/lib/backgroundExtractor.ts` / `src/lib/backgroundManager.ts`
- `extractBackgrounds()`: LLM을 사용하여 배경 후보 추출
- `backgroundManager.decideBackgroundInheritance()`: 배경 상속 결정

### 이미지 생성
- **파일:** `src/lib/fal-ai/index.ts`
- `generateImageWithModel()`: AI 모델로 이미지 생성
- 캐릭터 참조 이미지 지원

### 이미지 저장
- **파일:** `src/lib/r2.ts`
- `uploadImageToR2()`: 생성된 이미지를 Cloudflare R2에 업로드

---

## 데이터 흐름

```
사용자 입력 (스크립트)
    ↓
parseScript() → ParsedScene[]
    ↓
extractBackgrounds() → BackgroundCandidate[]
    ↓
extractMetadataWithLLM() → 보강된 메타데이터
    ↓
FrameRecord 생성
    ↓
buildImagePrompt() → 이미지 프롬프트
    ↓
enhanceWithLLM() → 향상된 프롬프트
    ↓
generateImageWithModel() → 이미지 URL
    ↓
uploadImageToR2() → R2 URL
    ↓
updateCardRecord() → 데이터베이스 저장
```

---

## 에러 처리

1. **스크립트 생성 실패**
   - 기본값 반환 또는 사용자 입력 스크립트 사용

2. **메타데이터 보강 실패**
   - 원본 파싱된 씬 유지 (graceful fallback)

3. **이미지 생성 실패**
   - 프레임 상태를 `error`로 설정
   - 다음 프레임 계속 처리

4. **R2 업로드 실패**
   - 원본 이미지 URL 유지
   - 데이터베이스에는 원본 URL 저장

5. **데이터베이스 업데이트 실패**
   - 로그 기록 후 계속 진행

---

## 환경 변수

- `OPENROUTER_API_KEY`: 스크립트 생성 및 프롬프트 향상에 사용
- R2 관련 변수: 이미지 저장에 필요

---

## 참고사항

1. **모드 차이**
   - `async`: 즉시 응답, 백그라운드에서 이미지 생성
   - `sync`: 모든 이미지 생성 완료 후 응답 (현재는 사용 안 함)

2. **캐릭터 처리**
   - 드래그된 캐릭터 메타데이터가 우선순위
   - 없으면 스크립트에서 자동 감지

3. **배경 일관성**
   - 배경 상속 로직을 통해 연속된 씬의 배경 일관성 유지

4. **이미지 프롬프트 향상**
   - LLM 사용 가능 시 자동으로 프롬프트 최적화
   - 구조화된 프롬프트 형식 적용

