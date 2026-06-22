import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/components/auth/login-form";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

describe("LoginForm", () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("submits username and password", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "아이디 또는 비밀번호를 확인해 주세요." }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    );

    render(<LoginForm />);
    await user.type(screen.getByLabelText("아이디"), "designer");
    await user.type(screen.getByLabelText("비밀번호"), "wrong");
    await user.click(screen.getByRole("button", { name: "로그인" }));

    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ username: "designer", password: "wrong" }),
      }),
    );
    expect(
      await screen.findByText("아이디 또는 비밀번호를 확인해 주세요."),
    ).toBeInTheDocument();
  });

  it("navigates once without refreshing after successful login", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    render(<LoginForm />);
    await user.type(screen.getByLabelText("아이디"), "designer");
    await user.type(screen.getByLabelText("비밀번호"), "specflow");
    await user.click(screen.getByRole("button", { name: "로그인" }));

    expect(push).toHaveBeenCalledOnce();
    expect(push).toHaveBeenCalledWith("/projects");
    expect(refresh).not.toHaveBeenCalled();
  });
});
