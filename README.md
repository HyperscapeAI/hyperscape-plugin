# @hyperscape/plugin-hyperscape

ElizaOS plugin for Hyperscape - Connects AI agents to 3D multiplayer RPG worlds as real players.

## Overview

This plugin enables ElizaOS AI agents to play Hyperscape as real players with full access to game mechanics:

- **Real-time state awareness** via providers (health, inventory, nearby entities, skills, equipment)
- **Full action repertoire**: movement, combat, gathering, inventory management, social interactions
- **Event-driven memory storage** for learning from gameplay experiences
- **Automatic reconnection** and robust error handling

---

## Quick Start

### 1. Install

```bash
bun install @hyperscape/plugin-hyperscape
```

### 2. Set Environment Variables

```bash
# .env file
HYPERSCAPE_SERVER_URL=ws://localhost:5555/ws
```

### 3. Add to Character

```json
{
  "name": "GameBot",
  "plugins": ["@hyperscape/plugin-hyperscape"]
}
```

### 4. Run

```bash
elizaos start
```

The agent will automatically connect to the Hyperscape server and begin playing.

On startup, you'll see a banner showing configuration status:

```
╔══════════════════════════════════════════════════════════════════════╗
║ Character: GameBot                                                    ║
╠══════════════════════════════════════════════════════════════════════╣
║     ██╗  ██╗██╗   ██╗██████╗ ███████╗██████╗                          ║
║     ██║  ██║╚██╗ ██╔╝██╔══██╗██╔════╝██╔══██╗                         ║
║     ███████║ ╚████╔╝ ██████╔╝█████╗  ██████╔╝                         ║
║     ██╔══██║  ╚██╔╝  ██╔═══╝ ██╔══╝  ██╔══██╗                         ║
║     ██║  ██║   ██║   ██║     ███████╗██║  ██║                         ║
║              ███████╗ ██████╗ █████╗ ██████╗ ███████╗                 ║
║              ███████╗██╔════╝██╔══██╗██╔══██╗██╔════╝                 ║
║              ╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝     ╚══════╝                 ║
╠══════════════════════════════════════════════════════════════════════╣
║ ✓ HYPERSCAPE_SERVER_URL        ws://localhost:5555/ws  custom        ║
║ ● HYPERSCAPE_AUTO_RECONNECT    true                    default       ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HYPERSCAPE_SERVER_URL` | `ws://localhost:5555/ws` | WebSocket URL of Hyperscape server |
| `HYPERSCAPE_AUTO_RECONNECT` | `true` | Auto-reconnect on disconnect |

### Character Settings

You can also set these in your character file:

```json
{
  "name": "WoodcutterBot",
  "plugins": ["@hyperscape/plugin-hyperscape"],
  "settings": {
    "HYPERSCAPE_SERVER_URL": "ws://game.example.com/ws",
    "HYPERSCAPE_AUTO_RECONNECT": "true"
  }
}
```

---

## Optional Enhancements

Hyperscape works standalone as a basic game bot. Add these optional plugins for enhanced capabilities:

```json
{
  "plugins": [
    "@elizaos/plugin-homeostasis",
    "@elizaos/plugin-goals",
    "@elizaos/plugin-presence",
    "@elizaos/plugin-skills",
    "@hyperscape/plugin-hyperscape"
  ]
}
```

| Plugin | What It Adds |
|--------|--------------|
| `plugin-homeostasis` | Game events affect psychological state (low health → anxiety) |
| `plugin-goals` | Game-specific goal templates and progress tracking |
| `plugin-presence` | Cross-domain presence (see game players in Discord context) |
| `plugin-skills` | Namespaced skill inventory (`hyperscape:fishing:75`) |
| `plugin-rolodex` | Link game identities to Discord/Twitter accounts |

No configuration needed — enhancements activate automatically when plugins are present.

---

## Available Actions

| Category | Actions |
|----------|---------|
| **Movement** | `MOVE_TO`, `FOLLOW_ENTITY`, `STOP_MOVEMENT` |
| **Combat** | `ATTACK_ENTITY`, `CHANGE_COMBAT_STYLE` |
| **Skills** | `CHOP_TREE`, `CATCH_FISH`, `LIGHT_FIRE`, `COOK_FOOD` |
| **Inventory** | `EQUIP_ITEM`, `USE_ITEM`, `DROP_ITEM` |
| **Social** | `CHAT_MESSAGE`, `FIND_PLAYER` |
| **Banking** | `BANK_DEPOSIT`, `BANK_WITHDRAW` |
| **Goals** | `SET_GOAL`, `NAVIGATE_TO` |
| **Autonomous** | `EXPLORE`, `FLEE`, `IDLE`, `APPROACH_ENTITY` |

