# NPC Manager — MVP Web App

Narzędzie dla Mistrzów Gry papierowych RPG do tworzenia NPC-ów i zarządzania powiązaniami między nimi.

## Problem

MG prowadząc kampanię traci czas na śledzenie dziesiątek NPC-ów, ich motywacji i relacji — w głowie lub w rozrzuconych notatkach.

## Główny przepływ użytkownika

1. MG loguje się do aplikacji
2. Tworzy kampanię
3. Dodaje NPC — podaje imię i rolę, AI generuje backstory i motywacje
4. Łączy NPC-ów relacjami (typ + krótki opis)
5. Pyta: "Jak Valdris zareagowałby na wieść o śmierci króla?" — AI odpowiada in-character z kontekstem relacji

## Wymagania certyfikacyjne

| Wymaganie | Realizacja |
|---|---|
| Kontrola dostępu | Symfony SecurityBundle — formularz login/logout, hasło hashowane |
| Zarządzanie danymi | CRUD na kampaniach, NPC-ach i relacjach |
| Logika biznesowa | AI generuje backstory; AI reaguje jako NPC w kontekście jego cech i relacji |
| Artefakty projektowe | PRD, specyfikacje, kontekst dla agenta (moduły 1-3) |
| Test | E2E: stworzenie NPC → dodanie relacji → zapytanie o reakcję |
| CI/CD | GitHub Actions: build + testy |

## Stack

- **Backend:** PHP + Symfony (SecurityBundle, Doctrine ORM, Twig)
- **Frontend:** Twig + HTML; vis.js do grafu relacji
- **AI:** abstrakcja `AiClientInterface` — Ollama lokalnie, Anthropic API na demo/produkcja
- **Baza:** PostgreSQL lub SQLite na start

## Encje

```
Campaign
├── id, name, description
└── belongs to User

NPCWy
├── id, name, role
├── traits (tekst)
├── backstory (generowane przez AI)
├── secrets (opcjonalne)
└── belongs to Campaign

Relationship
├── id, type (sojusznik | wróg | rodzina | rywal | pracodawca | tajemnica)
├── description
└── npc_a_id, npc_b_id (dwukierunkowa)
```

## Integracja AI

Logika w serwisach Symfony, nie w kontrolerach — dzięki temu MCP Server (planowane rozszerzenie) może korzystać z tych samych serwisów bez duplikacji kodu.

### Abstrakcja nad klientem AI

```
AiClientInterface
├── OllamaClient      ← development lokalny, darmowy
└── AnthropicClient   ← demo / certyfikacja
```

Podmiana przez `services.yaml` — jedna linia konfiguracji, zero zmian w serwisach domenowych.

| Faza | Implementacja |
|---|---|
| Development | `OllamaClient` (Llama/Mistral lokalnie) |
| Demo / certyfikacja | `AnthropicClient` (Anthropic API, pay-per-use) |

### Akcje AI

| Akcja | Prompt |
|---|---|
| Generowanie backstory | Rola + cechy NPC → spójny backstory pasujący do klimatu kampanii |
| Reakcja NPC | Profil NPC + lista jego relacji + scenariusz → odpowiedź in-character |

## Estymacja czasu (praca z AI)

| Etap | Szacunek |
|---|---|
| Setup projektu (Symfony skeleton, baza, GitHub repo) | 1-2h |
| Autentykacja (SecurityBundle, User, formularz login) | 2-3h |
| Campaign CRUD (encja, kontroler, widoki Twig) | 2-3h |
| NPC CRUD (encja, kontroler, widoki Twig) | 2-3h |
| Relationship management (encja, formularz, widoki) | 2-3h |
| Graf relacji (integracja vis.js) | 1-2h |
| `AiClientInterface` + `OllamaClient` | 2-3h |
| `AnthropicClient` | 1h |
| Akcje AI (backstory, reakcja NPC) | 2-3h |
| Podstawowy styling / nawigacja | 1-2h |
| Test E2E | 1-2h |
| CI/CD (GitHub Actions) | 1-2h |
| Debugging / integracja | 2-3h |
| **Razem** | **20-30h** |

Przy wieczorach po 2h: **2-3 tygodnie** do działającego MVP.

Największe ryzyko czasowe: prompt engineering dla backstory i reakcji NPC — sam kod integracji jest prosty, ale dopracowanie promptów wymaga kilku iteracji.

## Co nie jest częścią MVP

- MCP Server (planowane rozszerzenie — patrz `npc-manager-mcp-concept.md`)
- Wyszukiwarka NPC-ów
- Eksport notatek
- Współdzielenie kampanii między użytkownikami
