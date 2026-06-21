# SpecFlow OS

정리되지 않은 회의록·업무 요청·기획 메모를 프로젝트 브리프, 확인 질문, 화면 흐름, 역할·권한, 상태·예외, UX 문구, 작업 목록과 일일보고로 컴파일하는 개인용 DesignOps 웹 앱입니다.

## MVP 기능

- 사용자명·비밀번호 로그인과 공개 회원가입 차단
- Supabase Auth, PostgreSQL, 사용자 소유권 기반 RLS
- 직접 입력 및 UTF-8 TXT/MD 파일 입력
- OpenAI Responses API와 Structured Outputs 기반 `SpecDocument` 생성
- 원문·추론·가정 및 검토 상태 분리
- Flow Desk 화면 흐름, 문서, 매트릭스 보기
- 화면 상세 편집과 revision 기반 충돌 방지
- Markdown 및 JSON 내보내기
- 관리자용 계정 생성·비밀번호 재설정 명령

## 로컬 실행

Node.js 20 이상과 pnpm 10을 사용합니다.

```powershell
corepack enable
pnpm install
Copy-Item .env.example .env.local
pnpm dev
```

Supabase 환경변수가 없는 비프로덕션 환경에서는 UI 확인을 위한 데모 계정을 사용할 수 있습니다.

```text
아이디: designer
비밀번호: specflow
```

프로덕션 빌드에서는 데모 로그인이 비활성화되며 Supabase 환경변수가 필수입니다.

## 환경변수

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4
```

`SUPABASE_SERVICE_ROLE_KEY`와 `OPENAI_API_KEY`는 브라우저에 노출하면 안 됩니다.

## Supabase 설정

1. 새 Supabase 프로젝트를 만듭니다.
2. SQL Editor에서 [`supabase/migrations/202606210001_initial.sql`](supabase/migrations/202606210001_initial.sql)을 실행합니다.
3. Authentication의 Email provider를 활성화합니다.
4. `.env.local`에 Project URL, anon key, service role key를 넣습니다.
5. 초기 관리자 계정을 생성합니다.

```powershell
pnpm admin:create-user --username designer
```

비밀번호는 명령행이나 로그에 남지 않도록 숨김 입력으로 받습니다. 비밀번호를 잊은 경우:

```powershell
pnpm admin:reset-password --username designer
```

## OpenAI 설정

OpenAI API 키를 `OPENAI_API_KEY`에 설정합니다. 기본 모델은 `gpt-5.4`이며 `OPENAI_MODEL`로 변경할 수 있습니다. API 키가 없는 개발 환경은 고정 데모 문서를 사용하지만 프로덕션에서는 오류를 반환합니다.

## 검증 명령

```powershell
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

## Vercel 배포

1. 이 저장소를 Vercel에 Import합니다.
2. Preview와 Production에 환경변수를 각각 등록합니다.
3. Production에는 반드시 Supabase와 OpenAI 키를 모두 등록합니다.
4. 첫 배포 후 로그인, 프로젝트 생성, 컴파일, 편집, Markdown/JSON 내보내기를 확인합니다.

## 다음 구현 후보

1. 컴파일 품질 평가셋과 프롬프트 버전 비교
2. 요구사항 변경 영향도와 문서 버전 비교
3. PDF 입력 및 페이지별 출처 연결
4. Notion 내보내기
5. Figma 디자인 시스템 컴포넌트 매핑
