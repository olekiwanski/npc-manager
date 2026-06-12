// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NpcReaction } from "@/components/npcs/NpcReaction";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function makeFragmentedStream(chunks: string[]): ReadableStream<Uint8Array> {
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(new TextEncoder().encode(chunks[i++]));
      } else {
        controller.close();
      }
    },
  });
}

describe("NpcReaction", () => {
  it("accumulates complete text when SSE data line is split across two chunks", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: makeFragmentedStream(['data: {"text":"hel', 'lo world"}\n\ndata: [DONE]\n\n']),
    });

    render(<NpcReaction npcId="npc-1" />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "test scenario" } });
    fireEvent.click(screen.getByRole("button", { name: /ask/i }));

    await screen.findByText("hello world");
    expect(screen.queryByText(/network error|stream interrupted/i)).toBeNull();
  });

  it("accumulates complete text when SSE data line arrives in a single chunk", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: makeFragmentedStream(['data: {"text":"hello world"}\n\ndata: [DONE]\n\n']),
    });

    render(<NpcReaction npcId="npc-1" />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "test scenario" } });
    fireEvent.click(screen.getByRole("button", { name: /ask/i }));

    await screen.findByText("hello world");
    expect(screen.queryByText(/network error|stream interrupted/i)).toBeNull();
  });
});
