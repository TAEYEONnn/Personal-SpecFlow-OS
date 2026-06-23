import type { Evidence, SpecDocument } from "@/lib/spec/schema";

const original = (
  excerpt: string,
  reviewStatus: Evidence["reviewStatus"] = "confirmed",
): Evidence => ({
  type: "original",
  reviewStatus,
  sourceId: "source-1",
  sourceExcerpt: excerpt,
  rationale: null,
});

const inference = (excerpt: string, rationale: string): Evidence => ({
  type: "inference",
  reviewStatus: "needs-review",
  sourceId: "source-1",
  sourceExcerpt: excerpt,
  rationale,
});

export const demoSpecDocument: SpecDocument = {
  brief: {
    title: "리디자인 프로젝트 (MVP)",
    purpose: "정리되지 않은 업무 요청을 실행 가능한 디자인 명세로 변환합니다.",
    problem:
      "요청 해석부터 화면·상태 정의, 문서화까지 반복되는 정리 업무가 디자인 시간을 잠식합니다.",
    successCriteria: [
      "디자인 착수 전 정리 시간을 60% 줄입니다.",
      "상태와 예외 누락을 50% 줄입니다.",
      "원문과 AI 추론을 명확히 분리합니다.",
    ],
    audience: ["개인 프로덕트 디자이너", "소규모 제품 팀"],
    scope: ["텍스트 입력", "AI 컴파일", "결과 검토", "Markdown/JSON 내보내기"],
    outOfScope: ["Figma 자동 생성", "팀 협업", "PDF/OCR"],
    constraints: ["개인 계정", "웹 우선", "한국어 기본"],
    userEditedFields: [],
  },
  requirements: [
    {
      id: "req-login",
      content: "사용자는 아이디와 비밀번호로 로그인한다.",
      category: "인증",
      evidence: original("사용자는 아이디와 비밀번호로 로그인한다."),
      affectedScreenIds: ["screen-login"],
    },
    {
      id: "req-security",
      content: "연속 로그인 실패 시 시도 횟수를 제한한다.",
      category: "보안",
      evidence: inference(
        "아이디와 비밀번호로 로그인한다.",
        "계정 보안을 위해 일반적으로 필요한 정책입니다.",
      ),
      affectedScreenIds: ["screen-login"],
    },
  ],
  questions: [
    {
      id: "question-auth-method",
      question: "인증 방식이 username+password 단일인지, 소셜 로그인도 지원해야 하는지 확인이 필요합니다.",
      priority: "blocking",
      context: "인증 방식에 따라 화면 구조와 Supabase 설정이 달라집니다.",
      evidence: inference(
        "로그인하고 개인 작업공간에 로그인하세요.",
        "현재 명세에는 username+password만 언급되어 있으나, 소셜 로그인 지원 여부가 명시되지 않았습니다.",
      ),
      resolved: true,
      answer: null,
      answeredAt: null,
      answeredBy: null,
    },
    {
      id: "question-session",
      question: "세션 만료 후 작성 중인 내용은 어떻게 복구할까요?",
      priority: "should-decide",
      context: "장시간 편집 중 세션이 만료될 수 있습니다.",
      evidence: inference(
        "검토·수정 가능한 웹 앱",
        "편집 손실을 막으려면 세션 만료 정책이 필요합니다.",
      ),
      resolved: false,
      answer: null,
      answeredAt: null,
      answeredBy: null,
    },
  ],
  roles: [
    {
      id: "role-designer",
      name: "디자이너",
      description: "프로젝트를 생성하고 AI 결과를 검토하는 개인 사용자",
      evidence: original("개인 디자이너가 업무 텍스트를 AI로 컴파일한다."),
    },
  ],
  permissions: [
    {
      id: "permission-project",
      roleId: "role-designer",
      capability: "본인 프로젝트 조회·수정",
      allowed: true,
      note: "다른 사용자의 프로젝트에는 접근할 수 없습니다.",
      evidence: inference(
        "개인용 앱",
        "사용자 소유권 기반 데이터 격리가 필요합니다.",
      ),
    },
  ],
  screens: [
    {
      id: "screen-login",
      name: "01. 로그인",
      description: "아이디와 비밀번호로 인증합니다.",
      entryConditions: ["사용자가 로그아웃 상태입니다.", "유효한 세션이 없습니다."],
      primaryActions: [
        "아이디와 비밀번호를 입력합니다.",
        "로그인 버튼을 눌러 인증을 요청합니다.",
      ],
      requiredData: ["사용자명(username)", "비밀번호(password)", "인증 응답"],
      nextScreenIds: ["screen-home"],
      cta: "로그인",
      qaCriteria: [
        "유효한 계정으로 로그인에 성공합니다.",
        "잘못된 정보에는 일반화된 오류 메시지를 표시합니다.",
        "연속 실패 시 로그인을 일시 제한합니다.",
      ],
      evidence: original("사용자는 아이디와 비밀번호로 로그인한다."),
      position: { x: 130, y: 210 },
    },
    {
      id: "screen-home",
      name: "02. 홈",
      description: "최근 프로젝트와 새 프로젝트 진입점을 보여줍니다.",
      entryConditions: ["사용자가 로그인했습니다."],
      primaryActions: ["최근 프로젝트를 선택합니다.", "새 프로젝트를 생성합니다."],
      requiredData: ["프로젝트 목록", "최근 컴파일 상태"],
      nextScreenIds: ["screen-projects"],
      cta: "새 프로젝트",
      qaCriteria: ["본인 프로젝트만 노출됩니다."],
      evidence: inference(
        "로그인 후 대시보드로 이동한다.",
        "프로젝트 진입을 위한 기본 허브가 필요합니다.",
      ),
      position: { x: 560, y: 250 },
    },
    {
      id: "screen-projects",
      name: "03. 프로젝트 목록",
      description: "프로젝트를 탐색하고 컴파일 상태를 확인합니다.",
      entryConditions: ["사용자가 홈에서 프로젝트를 선택합니다."],
      primaryActions: ["프로젝트를 엽니다."],
      requiredData: ["프로젝트명", "수정일", "컴파일 상태"],
      nextScreenIds: [],
      cta: "프로젝트 열기",
      qaCriteria: ["최근 수정 순으로 정렬됩니다."],
      evidence: inference(
        "프로젝트 저장",
        "저장된 프로젝트를 다시 여는 화면이 필요합니다.",
      ),
      position: { x: 820, y: 250 },
    },
  ],
  states: [
    {
      id: "state-login-default",
      screenId: "screen-login",
      name: "기본",
      kind: "default",
      description: "로그인 정보를 입력할 수 있는 정상 화면",
      evidence: original("아이디와 비밀번호 로그인"),
    },
    {
      id: "state-login-loading",
      screenId: "screen-login",
      name: "로딩",
      kind: "loading",
      description: "인증 요청을 처리 중인 상태",
      evidence: inference("로그인", "비동기 인증 요청 상태가 필요합니다."),
    },
    {
      id: "state-login-empty",
      screenId: "screen-login",
      name: "빈 상태",
      kind: "empty",
      description: "필수 입력이 비어 있는 상태",
      evidence: inference("아이디와 비밀번호", "필수값 검증이 필요합니다."),
    },
    {
      id: "state-login-error",
      screenId: "screen-login",
      name: "오류",
      kind: "error",
      description: "인증에 실패한 상태",
      evidence: inference("로그인 실패", "실패 피드백이 필요합니다."),
    },
    {
      id: "state-login-permission",
      screenId: "screen-login",
      name: "권한 제한",
      kind: "permission-denied",
      description: "반복 실패로 로그인이 일시 제한된 상태",
      evidence: inference(
        "로그인 실패 시도 제한",
        "보호를 위해 잠금 상태가 필요합니다.",
      ),
    },
  ],
  uxCopy: [
    {
      id: "copy-login-error",
      screenId: "screen-login",
      context: "로그인 실패",
      text: "아이디 또는 비밀번호를 확인해 주세요.",
      toneRule: "문제를 단정하지 않고 다음 행동을 안내하는 해요체",
      evidence: inference(
        "로그인 실패",
        "사용자 열거를 방지하는 공통 오류 문구입니다.",
      ),
    },
  ],
  tasks: [
    {
      id: "task-auth",
      title: "아이디·비밀번호 인증 흐름 구현",
      status: "in-progress",
      priority: "high",
      relatedIds: ["screen-login", "req-login"],
      evidence: original("로그인: 사용자명 + 비밀번호"),
      source: "ai",
      description: "",
      dueDate: null,
      blockerReason: null,
      relatedScreenIds: [],
      relatedRequirementIds: [],
    },
  ],
  dailyReport: {
    date: "2026-06-21",
    summary: "인증 흐름과 화면 상태를 구조화했습니다.",
    completed: ["로그인 요구사항 정리", "기본 상태·예외 정의"],
    next: ["프로젝트 생성 흐름 정의", "컴파일 결과 검토 기준 작성"],
    blockers: ["세션 만료 시 편집 복구 정책 확인 필요"],
  },
  suppressedTaskKeys: [],
  figmaMapping: {
    fileUrl: "",
    fileKey: null,
    libraryName: null,
    recommendations: [],
    analyzedAt: null,
    status: "idle",
    error: null,
  },
};
