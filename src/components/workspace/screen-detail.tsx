import type { Screen } from "@/lib/spec/schema";

export function ScreenDetail({
  screen,
  editing,
  onChange,
}: {
  screen: Screen;
  editing: boolean;
  onChange: (screen: Screen) => void;
}) {
  const rows = [
    ["진입 조건", screen.entryConditions],
    ["주요 행동", screen.primaryActions],
    ["필요한 데이터", screen.requiredData],
    ["CTA", [screen.cta]],
    ["QA 기준", screen.qaCriteria],
  ] as const;

  return (
    <div className="detail-table">
      {rows.map(([label, values]) => (
        <div className="detail-row" key={label}>
          <div className="detail-label">{label}</div>
          <div className="detail-value">
            {editing ? (
              <textarea
                className="field"
                aria-label={label}
                value={values.join("\n")}
                onChange={(event) => {
                  const next = event.target.value.split("\n").filter(Boolean);
                  if (label === "CTA") onChange({ ...screen, cta: next[0] ?? "" });
                  else if (label === "진입 조건")
                    onChange({ ...screen, entryConditions: next });
                  else if (label === "주요 행동")
                    onChange({ ...screen, primaryActions: next });
                  else if (label === "필요한 데이터")
                    onChange({ ...screen, requiredData: next });
                  else onChange({ ...screen, qaCriteria: next });
                }}
              />
            ) : (
              <ul>
                {values.map((value, i) => <li key={i}>{value}</li>)}
              </ul>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
