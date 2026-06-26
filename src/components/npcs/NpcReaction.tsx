import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ServerError } from "@/components/auth/ServerError";
import { cn } from "@/lib/utils";

interface NpcReactionProps {
  npcId: string;
}

export function NpcReaction({ npcId }: NpcReactionProps) {
  const [scenario, setScenario] = useState("");
  const [reactionText, setReactionText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setReactionText("");
    setError(null);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/npcs/${npcId}/reaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Request failed");
        return;
      }

      if (!res.body) {
        setError("No response body");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let lineBuffer = "";
      outer: for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        lineBuffer += chunk;
        const lines = lineBuffer.split("\n");
        lineBuffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break outer;
          try {
            const parsed = JSON.parse(raw) as { text?: string; error?: string };
            if (parsed.error) {
              setError(parsed.error);
              break outer;
            }
            if (parsed.text !== undefined) {
              const text = parsed.text;
              setReactionText((prev) => prev + text);
            }
          } catch {
            // malformed frame — skip
          }
        }
      }
      for (const line of lineBuffer.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (raw === "[DONE]") break;
        try {
          const parsed = JSON.parse(raw) as { text?: string; error?: string };
          if (parsed.error) {
            setError(parsed.error);
            break;
          }
          if (parsed.text !== undefined) {
            const text = parsed.text;
            setReactionText((prev) => prev + text);
          }
        } catch {
          // malformed frame — skip
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError("Network error. Please try again.");
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsStreaming(false);
      }
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <textarea
            value={scenario}
            onChange={(e) => {
              setScenario(e.target.value);
            }}
            disabled={isStreaming}
            maxLength={500}
            rows={3}
            placeholder="Describe a scenario for this NPC to react to…"
            className={cn(
              "w-full resize-none rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white",
              "placeholder:text-white/40 focus:border-white/40 focus:outline-none disabled:opacity-50",
            )}
          />
          <p className="mt-1 text-right text-xs text-white/40">{scenario.length}/500</p>
        </div>
        <Button
          type="submit"
          disabled={isStreaming || scenario.trim().length === 0}
          className="rounded-lg bg-amber-700 px-4 py-2 font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
        >
          {isStreaming ? (
            <span className="flex items-center gap-2">
              <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Generating…
            </span>
          ) : (
            "Ask"
          )}
        </Button>
      </form>
      {reactionText && (
        <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm whitespace-pre-wrap text-stone-300/90">
          {reactionText}
        </div>
      )}
      <ServerError message={error} />
    </div>
  );
}
