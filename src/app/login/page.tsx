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
          <h1>업무 요청을<br />문서로 정리하세요.</h1>
          <p>
            회의록과 기획 메모를 화면 플로우와 작업 목록으로
            정리하고 근거까지 함께 검토해요.
          </p>
        </div>
        <small>기획부터 작업 정리까지 한곳에서 이어가요.</small>
      </section>
      <section className="login-form-wrap">
        <div className="login-card">
          <h2>로그인</h2>
          <p>내 작업공간으로 이동해요.</p>
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
