import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/components/auth/login-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe("LoginForm", () => {
  beforeEach(() => {
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
});
