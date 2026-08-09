// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ConfirmOverwriteDialog } from "@/components/npcs/ConfirmOverwriteDialog";

afterEach(() => {
  cleanup();
});

describe("ConfirmOverwriteDialog", () => {
  it("renders nothing when closed", () => {
    render(<ConfirmOverwriteDialog open={false} newTypeName="Wampiry" onConfirm={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.queryByText(/Replace stats with Wampiry/)).toBeNull();
  });

  it("names the incoming type when open", () => {
    render(<ConfirmOverwriteDialog open={true} newTypeName="Wampiry" onConfirm={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByText(/Replace stats with Wampiry/)).toBeTruthy();
  });

  it("calls onCancel when Cancel is clicked", () => {
    const onCancel = vi.fn();
    render(<ConfirmOverwriteDialog open={true} newTypeName="Wampiry" onConfirm={vi.fn()} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalled();
  });

  it("calls onConfirm when the replace button is clicked", () => {
    const onConfirm = vi.fn();
    render(<ConfirmOverwriteDialog open={true} newTypeName="Wampiry" onConfirm={onConfirm} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /Replace with Wampiry/ }));

    expect(onConfirm).toHaveBeenCalled();
  });
});
