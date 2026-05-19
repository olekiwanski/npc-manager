# NPC Manager — MCP Server (koncepcja)

Planowane rozszerzenie po dostarczeniu MVP. MCP Server pozwoli MG zarządzać kampanią i NPC-ami bezpośrednio z poziomu Claude Desktop bez otwierania przeglądarki.

## Uruchomienie

Serwer działa lokalnie przez `stdio` — zero deploymentu.

Konfiguracja w `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "npc-manager": {
      "command": "php",
      "args": ["/sciezka/do/projektu/bin/console", "mcp:serve"]
    }
  }
}
```

Symfony command `mcp:serve` obsługuje komunikację przez stdin/stdout (JSON-RPC).

## Resources

Dane dostępne do odczytu przez model:

| Resource URI | Opis |
|---|---|
| `campaign://{id}/npcs` | Lista wszystkich NPC-ów w kampanii |
| `campaign://{id}/npc/{npc_id}` | Pełny profil NPC (cechy, motywacje, sekrety) |
| `campaign://{id}/relationships` | Graf relacji między NPC-ami |

## Tools

Akcje dostępne dla modelu:

| Tool | Parametry | Opis |
|---|---|---|
| `create_npc` | `campaign_id, name, role, traits[]` | Tworzy NPC, opcjonalnie AI generuje backstory |
| `add_relationship` | `npc_a, npc_b, type, description` | Łączy dwóch NPC-ów relacją |
| `query_npc_reaction` | `npc_id, scenario` | Claude dostaje profil NPC + relacje → odpowiedź in-character |
| `find_path` | `npc_a, npc_b` | Łańcuch powiązań między dwoma NPC-ami |

Typy relacji dla `add_relationship`: `sojusznik | wróg | rodzina | rywal | pracodawca | tajemnica`

## Prompts

Szablony gotowe do użycia:

| Prompt | Opis |
|---|---|
| `roleplay_as_npc(npc_id)` | System prompt do wcielenia się w NPC z pełnym kontekstem |

## Architektura

Logika biznesowa siedzi w serwisach Symfony (nie w kontrolerach) — MCP server to tylko kolejna warstwa wejścia obok REST API i UI. Dodanie serwera nie wymaga refaktoringu wnętrzności.

```
Symfony App
├── REST API (kontrolery)
├── Web UI (Twig)
└── MCP Server (bin/console mcp:serve)
        ↓
    Serwisy domenowe (NpcService, RelationshipService, ...)
        ↓
    Doctrine ORM + Claude API
```
