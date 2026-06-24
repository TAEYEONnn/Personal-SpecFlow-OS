import { SignupForm } from "@/components/auth/signup-form";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams;

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <span>SpecFlow OS</span>
        </div>
        <div className="login-copy">
          <h1>팀과 함께<br />정리해요.</h1>
          <p>
            회의록이나 메모를 넣으면 AI가 화면 구조, 요구사항, 할 일로 나눠요.
            팀원을 초대해서 같이 관리해요.
          </p>
        </div>
        <small>지금 바로 시작할 수 있어요.</small>
      </section>
      <section className="login-form-wrap">
        <div className="login-card">
          <h2>계정 만들기</h2>
          <p>무료로 시작해요</p>
          <SignupForm next={next} />
        </div>
      </section>
    </main>
  );
}
