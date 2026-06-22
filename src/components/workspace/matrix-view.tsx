import type { SpecDocument } from "@/lib/spec/schema";

export function MatrixView({ document }: { document: SpecDocument }) {
  const unconfirmed = document.permissions.filter((p) => p.allowed === null).length;

  return (
    <div className="matrix-view">
      <h2>역할·권한 매트릭스</h2>
      {unconfirmed > 0 && (
        <p className="matrix-warning" role="status">
          확인이 필요한 권한이 {unconfirmed}개 있어요. 노란 행을 봐주세요.
        </p>
      )}
      <div className="matrix-table-wrap">
        <table className="matrix-table" aria-label="역할·권한 매트릭스">
          <thead>
            <tr>
              <th>역할</th>
              <th>기능</th>
              <th>권한</th>
              <th>비고</th>
            </tr>
          </thead>
          <tbody>
            {document.permissions.map((permission) => (
              <tr key={permission.id} className={permission.allowed === null ? "matrix-row--pending" : ""}>
                <td>{document.roles.find((role) => role.id === permission.roleId)?.name}</td>
                <td>{permission.capability}</td>
                <td>
                  {permission.allowed === null ? (
                    <span className="permission-pending">? 확인 필요</span>
                  ) : permission.allowed ? (
                    "가능"
                  ) : (
                    "불가"
                  )}
                </td>
                <td>{permission.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>상태·예외 매트릭스</h2>
      <div className="matrix-table-wrap">
        <table className="matrix-table" aria-label="상태·예외 매트릭스">
          <thead>
            <tr>
              <th>화면</th>
              <th>상태</th>
              <th>유형</th>
              <th>설명</th>
            </tr>
          </thead>
          <tbody>
            {document.states.map((state) => (
              <tr key={state.id}>
                <td>{document.screens.find((screen) => screen.id === state.screenId)?.name}</td>
                <td>{state.name}</td>
                <td>{state.kind}</td>
                <td>{state.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
