import type { SpecDocument } from "@/lib/spec/schema";

export function DocumentView({ document }: { document: SpecDocument }) {
  return (
    <div className="document-view">
      <article>
        <h1>{document.brief.title}</h1>
        <p>{document.brief.purpose}</p>
        <h2>해결할 문제</h2>
        <p>{document.brief.problem}</p>
        <h2>성공 조건</h2>
        <ul>
          {document.brief.successCriteria.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <h2>확인 질문</h2>
        {document.questions.map((item) => (
          <div className="question-callout" key={item.id}>
            <strong>{item.question}</strong>
            <p>{item.context}</p>
          </div>
        ))}
        <h2>요구사항</h2>
        <ul>
          {document.requirements.map((item) => (
            <li key={item.id}>
              {item.content} <span className={`tag tag-${item.evidence.type === "original" ? "original" : "inference"}`}>
                {item.evidence.type === "original" ? "원문" : "추론"}
              </span>
            </li>
          ))}
        </ul>
      </article>
    </div>
  );
}
