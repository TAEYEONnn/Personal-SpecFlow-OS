# SpecFlow OS

회의록, 업무 요청, 기획 메모를 화면 구조와 실행 가능한 작업 문서로 정리하는 개인용 DesignOps 웹 앱입니다.

원문 근거와 AI의 추론을 구분하고, 요구사항부터 화면 흐름, 상태·예외, 역할·권한, 확인 질문, 작업 목록까지 한곳에서 검토할 수 있습니다.

## 주요 기능

- 사용자명·비밀번호 로그인과 사용자별 프로젝트 격리
- 텍스트 붙여넣기 및 TXT, Markdown, PDF 업로드
- OpenAI Responses API와 Structured Outputs 기반 문서 생성
- 원문 수정 후 재분석 안내와 저장 순서 충돌 방지
- 확인 질문 인라인 편집
- 요구사항 카테고리 정리와 접이식 상세 보기
- 화면 흐름 드래그, 자동 정렬, 전체 맞춤, 정렬 되돌리기
- 화면별 상태·예외와 역할별 권한 정리
- 작업 생성, 상태 변경, 30일 휴지통, 복원, 영구 삭제
- Markdown, JSON, Notion 내보내기
- 문서 버전 비교와 변경 영향 확인
- 키보드 조작, 44px 터치 영역, 모션 감소 설정 지원

## 기술 구성

- Next.js 16
- React 19
- TypeScript
- Supabase Auth와 PostgreSQL
- OpenAI Responses API
- React Flow와 Dagre
- Vitest, Testing Library, Playwright

## 로컬 실행

Node.js 20 이상과 pnpm을 사용합니다.

```bash
corepack enable
pnpm install
cp .env.example .env.local
pnpm dev
```

Windows PowerShell에서는 다음 명령으로 환경변수 파일을 복사할 수 있습니다.

```powershell
Copy-Item .env.example .env.local
```

Supabase 환경변수가 모두 비어 있는 개발 환경에서는 데모 모드가 활성화됩니다.

```text
아이디: designer
비밀번호: specflow
```

데모 로그인은 프로덕션에서 비활성화됩니다. Supabase 환경변수를 일부만 설정하면 안전을 위해 설정 오류를 표시합니다.

## 환경변수

`.env.example`을 복사한 뒤 실제 값은 `.env.local`이나 배포 서비스의 비밀 저장소에 설정합니다.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4
NOTION_CLIENT_ID=
NOTION_CLIENT_SECRET=
```

다음 값은 서버 전용입니다.

- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `NOTION_CLIENT_SECRET`

서버 전용 값에 `NEXT_PUBLIC_` 접두사를 붙이거나 소스 코드에 직접 입력하지 마세요.

## Supabase 설정

1. Supabase 프로젝트를 만듭니다.
2. SQL Editor에서 [`supabase/migrations/202606210001_initial.sql`](supabase/migrations/202606210001_initial.sql)을 실행합니다.
3. Authentication에서 Email provider를 활성화합니다.
4. `.env.local`에 Supabase URL과 키를 설정합니다.
5. 초기 사용자를 생성합니다.

```bash
pnpm admin:create-user --username designer
```

비밀번호 재설정:

```bash
pnpm admin:reset-password --username designer
```

관리 명령은 비밀번호를 숨김 입력으로 받아 명령 기록에 남기지 않습니다.

## OpenAI 설정

실제 AI 분석을 사용하려면 `OPENAI_API_KEY`를 설정합니다. 모델은 `OPENAI_MODEL`로 변경할 수 있습니다.

개발 데모 모드에서는 API 키가 없어도 고정 예제 문서로 주요 화면과 흐름을 확인할 수 있습니다.

## 검증

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

## 배포

Vercel 등 Node.js 호스팅 환경에 배포할 수 있습니다.

1. 저장소를 배포 서비스에 연결합니다.
2. Preview와 Production 환경변수를 각각 등록합니다.
3. Production에는 Supabase 설정을 모두 등록합니다.
4. 실제 AI 분석이 필요하면 OpenAI API 키를 등록합니다.
5. 로그인, 프로젝트 생성, 원문 저장, 재분석, 내보내기를 확인합니다.

## 공개 저장소 보안

- `.env`, `.env.local`, 개인 키, 토큰, 실제 사용자 데이터는 커밋하지 않습니다.
- `.env.example`에는 변수 이름만 작성합니다.
- 공개 전 `git status`와 Git 이력의 비밀키 패턴을 확인합니다.
- 노출된 키는 파일을 지우는 것만으로 해결되지 않습니다. 즉시 폐기하고 새 키를 발급해야 합니다.
- 테스트와 스크린샷에는 실제 이메일, 전화번호, 고객 문서 같은 개인정보를 사용하지 않습니다.

## 라이선스

라이선스를 추가하기 전까지 별도의 사용 허가는 부여되지 않습니다.
