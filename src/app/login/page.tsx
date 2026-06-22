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
          <h1>회의록이나 메모,<br />그대로 넣으면 돼요.</h1>
          <p>
            AI가 화면 구조, 요구사항, 할 일로 나눠서 정리해요.
            근거도 같이 잡아줘요.
          </p>
        </div>
        <small>기획부터 작업 정리까지 한곳에서 이어가요.</small>
      </section>
      <section className="login-form-wrap">
        <div className="login-card">
          <h2>로그인</h2>
          <p>작업공간 바로 가기</p>
          <LoginForm isDemo={isDevelopmentDemo} />
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
