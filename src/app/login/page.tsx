import { LoginForm } from "@/components/auth/login-form";
import { isDevelopmentDemo } from "@/lib/env";

export default function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <span>SpecFlow OS</span>
        </div>
        <div className="login-copy">
          <h1>업무 요청을<br />화면 구조로 정리하세요.</h1>
          <p>
            회의록과 기획 메모를 화면 구조, 상태와 예외, 화면 문구와 작업 목록으로
            정리하고 근거까지 함께 검토해요.
          </p>
        </div>
        <small>Design work compiler for focused product teams.</small>
      </section>
      <section className="login-form-wrap">
        <div className="login-card">
          <h2>반갑습니다</h2>
          <p>개인 작업공간에 로그인하세요.</p>
          <LoginForm />
          {isDevelopmentDemo ? (
            <p className="demo-note">
              개발 데모 계정: <strong>designer</strong> / <strong>specflow</strong>
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
