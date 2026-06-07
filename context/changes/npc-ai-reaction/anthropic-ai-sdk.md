# Anthropic SDK (TypeScript) — S-04 Reference

> Source: Context7 `/anthropics/anthropic-sdk-typescript` (Reputation: High, Snippets: 289)
> Fetched: 2026-06-07 | Relevant to: S-04 npc-ai-reaction

---

## Installation

```bash
npm install @anthropic-ai/sdk
```

---

## Core streaming pattern

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const stream = client.messages.stream({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'scenario text here' }],
});

for await (const event of stream) {
  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
    process.stdout.write(event.delta.text); // each incremental text chunk
  }
}
```

Method: `client.messages.stream(body, options?)` → returns `MessageStream`

---

## SSE event sequence

The API emits events in this order for a basic text response:

```
event: message_start
data: {"type":"message_start","message":{"id":"...","type":"message","role":"assistant","content":[],"model":"claude-sonnet-4-6",...}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

event: ping
data: {"type": "ping"}

event: content_block_delta        ← repeated N times, one per text chunk
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":6}}

event: message_stop
```

**Only `content_block_delta` with `delta.type === "text_delta"` carries actual text.**

---

## Cloudflare Workers compatibility

- The SDK uses the **Web Fetch API** on all platforms (no Node.js-specific adapters).
- `stream.body` is a **Web `ReadableStream`** — native to Cloudflare Workers, no conversion needed.
- To forward the stream as an SSE HTTP response from an Astro API route:

```typescript
// src/pages/api/npcs/[id]/reaction.ts
export const prerender = false;

import { ANTHROPIC_API_KEY } from "astro:env/server";

export const POST: APIRoute = async ({ request, locals }) => {
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: '<NPC system prompt built from traits + relationships>',
    messages: [{ role: 'user', content: '<scenario from request body>' }],
  });

  const readable = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`));
        }
      }
      controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
};
```

---

## React client — reading the stream

```typescript
const response = await fetch(`/api/npc/${npcId}/reaction`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ scenario }),
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  for (const line of chunk.split('\n')) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') break;
      const { text } = JSON.parse(data);
      setReactionText(prev => prev + text); // append to state
    }
  }
}
```

---

## Environment / secrets

| Context         | Variable name       | How to set                                    |
|-----------------|---------------------|-----------------------------------------------|
| Local dev       | `ANTHROPIC_API_KEY` | `.dev.vars` (Cloudflare local secrets file)   |
| Cloudflare prod | `ANTHROPIC_API_KEY` | `npx wrangler secret put ANTHROPIC_API_KEY`   |
| GitHub CI       | `ANTHROPIC_API_KEY` | Repository secret (if build needs it)         |
| astro.config.mjs | `ANTHROPIC_API_KEY` | `envField.string({ context: "server", access: "secret" })` |

Access in Astro API route: `import { ANTHROPIC_API_KEY } from "astro:env/server"` — this project uses declarative `astro:env/server` imports, NOT `locals.runtime.env`. Never reference in client-side code.

---

## Model reference

| Model ID              | Notes                                      |
|-----------------------|--------------------------------------------|
| `claude-sonnet-4-6`   | Default recommended for S-04               |
| `claude-opus-4-8`     | More capable, higher cost + latency        |
| `claude-haiku-4-5-20251001` | Fastest, lowest cost, lighter quality |
