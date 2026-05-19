import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("returns a single class unchanged", () => {
    expect(cn("text-red-500")).toBe("text-red-500");
  });

  it("merges multiple classes", () => {
    expect(cn("px-2", "py-4")).toBe("px-2 py-4");
  });

  it("resolves Tailwind conflicts — last class wins", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("drops falsy values", () => {
    expect(cn("base", false, undefined, null, "extra")).toBe("base extra");
  });

  it("handles conditional classes", () => {
    const isActive = true;
    expect(cn("btn", isActive && "btn-active")).toBe("btn btn-active");
  });

  it("resolves conflicting text colour — last wins", () => {
    expect(cn("text-red-500", "text-blue-600")).toBe("text-blue-600");
  });
});
