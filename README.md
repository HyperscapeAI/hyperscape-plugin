# @hyperscape/plugin-hyperscape

ElizaOS plugin for Hyperscape - Connects AI agents to 3D multiplayer RPG worlds as real players.

## Overview

This plugin enables ElizaOS AI agents to play Hyperscape as real players with full access to game mechanics:

- **Real-time state awareness** via providers (health, inventory, nearby entities, skills, equipment)
- **Full action repertoire**: movement, combat, gathering, inventory management, social interactions
- **Event-driven memory storage** for learning from gameplay experiences
- **Automatic reconnection** and robust error handling

## Architecture

### Service
- **HyperscapeService**: Manages WebSocket connection to game server, maintains cached game state, executes commands

### Providers (Supply Context to Agent)
1. **gameStateProvider**: Player health, stamina, position, combat status
2. **inventoryProvider**: Inventory items, coins, free slots
3. **nearbyEntitiesProvider**: Players, NPCs, and resources nearby
4. **skillsProvider**: Skill levels and XP progression
5. **equipmentProvider**: Currently equipped items
6. **availableActionsProvider**: Context-aware available actions

### Actions (Executable Game Commands)
- **Movement**: MOVE_TO, FOLLOW_ENTITY, STOP_MOVEMENT
- **Combat**: ATTACK_ENTITY, CHANGE_COMBAT_STYLE
- **Skills**: CHOP_TREE, CATCH_FISH, LIGHT_FIRE, COOK_FOOD
- **Inventory**: EQUIP_ITEM, USE_ITEM, DROP_ITEM
- **Social**: CHAT_MESSAGE
- **Banking**: BANK_DEPOSIT, BANK_WITHDRAW

### Event Handlers
Automatically store significant game events as memories:
- Combat encounters (victories, defeats, kills)
- Resource gathering and respawns
- Skill level-ups and XP gains
- Player interactions

## Installation

```bash
# In your ElizaOS project
bun install @hyperscape/plugin-hyperscape
```

## Configuration

### Environment Variables

```bash
# Hyperscape server WebSocket URL (default: ws://localhost:5555/ws)
HYPERSCAPE_SERVER_URL=ws://localhost:5555/ws

# Automatically reconnect on disconnect (default: true)
HYPERSCAPE_AUTO_RECONNECT=true
```

### Character File

Add the plugin to your ElizaOS character configuration:

```json
{
  "name": "WoodcutterBot",
  "plugins": ["@hyperscape/plugin-hyperscape"],
  "settings": {
    "HYPERSCAPE_SERVER_URL": "ws://localhost:5555/ws",
    "HYPERSCAPE_AUTO_RECONNECT": "true"
  }
}
```

### Optional Plugin Dependencies (Progressive Enhancement)

For enhanced capabilities, add these optional plugins. Hyperscape works standalone,
but gains additional features when these plugins are available:

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

| Plugin | Enhancement |
|--------|-------------|
| `plugin-homeostasis` | Game character as domain body - health/combat affects psychological drives |
| `plugin-goals` | Game-specific goal templates and criteria-based evaluation |
| `plugin-presence` | Unified presence tracking - nearby players visible across all domains |
| `plugin-skills` | Namespaced skill inventory - `hyperscape:fishing:75` queryable by other systems |

#### Why Progressive Enhancement?

Hyperscape is designed to work standalone with its own providers:
- `nearbyEntitiesProvider` shows nearby players locally
- `skillsProvider` shows game skills locally
- `survivalEvaluator` handles immediate survival decisions

But when optional plugins are available, hyperscape contributes to unified systems:
- Nearby players appear in the cross-domain `presenceProvider`
- Skills become queryable with namespaced IDs like `hyperscape:attack:50`
- Game health affects the agent's psychological state via homeostasis

## Usage Example

Once configured, the agent will:

1. **Connect** to Hyperscape server on startup
2. **Receive context** from providers every decision cycle
3. **Execute actions** based on LLM decisions
4. **Store memories** of important game events
5. **Learn** from past experiences via semantic memory search

### Example Agent Behavior

```typescript
// Agent receives provider context:
// - "You have 75/100 HP and are at position [10, 5, 20]"
// - "Nearby: Oak Tree at [12, 5, 18]"
// - "Inventory: Bronze Axe, 15 free slots"
// - "Available: CHOP_TREE, MOVE_TO, CHAT"

// Agent decides and executes action:
await runtime.processActions({
  action: 'CHOP_TREE',
  target: 'Oak Tree'
});

// Event occurs:
// RESOURCE_GATHERED → Stored as memory:
// "Gathered Oak Logs at [12, 5, 18], gained 25 woodcutting XP"

// Later, agent can search memories:
// "Where did I last chop trees?"
// → Semantic search returns location [12, 5, 18]
```

## Memory System Integration

The plugin stores these event types as memories:

- **Combat Memories**: Opponents, outcomes, damage dealt/taken
- **Resource Memories**: Locations, types, XP gained
- **Skill Memories**: Level-ups, progression milestones
- **Social Memories**: Player interactions, messages

Memories are tagged for semantic search:
- Tags: `['hyperscape', 'combat', 'victory']`
- Tags: `['hyperscape', 'resource', 'woodcutting', 'gathered']`
- Tags: `['hyperscape', 'skill', 'levelup', 'fishing']`

## Development

```bash
# Build the plugin
bun run build

# Watch mode for development
bun run dev

# Run tests
bun run test
```

## Plugin Structure

```
src/
├── index.ts              # Plugin export and configuration
├── types.ts              # TypeScript type definitions
├── services/
│   └── HyperscapeService.ts
├── providers/
│   ├── gameState.ts
│   ├── inventory.ts
│   ├── nearbyEntities.ts
│   ├── availableActions.ts
│   ├── skills.ts
│   └── equipment.ts
├── actions/
│   ├── movement.ts       # MOVE_TO, FOLLOW, STOP
│   ├── combat.ts         # ATTACK, COMBAT_STYLE
│   ├── skills.ts         # CHOP, FISH, COOK, LIGHT_FIRE
│   ├── inventory.ts      # EQUIP, USE_ITEM, DROP
│   ├── social.ts         # CHAT
│   └── banking.ts        # DEPOSIT, WITHDRAW
└── events/
    └── handlers.ts       # Event → Memory mappings
```

## Key Design Principles

1. **Event-Driven**: Game events flow into agent context automatically
2. **Stateless Actions**: Actions use Service for state, no internal state
3. **Rich Context**: Providers give agent full game awareness
4. **Memory-Based Learning**: Agents learn from experiences via Memory system
5. **Type-Safe**: Full TypeScript types from both ElizaOS and Hyperscape
6. **Modular**: Clean separation - Service → Providers → Actions
7. **Progressive Enhancement**: Enhanced capabilities when optional plugins are present
8. **Standalone Capable**: Works as a basic bot without optional dependencies

## Survival Architecture: Micro vs Macro

Hyperscape has a two-layer survival system that enables both standalone operation and emotional depth when homeostasis is available.

### Micro-Level Survival (Built-in)

The `survivalEvaluator` handles **immediate tactical decisions** — the agent's reflexes:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    survivalEvaluator (Micro-Level)                  │
│                    Runs every decision cycle                        │
│                                                                     │
│  Input:  Player health, nearby entities, combat status              │
│  Output: Urgency level (critical/warning/safe), recommendations     │
│                                                                     │
│  Examples:                                                          │
│    Health 15% + goblin nearby → urgency: critical → FLEE            │
│    Health 60% + goblin nearby → urgency: warning  → ATTACK or FLEE  │
│    Health 90% + no threats    → urgency: safe     → Continue goal   │
└─────────────────────────────────────────────────────────────────────┘
```

**This works standalone** — a basic bot player that can:
- Flee when health is critical
- Eat from inventory in emergencies
- Fight or flight based on threat assessment
- Navigate to goals and complete objectives

### Macro-Level Survival (With Homeostasis)

When `plugin-homeostasis` is available, game events affect the agent's **psychological state**:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Domain Body (Macro-Level)                        │
│                    Registered with homeostasis                      │
│                                                                     │
│  Game State → Coupling Rules → Psychological Drives                 │
│                                                                     │
│  health < 20%     → security -15  (fear/anxiety)                   │
│  health < 50%     → security -5   (unease)                         │
│  inCombat         → security -3   (stress)                         │
│  died             → status -20    (embarrassment)                  │
│  many threats     → security -10  (overwhelm)                      │
│                                                                     │
│  These emotions PERSIST after leaving the game (emotional residue)  │
└─────────────────────────────────────────────────────────────────────┘
```

### How They Work Together

```
Game Event: "Health dropped to 18%, goblin attacking"
                    │
    ┌───────────────┴───────────────┐
    │                               │
    ▼                               ▼
┌─────────────┐             ┌─────────────────┐
│ MICRO-LEVEL │             │   MACRO-LEVEL   │
│             │             │ (if available)  │
│ survivalEval│             │                 │
│ urgency:    │             │ homeostasis     │
│ CRITICAL    │             │ security: -15   │
│             │             │                 │
│ Action:     │             │ Emotional       │
│ FLEE NOW!   │             │ impact persists │
└──────┬──────┘             └────────┬────────┘
       │                             │
       ▼                             ▼
  Immediate               Long-term mood
  tactical                affects future
  response                behavior
```

### Why Two Layers?

| Layer | Purpose | Timing | Scope |
|-------|---------|--------|-------|
| **Micro** | Immediate survival | This tick | In-game only |
| **Macro** | Emotional impact | Long-term | Cross-domain |