---

## How It Works

Once running, the agent operates in a continuous loop:

1. **Receives context** from providers (health, inventory, nearby entities, etc.)
2. **LLM decides** which action to take based on context
3. **Executes action** via WebSocket command to game server
4. **Stores memories** of significant events (combat, skills, social)
5. **Learns** from past experiences via semantic memory search

### Example Flow

```
Agent receives context:
  "You have 75/100 HP at position [10, 5, 20]"
  "Nearby: Oak Tree at [12, 5, 18]"
  "Inventory: Bronze Axe, 15 free slots"

Agent decides: CHOP_TREE → Oak Tree

Event occurs: RESOURCE_GATHERED
  → Stored as memory: "Gathered Oak Logs, gained 25 woodcutting XP"

Later: "Where did I last chop trees?"
  → Semantic search returns location [12, 5, 18]
```

---

# Developer Documentation

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    HyperscapeService                        │
│  WebSocket connection, game state cache, command execution  │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│   Providers   │     │    Actions    │     │  Evaluators   │
│ (LLM context) │     │ (game cmds)   │     │ (assessments) │
└───────────────┘     └───────────────┘     └───────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
                    ┌───────────────┐
                    │ Event Handlers│
                    │ (→ memories)  │
                    └───────────────┘
```

### Components

| Component | Purpose |
|-----------|---------|
| **HyperscapeService** | Manages WebSocket connection, caches game state, executes commands |
| **Providers** | Supply game context to LLM (health, inventory, nearby entities, etc.) |
| **Actions** | Execute game commands (move, attack, gather, etc.) |
| **Evaluators** | Assess game state for autonomous decisions (survival, combat, exploration) |
| **Event Handlers** | Convert game events to memories for learning |

### Providers (8)

| Provider | Context Supplied |
|----------|-----------------|
| `gameStateProvider` | Health, stamina, position, combat status |
| `inventoryProvider` | Items, coins, free slots |
| `nearbyEntitiesProvider` | Players, NPCs, resources within range |
| `skillsProvider` | Skill levels and XP progression |
| `equipmentProvider` | Currently equipped items |
| `availableActionsProvider` | Context-aware available actions |
| `hyperscapeInstructionsProvider` | Plugin usage instructions, available actions |
| `hyperscapeSettingsProvider` | Current config, connection status (non-sensitive) |

### Evaluators (3)

| Evaluator | Assessment |
|-----------|------------|
| `survivalEvaluator` | Health, threats, survival urgency |
| `explorationEvaluator` | Discovery opportunities |
| `combatEvaluator` | Combat threats and opportunities |

---

## Plugin Structure

```
src/
├── index.ts                    # Plugin export and configuration
├── types.ts                    # TypeScript type definitions
├── banner.ts                   # ANSI startup banner
├── services/
│   └── HyperscapeService.ts    # WebSocket connection, state management
├── providers/
│   ├── gameState.ts            # Health, stamina, position
│   ├── inventory.ts            # Items, coins
│   ├── nearbyEntities.ts       # Players, NPCs, resources
│   ├── skills.ts               # Skill levels, XP
│   ├── equipment.ts            # Equipped items
│   ├── availableActions.ts     # Context-aware actions
│   └── plugin-info.ts          # Instructions & settings providers
├── actions/
│   ├── movement.ts             # MOVE_TO, FOLLOW, STOP
│   ├── combat.ts               # ATTACK, COMBAT_STYLE
│   ├── skills.ts               # CHOP, FISH, COOK, LIGHT_FIRE
│   ├── inventory.ts            # EQUIP, USE_ITEM, DROP
│   ├── social.ts               # CHAT
│   ├── findPlayer.ts           # FIND_PLAYER (presence search)
│   ├── banking.ts              # DEPOSIT, WITHDRAW
│   ├── goals.ts                # SET_GOAL, NAVIGATE_TO
│   └── autonomous.ts           # EXPLORE, FLEE, IDLE, APPROACH
├── evaluators/
│   ├── survivalEvaluator.ts    # Health, threats assessment
│   ├── explorationEvaluator.ts # Discovery opportunities
│   ├── combatEvaluator.ts      # Combat assessment
│   └── utils.ts                # Shared utilities, homeostasis reporting
├── managers/
│   ├── autonomous-behavior-manager.ts  # Goal-driven behavior loop
│   ├── behavior-manager.ts             # Behavior state machine
│   └── exploration-manager.ts          # World exploration logic
├── events/
│   └── handlers.ts             # Game event → Memory mappings
└── types/
    ├── plugin-homeostasis.d.ts # Optional dependency types
    ├── plugin-presence.d.ts
    ├── plugin-skills.d.ts
    └── plugin-goals.d.ts
