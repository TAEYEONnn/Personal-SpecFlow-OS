import { NewProjectForm } from "@/components/projects/new-project-form";

export default function NewProjectPage() {
  return (
    <main className="projects-page">
      <section className="new-project-shell">
        <h1>새 업무 컴파일</h1>
        <p>정리되지 않은 원문 그대로 넣어도 괜찮아요. 근거와 추론을 분리해 정리합니다.</p>
        <NewProjectForm />
      </section>
    </main>
  );
}