**Micro (survivalEvaluator)**:
- "I need to run RIGHT NOW"
- Handles the immediate fight-or-flight
- Resets each tick
- Only affects in-game behavior

**Macro (homeostasis)**:
- "That near-death experience was traumatic"
- Creates lasting emotional impact
- Persists across context switches
- Affects behavior in Discord, Twitter, etc.

### Example: Near-Death Experience

1. **Micro**: Agent flees (survivalEvaluator triggers FLEE action)
2. **Macro**: Security drive drops -15 (agent feels anxious)
3. **After escaping**: Agent is safe (micro resets to "safe")
4. **But**: Security drive is still low (macro persists)
5. **Result**: Agent might be more cautious, avoid risky areas, or seek social connection to feel secure

### Standalone Mode

Without homeostasis, the agent is a **competent basic bot**:
- ✅ Flees when health is critical
- ✅ Attacks appropriate targets
- ✅ Navigates to goals
- ✅ Completes objectives
- ❌ No emotional depth
- ❌ No cross-domain impact
- ❌ No personality evolution

### Enhanced Mode (With Homeostasis)

With homeostasis, the agent has **emotional intelligence**:
- ✅ All standalone capabilities
- ✅ Emotional responses to game events
- ✅ Mood affects behavior across platforms
- ✅ Learns from traumatic experiences
- ✅ Develops consistent personality

## Progressive Enhancement

Hyperscape operates standalone but gains enhanced capabilities when optional plugins are present.

### plugin-homeostasis Integration

When `@elizaos/plugin-homeostasis` is installed, Hyperscape registers its game character as a **Domain Body**. This creates a unified psychological model where game events affect the agent's emotions.

#### Why This Matters

Without homeostasis, game state is just data. With homeostasis, **the agent emotionally experiences the game**:
- Low health → reduced security (fear)
- Death → reduced status (humiliation)
- Combat → heightened stress
- Many threats → anxiety

#### How It Works

1. **Domain Body Registration**: Hyperscape registers its body with homeostasis on init
2. **Context Switching**: When connecting to a game server, world context switches to `hyperscape:${serverId}`
3. **Coupling Rules**: Game state changes trigger psychological drive adjustments
4. **Emotional Residue**: Emotions persist after leaving the game

#### Coupling Rules

| Game Event | Psychological Effect | Why |
|------------|---------------------|-----|
| Health < 20% | Security -15 | Critical danger triggers fear |
| Health < 50% | Security -5 | Low health creates unease |
| In Combat | Security -3 | Fighting is stressful |
| Death | Status -20 | Dying is humiliating |
| Many Threats (>2) | Security -10 | Being surrounded is threatening |

#### Configuration

No configuration needed. If `@elizaos/plugin-homeostasis` is in your project, enhancement is automatic.

```json
{
  "plugins": [
    "@elizaos/plugin-homeostasis",
    "@hyperscape/plugin-hyperscape"
  ]
}
```

### plugin-goals Integration

When `@elizaos/plugin-goals` is installed, Hyperscape registers game-specific goal templates and a domain evaluator.

#### Features

- **Goal Templates**: Pre-defined goals like "train_attack", "explore_world", "defeat_boss"
- **Domain Evaluator**: Evaluates goal criteria using real-time game state
- **Action Hints**: Suggests optimal actions based on current goals

#### Example Goal Template

```typescript
{
  id: 'train_attack',
  name: 'Train Attack Skill',
  description: 'Improve attack skill by fighting enemies',
  domain: 'hyperscape',
  criteria: {
    type: 'counter',
    current: 0,
    target: 10,
    event: 'entity_killed',
  },
  recommendedAction: {
    name: 'ATTACK_ENTITY',
    params: { targetType: 'hostile' },
  },
}
```

### plugin-presence Integration

When `@elizaos/plugin-presence` is installed, Hyperscape registers its spatial presence data.

#### Features

- **Proximity Tracking**: Nearby players registered as presence entries
- **Entity Distance**: Distance calculations for social awareness
- **Cross-Domain Presence**: Game presence unified with Discord, Twitter, etc.
- **TTL-Based Expiration**: Stale presence data auto-expires after 30 seconds

### plugin-rolodex Integration

For cross-platform identity resolution (linking game players to Discord/Twitter identities).

## Differences from Old Plugin

The previous `@elizaos/plugin-hyperscape` was broken. This new implementation:

✅ Follows ElizaOS plugin architecture standards
✅ Properly implements Service, Provider, Action, Event patterns
✅ Uses WebSocket for real-time communication
✅ Stores events as memories for learning
✅ Provides complete game context via providers
✅ Handles reconnection and errors gracefully
✅ Fully typed with TypeScript
✅ Progressive enhancement with homeostasis, goals, and rolodex

## License

MIT - Hyperscape Team