```

---

## Memory System

Game events are automatically stored as memories for learning:

| Event Type | Memory Content | Tags |
|------------|---------------|------|
| Combat victory | Opponent, damage dealt, location | `hyperscape`, `combat`, `victory` |
| Combat defeat | Opponent, damage taken, location | `hyperscape`, `combat`, `defeat` |
| Resource gathered | Resource type, XP gained, location | `hyperscape`, `resource`, `gathered` |
| Skill level-up | Skill name, new level | `hyperscape`, `skill`, `levelup` |
| Player interaction | Player name, message content | `hyperscape`, `social` |

---

## Survival Architecture: Micro vs Macro

Hyperscape has two survival layers for progressive enhancement:

### Micro-Level (Built-in)

The `survivalEvaluator` handles **immediate tactical decisions**:

```
Health 15% + goblin nearby → urgency: CRITICAL → FLEE
Health 60% + goblin nearby → urgency: WARNING  → ATTACK or FLEE
Health 90% + no threats    → urgency: SAFE     → Continue goal
```

This works **standalone** — a functional bot that flees danger, eats when hungry, fights appropriately.

### Macro-Level (With Homeostasis)

When `plugin-homeostasis` is present, game events affect **psychological state**:

| Game Event | Psychological Effect |
|------------|---------------------|
| Health < 20% | Security -15 (fear) |
| Health < 50% | Security -5 (unease) |
| In Combat | Security -3 (stress) |
| Death | Status -20 (humiliation) |
| Many Threats | Security -10 (overwhelm) |

**Key difference**: Micro resets each tick. Macro **persists** — a traumatic near-death experience affects the agent's mood in Discord conversations later.

---

## Progressive Enhancement Details

### plugin-homeostasis

Registers game character as a **Domain Body**:

1. **Domain Body Registration**: Hyperscape registers its body with homeostasis on init
2. **Context Switching**: World context switches to `hyperscape:${serverId}` when connecting
3. **Coupling Rules**: Game state changes trigger psychological drive adjustments
4. **Emotional Residue**: Emotions persist after leaving the game

### plugin-goals

Registers game-specific **goal templates**:

```typescript
{
  id: 'train_attack',
  name: 'Train Attack Skill',
  domain: 'hyperscape',
  criteria: { type: 'counter', target: 10, event: 'entity_killed' },
  recommendedAction: { name: 'ATTACK_ENTITY', params: { targetType: 'hostile' } }
}
```

### plugin-presence

Registers **spatial presence data**:

- Nearby players published as presence entries
- Historical sightings stored for lookup
- `FIND_PLAYER` action searches current + historical presence
- Cross-domain: game presence visible in Discord context

### plugin-skills

Registers **namespaced skills**:

```
attack: 50      → "hyperscape:attack:50"
fishing: 75     → "hyperscape:fishing:75"
woodcutting: 32 → "hyperscape:woodcutting:32"
```

Other plugins (like `plugin-jobsearch`) can query: "Does agent have fishing skills?"

### plugin-rolodex

Links game identities to other platforms:

- Player "DragonSlayer99" in game = "@dragon_slayer" on Discord
- Cross-platform relationship tracking

---

## Development

```bash
# Build
bun run build

# Watch mode
bun run dev

# Run tests
bun run test
```

---

## Changelog

### v2.0.0 (Current)

**Architecture**
- Migrated to ElizaOS plugin architecture (Service, Provider, Action, Event patterns)
- Full TypeScript typing

**Communication**
- WebSocket for real-time bidirectional communication
- Automatic reconnection with exponential backoff

**Context & Memory**
- 6 providers for complete game context
- Event → memory pipeline for learning

**Integrations**
- Progressive enhancement with optional plugins (homeostasis, goals, presence, skills, rolodex)

**Actions**
- FIND_PLAYER action for presence-based player search
- Autonomous behavior actions (explore, flee, idle, approach)
- Goal-oriented actions (setGoal, navigateTo)

---

## License

MIT - Hyperscape Team
