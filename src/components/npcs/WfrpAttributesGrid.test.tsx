// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WfrpAttributesGrid } from "@/components/npcs/WfrpAttributesGrid";
import type { WfrpAttributes } from "@/types";

afterEach(() => {
  cleanup();
});

const attributes: WfrpAttributes = {
  sz: 4,
  ww: 30,
  us: 30,
  s: 30,
  wt: 30,
  i: 30,
  zw: 30,
  zr: 30,
  int: 30,
  sw: 30,
  ogd: 30,
  zyw: 12,
};

describe("WfrpAttributesGrid", () => {
  it("shows an inline error and does not call onChange for an out-of-range attribute", () => {
    const onChange = vi.fn();
    render(
      <WfrpAttributesGrid
        attributes={attributes}
        zywOverridden={false}
        onChange={onChange}
        onZywOverrideChange={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("S"), { target: { value: "150" } });

    expect(screen.getByText("Whole number from 0 to 100")).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("calls onChange with the updated attribute for a valid in-range edit", () => {
    const onChange = vi.fn();
    render(
      <WfrpAttributesGrid
        attributes={attributes}
        zywOverridden={false}
        onChange={onChange}
        onZywOverrideChange={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("S"), { target: { value: "45" } });

    expect(onChange).toHaveBeenCalledWith({ ...attributes, s: 45 });
  });

  it("renders Żyw read-only when zywOverridden is false", () => {
    render(
      <WfrpAttributesGrid
        attributes={attributes}
        zywOverridden={false}
        onChange={vi.fn()}
        onZywOverrideChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText<HTMLInputElement>("Żyw").readOnly).toBe(true);
  });

  it("renders Żyw editable when zywOverridden is true", () => {
    render(
      <WfrpAttributesGrid
        attributes={attributes}
        zywOverridden={true}
        onChange={vi.fn()}
        onZywOverrideChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText<HTMLInputElement>("Żyw").readOnly).toBe(false);
  });

  it("unlocking calls onZywOverrideChange(true)", () => {
    const onZywOverrideChange = vi.fn();
    render(
      <WfrpAttributesGrid
        attributes={attributes}
        zywOverridden={false}
        onChange={vi.fn()}
        onZywOverrideChange={onZywOverrideChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /enter żywotność manually/i }));

    expect(onZywOverrideChange).toHaveBeenCalledWith(true);
  });

  it("locking calls onZywOverrideChange(false)", () => {
    const onZywOverrideChange = vi.fn();
    render(
      <WfrpAttributesGrid
        attributes={attributes}
        zywOverridden={true}
        onChange={vi.fn()}
        onZywOverrideChange={onZywOverrideChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /auto-calculate żywotność/i }));

    expect(onZywOverrideChange).toHaveBeenCalledWith(false);
  });
});
