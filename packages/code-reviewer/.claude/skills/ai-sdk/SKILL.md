# Claude Agent SDK — Reference

Paczka `@10xdevs/code-reviewer` używa `@anthropic-ai/claude-agent-sdk` (v0.3+).
Ten plik opisuje API SDK na poziomie potrzebnym do modyfikowania lub rozszerzania agenta.

---

## Funkcja query()

Jedyna funkcja wejściowa. Zwraca async iterable wiadomości.

```ts
import { query } from "@anthropic-ai/claude-agent-sdk";

const result = query({
  prompt: string,           // wejście użytkownika / treść zadania
  options?: Options,        // konfiguracja agenta (patrz niżej)
});

for await (const message of result) {
  // obsługa wiadomości
}
```

---

## Kluczowe opcje (Options)

```ts
options: {
  // Prompt systemowy — string lub preset claude_code
  systemPrompt: string | { type: "preset"; preset: "claude_code" },

  // Model — dowolny model Anthropic
  model: "claude-sonnet-4-6" | "claude-haiku-4-5-20251001" | "claude-opus-4-8",

  // Narzędzia — pusta lista = tylko reasoning, bez wywołań narzędzi
  tools: [],

  // Maksymalna liczba tur pętli narzędziowej
  maxTurns: 2,

  // Structured output — wymagana konwersja schematu Zod do JSON Schema draft-07
  outputFormat: {
    type: "json_schema",
    schema: z.toJSONSchema(REVIEW_SCHEMA, { target: "draft-07" }),
  },

  // Twardy limit kosztu — agent zatrzymuje się po przekroczeniu
  maxBudgetUsd: 0.10,

  // Wznowienie sesji — przekaż session_id z poprzedniego przebiegu
  resume: sessionId,

  // Dziedziczenie konfiguracji repo (CLAUDE.md, skille)
  settingSources: ["project"],    // lub ["user"], ["local"]
  skills: "all",                  // lub lista nazw: ["skill-name"]
  allowedTools: ["Read", "Grep"], // narzędzia dostępne przy settingSources
}
```

---

## Typy wiadomości z iteratora

### Wynik końcowy (success)

```ts
if (message.type === "result" && message.subtype === "success") {
  message.structured_output   // unknown — przepuść przez REVIEW_SCHEMA.safeParse()
  message.total_cost_usd      // number — całkowity koszt w USD
  message.num_turns           // number — liczba tur pętli
  message.usage               // { input_tokens, output_tokens, cache_read_input_tokens, ... }
  message.modelUsage          // Record<string, { inputTokens, outputTokens, costUSD }> — per model
  message.session_id          // string — id do wznowienia przez options.resume
  message.duration_ms         // number — czas całego przebiegu
}
```

### Wynik końcowy (error)

```ts
if (message.type === "result" && message.subtype !== "success") {
  // subtype: "error_during_execution" | "error_max_turns" | "error_max_budget_usd" | "error_max_structured_output_retries"
  message.errors              // string[] — lista komunikatów błędów
  message.total_cost_usd      // number — koszt do momentu błędu
}
```

### Init (session_id)

```ts
if (message.type === "system" && message.subtype === "init") {
  message.session_id          // string — złap tu, żeby potem wznawiać
}
```

---

## Wzorzec używany w tej paczce

### src/agent/reviewer.ts

```ts
const result = query({
  prompt: `Zrecenzuj ten diff:\n\n${diff}`,
  options: {
    systemPrompt: SYSTEM_PROMPT,
    model: "claude-sonnet-4-6",
    tools: [],
    maxTurns: 2,
    outputFormat: { type: "json_schema", schema: REVIEW_JSON_SCHEMA },
    maxBudgetUsd: 0.10,
  },
});

for await (const message of result) {
  if (message.type !== "result") continue;
  if (message.subtype === "success") {
    const parsed = REVIEW_SCHEMA.safeParse(message.structured_output);
    if (!parsed.success) throw new Error(...);
    return parsed.data;           // Review
  }
  throw new Error(`${message.subtype}: ${message.errors.join("; ")}`);
}
```

### Ważne: structured_output wymaga safeParse

SDK waliduje wynik względem schematu wewnętrznie, ale `structured_output` jest typowane
jako `unknown`. Zawsze przepuszczaj przez `REVIEW_SCHEMA.safeParse()` — inaczej TypeScript
nie zna kształtu danych.

### Ważne: target: "draft-07" w toJSONSchema

Claude Agent SDK wymaga JSON Schema w wersji draft-07. Zod 4 domyślnie generuje draft-2020-12.

```ts
// POPRAWNIE
const REVIEW_JSON_SCHEMA = z.toJSONSchema(REVIEW_SCHEMA, { target: "draft-07" });

// BŁĄD — structured output odrzuci schemat
const REVIEW_JSON_SCHEMA = z.toJSONSchema(REVIEW_SCHEMA);
```

---

## Uwierzytelnienie

| Środowisko       | Jak działa                                                        |
|------------------|-------------------------------------------------------------------|
| Lokalnie         | Podejmuje credentials z aktywnej sesji Claude Code — bez klucza  |
| CI/CD            | Wymaga `ANTHROPIC_API_KEY` w zmiennych środowiskowych            |

Przy pracy na subskrypcji konsumenckiej (Pro/Max bez klucza API) dane mogą
być użyte do treningu. Do środowisk produkcyjnych używaj klucza z konsoli Anthropic.

---

## Kontrola kosztów

```ts
// Twardy limit per przebieg — agent zatrzymuje się z subtype: "error_max_budget_usd"
options: { maxBudgetUsd: 0.10 }

// Odczyt kosztu po przebiegu
message.total_cost_usd        // łączny koszt całego query()
message.modelUsage            // rozbicie per model, jeśli query używał sub-agentów
```

Typowy koszt jednego review (`claude-sonnet-4-6`, 2 tury, diff ~100 linii): **$0.01–$0.04**.

---

## Wznawianie sesji

```ts
// Przebieg 1 — złap session_id
let sessionId: string | undefined;
for await (const msg of query({ prompt: diffPrompt, options })) {
  if (msg.type === "system" && msg.subtype === "init") sessionId = msg.session_id;
  // ... obsługa wyniku
}

// Przebieg 2 — wznów kontekst (agent "pamięta" diff i poprzednią analizę)
query({
  prompt: "Autor naniósł poprawki. Czy adresują Twoje uwagi?",
  options: { ...options, resume: sessionId },
});
```

Na ten moment `reviewer.ts` nie implementuje wznawiania — każdy przebieg jest niezależny.
Wznawianie przydaje się przy review iteracyjnym (poprawki po review).
