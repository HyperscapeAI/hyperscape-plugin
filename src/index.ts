/**
 * @hyperscape/plugin-hyperscape
 *
 * ============================================================================
 * WHY THIS PLUGIN EXISTS
 * ============================================================================
 *
 * AI agents need to exist in virtual worlds, not just chat interfaces.
 * Hyperscape is a 3D multiplayer RPG where agents can:
 * - Have a persistent avatar with health, inventory, skills
 * - Navigate a physical world with other players
 * - Learn from experiences (combat, gathering, social)
 *
 * THE PROBLEM:
 * Game bots are typically hardcoded scripts. They can't adapt, learn, or
 * have genuine social interactions. They feel artificial.
 *
 * THE SOLUTION:
 * Connect an LLM-powered agent to the game via WebSocket. The agent:
 * - Receives game state as context (health, nearby entities, etc.)
 * - Decides actions based on goals and personality
 * - Stores experiences as memories for future learning
 * - Can have real conversations with other players
 *
 * ============================================================================
 * HOW IT WORKS
 * ============================================================================
 *
 * 1. SERVICE (HyperscapeService)
 *    Maintains WebSocket connection to game server. Caches game state.
 *    Executes commands (move, attack, gather, etc.).
 *
 *    WHY a service: Game connection is stateful and long-lived.
 *    Multiple components need access to the same connection.
 *
 * 2. PROVIDERS (6 total)
 *    Supply game context to the LLM each decision cycle:
 *    - gameState: Health, stamina, position, combat status
 *    - inventory: Items, coins, free slots
 *    - nearbyEntities: Players, NPCs, resources in range
 *    - skills: Skill levels and XP progression
 *    - equipment: Currently equipped items
 *    - availableActions: Context-aware action list
 *
 *    WHY providers: The LLM needs to "see" the game world.
 *    Without context, it can't make informed decisions.
 *
 * 3. EVALUATORS (3 total)
 *    Assess game state for autonomous decision-making:
 *    - survivalEvaluator: Health, threats, urgency level
 *    - explorationEvaluator: Discovery opportunities
 *    - combatEvaluator: Combat threats and opportunities
 *
 *    WHY evaluators: Provide structured assessments rather than
 *    raw data. "You're in danger" vs "health=15, goblin nearby".
 *
 * 4. ACTIONS (20+ total)
 *    Execute game commands when LLM decides:
 *    - Movement: MOVE_TO, FOLLOW_ENTITY, STOP
 *    - Combat: ATTACK, CHANGE_COMBAT_STYLE
 *    - Skills: CHOP_TREE, CATCH_FISH, COOK_FOOD
 *    - Inventory: EQUIP, USE_ITEM, DROP
 *    - Social: CHAT, FIND_PLAYER
 *    - Banking: DEPOSIT, WITHDRAW
 *
 *    WHY actions: The LLM's "hands" in the game world.
 *    Each action maps to a WebSocket command.
 *
 * 5. EVENT HANDLERS
 *    Convert game events to memories for learning:
 *    - Combat victory → "Defeated goblin at [10, 5, 20]"
 *    - Skill level-up → "Reached level 50 fishing"
 *    - Player interaction → "Talked to DragonSlayer99"
 *
 *    WHY events→memories: Enables semantic search of past experiences.
 *    "Where did I last chop trees?" returns actual locations.
 *
 * ============================================================================
 * PROGRESSIVE ENHANCEMENT
 * ============================================================================
 *
 * Hyperscape works standalone as a functional game bot. But when optional
 * plugins are present, it gains enhanced capabilities:
 *
 * | Plugin | Enhancement |
 * |--------|-------------|
 * | plugin-homeostasis | Game health affects psychological drives |
 * | plugin-goals | Game-specific goal templates and evaluation |
 * | plugin-presence | Nearby players visible cross-domain |
 * | plugin-skills | Skills queryable as `hyperscape:fishing:75` |
 * | plugin-rolodex | Link game identities to Discord/Twitter |
 *
 * WHY progressive enhancement: Not everyone needs all features.
 * A simple game bot shouldn't require a full psychology system.
 * But if you want emotional depth, it's available.
 *
 * ============================================================================
 * SURVIVAL ARCHITECTURE: MICRO VS MACRO
 * ============================================================================
 *
 * Two-layer survival for standalone operation + emotional depth:
 *
 * MICRO (survivalEvaluator) - Built-in, always active
 *   "Health 15% + goblin = FLEE NOW"
 *   Immediate tactical decisions. Resets each tick.
 *
 * MACRO (plugin-homeostasis) - Optional, persistent
 *   "That near-death was traumatic → security drive -15"
 *   Emotional impact persists across domains.
 *
 * WHY two layers: Micro handles reflexes without external dependencies.
 * Macro adds emotional depth when available.
 *
 * ============================================================================
 * EXAMPLE USAGE
 * ============================================================================
 *
 * // Get the service for direct game interaction:
 * const service = runtime.getService<HyperscapeService>('hyperscapeService');
 *
 * // Check connection status
 * if (service?.isConnected()) {
 *   const state = service.getGameState();
 *   console.log(`Health: ${state.player.health}/${state.player.maxHealth}`);
 * }
 *
 * // Execute a command directly (usually done via actions)
 * await service.executeCommand('move', { x: 10, y: 5, z: 20 });
 *
 * // Get nearby entities
 * const nearby = service.getNearbyEntities();
 * const players = nearby.filter(e => e.type === 'player');
 */

import type { Plugin, IAgentRuntime, UUID } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { z } from "zod";

// Types for optional plugin integrations (progressive enhancement)
// These are defined here to avoid hard dependencies on optional plugins
import type { PresenceService, PresenceEntry, PresenceSource } from "@elizaos/plugin-presence";
import type { SkillsService, SkillEntry, SkillSource_Provider } from "@elizaos/plugin-skills";

// Service
import { HyperscapeService } from "./services/HyperscapeService.js";

// Providers
import { gameStateProvider } from "./providers/gameState.js";
import { inventoryProvider } from "./providers/inventory.js";
import { nearbyEntitiesProvider } from "./providers/nearbyEntities.js";
import { skillsProvider } from "./providers/skills.js";
import { equipmentProvider } from "./providers/equipment.js";
import { availableActionsProvider } from "./providers/availableActions.js";
import { hyperscapeInstructionsProvider, hyperscapeSettingsProvider } from "./providers/plugin-info.js";
// goalProvider removed - now using plugin-goals with hyperscape domain registration

// Actions
import {
  moveToAction,
  followEntityAction,
  stopMovementAction,
} from "./actions/movement.js";
import {
  attackEntityAction,
  changeCombatStyleAction,
} from "./actions/combat.js";
import {
  chopTreeAction,
  catchFishAction,
  lightFireAction,
  cookFoodAction,
} from "./actions/skills.js";
import {
  equipItemAction,
  useItemAction,
  dropItemAction,
} from "./actions/inventory.js";
import { chatMessageAction } from "./actions/social.js";
import { bankDepositAction, bankWithdrawAction } from "./actions/banking.js";
import {
  exploreAction,
  fleeAction,
  idleAction,
  approachEntityAction,
  attackEntityAction as autonomousAttackAction,
} from "./actions/autonomous.js";
import { setGoalAction, navigateToAction } from "./actions/goals.js";
import { findPlayerAction } from "./actions/findPlayer.js";

// Evaluators
import {
  survivalEvaluator,
  explorationEvaluator,
  combatEvaluator,
} from "./evaluators/index.js";
// goalEvaluator removed - now using plugin-goals with criteria-based evaluation
// socialEvaluator removed - presence now handled by plugin-presence

// Event handlers
import { registerEventHandlers } from "./events/handlers.js";

// Goals domain evaluator and templates
import { hyperscapeDomainEvaluator, hyperscapeGoalTemplates } from "./goals/index.js";

// API routes
import { callbackRoute, statusRoute } from "./routes/auth.js";
import { getSettingsRoute } from "./routes/settings.js";
import { getLogsRoute } from "./routes/logs.js";
import { messageRoute } from "./routes/message.js";
import { goalRoute } from "./routes/goal.js";

// Banner
import { printHyperscapeBanner } from "./banner.js";

/**
 * Calculate distance between two positions (2D, ignoring Y)
 */
function calculateDistance(
  pos1: [number, number, number],
  pos2: [number, number, number],
): number {
  const dx = pos1[0] - pos2[0];
  const dz = pos1[2] - pos2[2];
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Get cardinal direction from pos1 to pos2
 */
function getDirection(
  pos1: [number, number, number],
  pos2: [number, number, number],
): string {
  const dx = pos2[0] - pos1[0];
  const dz = pos2[2] - pos1[2];
  const angle = Math.atan2(dz, dx) * (180 / Math.PI);

  // Convert angle to cardinal direction
  if (angle >= -22.5 && angle < 22.5) return "east";
  if (angle >= 22.5 && angle < 67.5) return "southeast";
  if (angle >= 67.5 && angle < 112.5) return "south";
  if (angle >= 112.5 && angle < 157.5) return "southwest";
  if (angle >= 157.5 || angle < -157.5) return "west";
  if (angle >= -157.5 && angle < -112.5) return "northwest";
  if (angle >= -112.5 && angle < -67.5) return "north";
  return "northeast";
}

/**
 * Register hyperscape as a presence source with plugin-presence (if available)
 * 
 * WHY REGISTER WITH PLUGIN-PRESENCE?
 * ==================================
 * Presence is about "who is around me right now?" In Hyperscape, this means
 * nearby players. By registering as a presence source, we contribute:
 * - Player names and IDs
 * - Spatial distance and direction
 * - Activity status (combat, idle, etc.)
 * 
 * This data flows to the presenceProvider which formats it for the LLM.
 * Without plugin-presence, the agent still sees nearby entities via
 * nearbyEntitiesProvider, but without the unified presence abstraction.
 */
function registerHyperscapePresenceSource(runtime: IAgentRuntime): void {
  // Get presence service (optional dependency)
  // WHY 'as unknown as': TypeScript's Service base type doesn't include
  // our specific methods. This is safe because we check for undefined.
  const presenceService = runtime.getService("presence") as unknown as PresenceService | undefined;

  if (!presenceService) {
    logger.debug("[HyperscapePlugin] plugin-presence not available, using local nearbyEntitiesProvider");
    return;
  }

  const hsService = runtime.getService("hyperscapeService") as HyperscapeService | undefined;

  // WHY CALLBACK PATTERN?
  // Presence data changes constantly (players move, come/go).
  // Instead of pushing updates, we provide fresh data on demand.
  presenceService.registerSource({
    domain: "hyperscape",
    displayName: "Hyperscape",

    // Return all nearby players as presence entries
    getPresence(): PresenceEntry[] {
      if (!hsService?.isConnected()) return [];

      const player = hsService.getPlayerEntity();
      if (!player?.position || !Array.isArray(player.position) || player.position.length < 3) {
        return [];
      }

      const nearbyEntities = hsService.getNearbyEntities();

      // WHY FILTER TO PLAYERS ONLY?
      // Presence is about other agents/players, not NPCs or resources.
      // NPCs are tracked separately via nearbyEntitiesProvider.
      const nearbyPlayers = nearbyEntities.filter(
        (e) =>
          "playerId" in e &&
          e.id !== player.id &&
          e.position &&
          Array.isArray(e.position) &&
          e.position.length >= 3,
      );

      return nearbyPlayers.map((e) => {
        const distance = calculateDistance(
          player.position as [number, number, number],
          e.position as [number, number, number],
        );
        const direction = getDirection(
          player.position as [number, number, number],
          e.position as [number, number, number],
        );

        // WHY ACTIVITY TRACKING?
        // Knowing if a player is in combat helps decision-making:
        // "Should I help them?" "Are they a threat?"
        let activity: string | undefined;
        if ("inCombat" in e && e.inCombat) {
          activity = "In combat";
        }

        return {
          entityId: e.id as string,
          displayName: e.name,
          domain: "hyperscape",
          status: "online" as const,
          context: {
            distance: Math.round(distance),
            location: `${direction}, ${Math.round(distance)} units`,
            activity,
            metadata: {
              direction,
              rawPosition: e.position,
            },
          },
          lastSeen: Date.now(),
          // WHY TTL?
          // If the game connection drops, stale presence should expire.
          // 30 seconds is long enough to survive brief disconnects.
          ttlMs: 30000,
        };
      });
    },

    // WHY OPTIONAL getPresenceById?
    // Optimized lookup when we know the player ID.
    // Falls back to full scan if not implemented.
    getPresenceById(entityId: string): PresenceEntry | null {
      if (!hsService?.isConnected()) return null;

      const player = hsService.getPlayerEntity();
      if (!player?.position) return null;

      const nearbyEntities = hsService.getNearbyEntities();
      const entity = nearbyEntities.find((e) => e.id === entityId);

      if (!entity || !entity.position) return null;

      const distance = calculateDistance(
        player.position as [number, number, number],
        entity.position as [number, number, number],
      );
      const direction = getDirection(
        player.position as [number, number, number],
        entity.position as [number, number, number],
      );

      let activity: string | undefined;
      if ("inCombat" in entity && entity.inCombat) {
        activity = "In combat";
      }

      return {
        entityId: entity.id as string,
        displayName: entity.name,
        domain: "hyperscape",
        status: "online",
        context: {
          distance: Math.round(distance),
          location: `${direction}, ${Math.round(distance)} units`,
          activity,
        },
        lastSeen: Date.now(),
        ttlMs: 30000,
      };
    },
  });

  logger.info("[HyperscapePlugin] Progressive enhancement: registered presence source with plugin-presence");
}

/**
 * Register hyperscape as a skill source with plugin-skills (if available)
 * 
 * WHY REGISTER WITH PLUGIN-SKILLS?
 * ================================
 * Skills in Hyperscape (attack, fishing, mining, etc.) are capabilities
 * the agent can use. By registering them with plugin-skills:
 * 
 * 1. NAMESPACED: Skills become `hyperscape:attack`, `hyperscape:fishing`
 *    This prevents confusion with skills from other domains.
 * 
 * 2. QUERYABLE: Other systems can check "does agent have fishing 50?"
 *    Useful for job matching, task delegation, etc.
 * 
 * 3. LLM CONTEXT: The skillsProvider formats all skills for the LLM.
 *    Agent knows its capabilities across all domains.
 * 
 * Without plugin-skills, the agent still sees skills via skillsProvider,
 * but without the unified, namespaced skill abstraction.
 */
function registerHyperscapeSkillSource(runtime: IAgentRuntime): void {
  // Get skills service (optional dependency)
  // WHY 'as unknown as': TypeScript's Service base type doesn't include
  // our specific methods. This is safe because we check for undefined.
  const skillsService = runtime.getService("skills") as unknown as SkillsService | undefined;

  if (!skillsService) {
    logger.debug("[HyperscapePlugin] plugin-skills not available, using local skillsProvider");
    return;
  }

  const hsService = runtime.getService("hyperscapeService") as HyperscapeService | undefined;

  skillsService.registerSource({
    domain: "hyperscape",
    displayName: "Hyperscape",

    // Return all player skills as skill entries
    getSkills(): SkillEntry[] {
      const player = hsService?.getPlayerEntity();
      if (!player?.skills) return [];

      const skills = player.skills as Record<string, { level: number; xp: number }>;

      return Object.entries(skills).map(([name, data]) => {
        // WHY NAMESPACED ID?
        // `hyperscape:fishing` is unambiguous.
        // Other games might have fishing too.
        const skillId = `hyperscape:${name}`;

        // WHY DESCRIPTION?
        // Helps LLM understand what the skill does.
        const description = getSkillDescription(name);

        return {
          id: skillId,
          domain: "hyperscape",
          name,
          displayName: name.charAt(0).toUpperCase() + name.slice(1),
          description,
          level: {
            numeric: data.level,
            maxLevel: 99, // Hyperscape max level
            experience: data.xp,
            // Could calculate XP to next level if we have the formula
          },
          active: true,
          source: "earned" as const,
          lastUsedAt: Date.now(), // Could track actual usage
        };
      });
    },

    // WHY OPTIONAL getSkill?
    // Optimized lookup by name.
    getSkill(skillName: string): SkillEntry | null {
      const player = hsService?.getPlayerEntity();
      if (!player?.skills) return null;

      const skills = player.skills as Record<string, { level: number; xp: number }>;
      const data = skills[skillName];
      if (!data) return null;

      return {
        id: `hyperscape:${skillName}`,
        domain: "hyperscape",
        name: skillName,
        displayName: skillName.charAt(0).toUpperCase() + skillName.slice(1),
        description: getSkillDescription(skillName),
        level: {
          numeric: data.level,
          maxLevel: 99,
          experience: data.xp,
        },
        active: true,
        source: "earned",
      };
    },

    // WHY hasSkill?
    // Quick capability check without fetching full skill data.
    hasSkill(skillName: string, minLevel?: number): boolean {
      const player = hsService?.getPlayerEntity();
      if (!player?.skills) return false;

      const skills = player.skills as Record<string, { level: number; xp: number }>;
      const data = skills[skillName];
      if (!data) return false;

      if (minLevel === undefined) return true;
      return data.level >= minLevel;
    },
  });

  logger.info("[HyperscapePlugin] Progressive enhancement: registered skill source with plugin-skills");
}

/**
 * Get description for a skill
 * WHY: Helps LLM understand what each skill enables
 */
function getSkillDescription(skillName: string): string {
  const descriptions: Record<string, string> = {
    attack: "Melee combat accuracy and damage",
    strength: "Melee combat power and carry capacity",
    defense: "Damage reduction and armor effectiveness",
    constitution: "Maximum health points",
    ranged: "Ranged combat with bows and thrown weapons",
    prayer: "Divine abilities and protection",
    magic: "Spellcasting and magical attacks",
    runecrafting: "Creating magical runes",
    construction: "Building structures and furniture",
    agility: "Movement speed and shortcuts",
    herblore: "Potion brewing and herb processing",
    thieving: "Pickpocketing and stealing",
    crafting: "Creating items from raw materials",
    fletching: "Making bows and arrows",
    slayer: "Hunting special creatures",
    hunter: "Tracking and trapping animals",
    mining: "Extracting ores from rocks",
    smithing: "Smelting and forging metal items",
    fishing: "Catching fish from water",
    cooking: "Preparing food for consumption",
    firemaking: "Lighting fires for cooking and warmth",
    woodcutting: "Chopping trees for logs",
    farming: "Growing crops and herbs",
    summoning: "Summoning familiar creatures",
    dungeoneering: "Exploring dangerous dungeons",
    divination: "Gathering divine energy",
    invention: "Creating and augmenting devices",
    archaeology: "Discovering ancient artifacts",
  };
  return descriptions[skillName] || `${skillName} skill`;
}

/**
 * Register hyperscape as a domain body with plugin-homeostasis (if available).
 * 
 * WHY REGISTER A DOMAIN BODY?
 * ===========================
 * When the agent is playing Hyperscape, its "body" is the game character.
 * The character's health, combat status, and threats are the physiological
 * reality the agent experiences - not the simulated hunger/fatigue of the
 * default body.
 * 
 * By registering a domain body, we tell homeostasis:
 * "When in Hyperscape, use THIS body state instead of the default"
 * 
 * WHY COUPLING RULES?
 * ===================
 * Coupling rules define how game events affect psychological drives:
 * - Low health → reduced security (agent feels unsafe)
 * - In combat → reduced security (active threat)
 * - Died → reduced status (failure, embarrassment)
 * 
 * This creates authentic emotional responses to gameplay.
 * 
 * WHY PROGRESSIVE ENHANCEMENT?
 * ============================
 * Hyperscape works fine without plugin-homeostasis - the survivalEvaluator
 * handles immediate survival decisions locally. But when homeostasis IS
 * available, we get:
 * - Psychological state that persists across context switches
 * - Unified psychological model across all domains
 * - Emotional residue (dying in game affects mood in Discord)
 * 
 * This is optional but valuable when available.
 */
function registerHyperscapeDomainBody(runtime: IAgentRuntime): void {
  import('@elizaos/plugin-homeostasis').then((homeostasisModule) => {
    // Get the HomeostasisService type
    const HomeostasisServiceClass = (homeostasisModule as Record<string, unknown>).HomeostasisService as { serviceType: string } | undefined;
    if (!HomeostasisServiceClass) {
      logger.debug('[HyperscapePlugin] HomeostasisService not found in plugin-homeostasis');
      return;
    }

    const homeostasis = runtime.getService(HomeostasisServiceClass.serviceType) as unknown as {
      registerDomainBody: (body: {
        domain: string;
        worldPatterns: string[];
        getPhysiological: () => { variables: Record<string, number>; distressContribution: number; labels?: Record<string, string> };
        getResources: () => Record<string, number>;
        getCouplingRules: () => Array<{
          id: string;
          trigger: { variable: string; op: string; value: number };
          effect: { drive: string; delta: number };
          cooldownMs?: number;
          description?: string;
        }>;
      }) => void;
      setWorldContext: (context: string) => void;
    } | undefined;

    if (!homeostasis?.registerDomainBody) {
      logger.debug('[HyperscapePlugin] HomeostasisService not available or missing registerDomainBody');
      return;
    }

    const hsService = runtime.getService('hyperscapeService') as HyperscapeService | undefined;

    // Register the hyperscape domain body
    // WHY 'hyperscape' domain with ['hyperscape:*', 'hyperscape'] patterns?
    // - 'hyperscape:*' matches 'hyperscape:server-1', 'hyperscape:server-2', etc.
    // - 'hyperscape' matches exactly 'hyperscape' for simple cases
    // This allows multiple server instances while keeping the domain unified.
    homeostasis.registerDomainBody({
      domain: 'hyperscape',
      worldPatterns: ['hyperscape:*', 'hyperscape'],

      // PHYSIOLOGICAL STATE
      // ===================
      // WHY THESE VARIABLES?
      // - healthPercent: Core survival metric, 0-100 scale
      // - inCombat: Binary flag, affects security drive
      // - threatCount: Number of nearby hostile mobs
      // - alive: Binary flag for respawn detection
      //
      // WHY distressContribution = 100 - healthPercent?
      // Low health = high distress. This feeds into psychological recovery
      // dampening - when game health is low, the agent can't "relax".
      getPhysiological: () => {
        const player = hsService?.getPlayerEntity();
        if (!player) {
          // WHY RETURN DEFAULTS INSTEAD OF EMPTY?
          // Even without player data, we need valid structure for type safety.
          // 100 health = 0 distress = no psychological impact.
          return {
            variables: { healthPercent: 100, inCombat: 0, threatCount: 0, alive: 1 } as Record<string, number>,
            distressContribution: 0,
            labels: { healthPercent: 'Health', inCombat: 'In Combat', threatCount: 'Threats', alive: 'Alive' },
          };
        }

        // Calculate health percentage (defensive - handle missing health data)
        const healthPercent = player.health
          ? Math.round((player.health.current / player.health.max) * 100)
          : 100;

        // Count nearby threats
        const nearbyEntities = hsService?.getNearbyEntities() ?? [];
        const threatCount = nearbyEntities.filter((e) => {
          if (!('mobType' in e)) return false;
          if (!e.position || !Array.isArray(e.position) || e.position.length < 3) return false;
          if (!player.position || !Array.isArray(player.position) || player.position.length < 3) return false;
          const dist = calculateDistance(
            player.position as [number, number, number],
            e.position as [number, number, number],
          );
          return dist < 15; // Threat range
        }).length;

        return {
          variables: {
            healthPercent,
            inCombat: player.inCombat ? 1 : 0,
            threatCount,
            alive: player.alive !== false ? 1 : 0,
          },
          distressContribution: Math.max(0, 100 - healthPercent),
          labels: {
            healthPercent: 'Health',
            inCombat: 'In Combat',
            threatCount: 'Threats',
            alive: 'Alive',
          },
        };
      },

      getResources: () => {
        const player = hsService?.getPlayerEntity();
        // Return game resources (gold, etc.)
        // For now, return empty - can be expanded with inventory/currency
        return {
          gold: (player as unknown as { gold?: number })?.gold ?? 0,
        };
      },

      // COUPLING RULES: How game state affects psychological drives
      // ==========================================================
      // 
      // WHY THESE SPECIFIC RULES?
      // Each rule maps a game situation to a psychological response:
      // 
      // - Health < 20%: CRITICAL. Agent feels very unsafe. Large security hit.
      // - Health < 50%: WARNING. Agent notices vulnerability. Moderate security hit.
      // - In combat: ACTIVE THREAT. Even with full health, combat is stressful.
      // - Died: FAILURE. Death affects status (embarrassment, setback).
      // - Many threats: OVERWHELMED. Being surrounded is psychologically taxing.
      //
      // WHY SECURITY AND STATUS?
      // Security is about feeling safe. Combat and health directly affect this.
      // Status is about competence/respect. Dying is a failure that impacts status.
      //
      // WHY THESE COOLDOWNS?
      // - 15s for critical health: Gives time to recover before firing again
      // - 10s for low health: Similar but less urgent
      // - 5s for combat: Combat often has multiple engagements
      // - 60s for death: Death is a significant event, don't spam
      // - 8s for many threats: Threat count changes frequently
      //
      getCouplingRules: () => [
        // Critical health (< 20%) severely impacts security
        // WHY: Near-death is terrifying, large psychological impact
        {
          id: 'hs-critical-health',
          trigger: { variable: 'healthPercent', op: '<', value: 20 },
          effect: { drive: 'security', delta: -15 },
          cooldownMs: 15000,
          description: 'Critical game health severely reduces security',
        },
        // Low health (< 50%) impacts security
        // WHY: Being hurt makes you feel vulnerable
        {
          id: 'hs-low-health',
          trigger: { variable: 'healthPercent', op: '<', value: 50 },
          effect: { drive: 'security', delta: -5 },
          cooldownMs: 10000,
          description: 'Low game health reduces security',
        },
        // Being in combat reduces security
        // WHY: Active combat is inherently stressful, even if winning
        {
          id: 'hs-in-combat',
          trigger: { variable: 'inCombat', op: '==', value: 1 },
          effect: { drive: 'security', delta: -3 },
          cooldownMs: 5000,
          description: 'Being in combat reduces security',
        },
        // Dying impacts status significantly
        // WHY: Death represents failure, affects self-perception of competence
        {
          id: 'hs-died',
          trigger: { variable: 'alive', op: '==', value: 0 },
          effect: { drive: 'status', delta: -20 },
          cooldownMs: 60000,
          description: 'Dying in game reduces status',
        },
        // Multiple threats (>= 3) impact security
        // WHY: Being surrounded is psychologically overwhelming
        {
          id: 'hs-many-threats',
          trigger: { variable: 'threatCount', op: '>=', value: 3 },
          effect: { drive: 'security', delta: -8 },
          cooldownMs: 8000,
          description: 'Multiple nearby threats reduce security',
        },
      ],
    });

    // Set up world context switching on connect/disconnect
    if (hsService) {
      // Listen for connection events to switch world context
      // Note: HyperscapeService needs to emit these events or we hook into existing state
      const checkConnectionInterval = setInterval(() => {
        if (hsService.isConnected()) {
          homeostasis.setWorldContext('hyperscape');
          clearInterval(checkConnectionInterval);
        }
      }, 1000);

      // Clean up after 30 seconds if not connected
      setTimeout(() => clearInterval(checkConnectionInterval), 30000);
    }

    logger.info('[HyperscapePlugin] Progressive enhancement: registered domain body with plugin-homeostasis');
  }).catch(() => {
    // plugin-homeostasis not available - this is fine, hyperscape works standalone
    logger.debug('[HyperscapePlugin] Running standalone (plugin-homeostasis not available)');
  });
}

// Configuration schema
const configSchema = z.object({
  HYPERSCAPE_SERVER_URL: z
    .string()
    .url()
    .optional()
    .default("ws://localhost:5555/ws")
    .describe("WebSocket URL for Hyperscape server"),
  HYPERSCAPE_AUTO_RECONNECT: z
    .string()
    .optional()
    .default("true")
    .transform((val) => val !== "false")
    .describe("Automatically reconnect on disconnect"),
  HYPERSCAPE_AUTH_TOKEN: z
    .string()
    .optional()
    .describe("Privy auth token for authenticated connections"),
  HYPERSCAPE_PRIVY_USER_ID: z
    .string()
    .optional()
    .describe("Privy user ID for authenticated connections"),
});

/**
 * Hyperscape Plugin for ElizaOS
 *
 * Enables AI agents to play Hyperscape as real players with:
 * - Real-time game state awareness via providers
 * - Full action repertoire (movement, combat, skills, inventory, social)
 * - Event-driven memory storage for learning
 * - Automatic reconnection and error handling
 */
export const hyperscapePlugin: Plugin = {
  name: "@hyperscape/plugin-hyperscape",
  description:
    "Connect ElizaOS AI agents to Hyperscape 3D multiplayer RPG worlds",

  config: {
    HYPERSCAPE_SERVER_URL: process.env.HYPERSCAPE_SERVER_URL,
    HYPERSCAPE_AUTO_RECONNECT: process.env.HYPERSCAPE_AUTO_RECONNECT,
    HYPERSCAPE_AUTH_TOKEN: process.env.HYPERSCAPE_AUTH_TOKEN,
    HYPERSCAPE_PRIVY_USER_ID: process.env.HYPERSCAPE_PRIVY_USER_ID,
  },

  async init(config: Record<string, string>, runtime: IAgentRuntime) {
    // Print startup banner with settings
    printHyperscapeBanner(runtime);

    logger.info("[HyperscapePlugin] Initializing plugin...");

    try {
      // Validate configuration
      const validatedConfig = await configSchema.parseAsync(config);

      // Set environment variables from validated config
      for (const [key, value] of Object.entries(validatedConfig)) {
        if (value !== undefined) {
          process.env[key] = String(value);
        }
      }

      logger.info("[HyperscapePlugin] Configuration validated");
      logger.info(
        `[HyperscapePlugin] Server URL: ${validatedConfig.HYPERSCAPE_SERVER_URL}`,
      );
      logger.info(
        `[HyperscapePlugin] Auto-reconnect: ${validatedConfig.HYPERSCAPE_AUTO_RECONNECT}`,
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages =
          error.issues?.map((e) => e.message)?.join(", ") ||
          "Unknown validation error";
        throw new Error(
          `[HyperscapePlugin] Invalid configuration: ${errorMessages}`,
        );
      }
      throw new Error(
        `[HyperscapePlugin] Configuration error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Progressive enhancement: If plugin-goals is available, register hyperscape domain
    // This is OPTIONAL - plugin-hyperscape works standalone without plugin-goals
    // When plugin-goals IS available, hyperscape gains:
    // - Criteria-based goal evaluation (no LLM needed for game state checks)
    // - Goal templates for suggested objectives
    // - Scheduled goal progress tracking via tasks
    runtime.initPromise.then(() => {
      import('@elizaos/plugin-goals').then((goalsModule) => {
        const DomainRegistryClass = (goalsModule as Record<string, unknown>).DomainRegistry as { serviceName: string } | undefined;
        if (!DomainRegistryClass) return;

        const domainRegistry = (runtime as unknown as {
          getService: (name: string) => unknown
        }).getService(DomainRegistryClass.serviceName) as {
          register: (domain: string, evaluator: unknown) => void;
          registerTemplates: (domain: string, templates: unknown[]) => void;
        } | undefined;

        if (domainRegistry) {
          domainRegistry.register('hyperscape', hyperscapeDomainEvaluator);
          domainRegistry.registerTemplates('hyperscape', hyperscapeGoalTemplates);
          logger.info('[HyperscapePlugin] Progressive enhancement: registered with plugin-goals');
        }
      }).catch(() => {
        // plugin-goals not available - this is fine, hyperscape works standalone
        logger.debug('[HyperscapePlugin] Running standalone (plugin-goals not available)');
      });

      // Progressive enhancement: If plugin-presence is available, register presence source
      // This is OPTIONAL - nearbyEntitiesProvider still shows nearby players locally
      // When plugin-presence IS available, hyperscape contributes:
      // - Spatial proximity data to unified presenceProvider
      // - Player activity status (combat, idle, etc.)
      // - Cross-domain presence queries ("where are my friends?")
      registerHyperscapePresenceSource(runtime);

      // Progressive enhancement: If plugin-skills is available, register skill source
      // This is OPTIONAL - local skillsProvider still shows skills
      // When plugin-skills IS available, hyperscape contributes:
      // - Namespaced skills (hyperscape:fishing, hyperscape:attack, etc.)
      // - Cross-domain skill queries ("do I have fishing 50+?")
      // - Unified capability summary for LLM
      registerHyperscapeSkillSource(runtime);

      // Progressive enhancement: If plugin-homeostasis is available, register domain body
      // This is OPTIONAL - hyperscape works standalone with its own survivalEvaluator
      // When plugin-homeostasis IS available, hyperscape contributes:
      // - Domain body with game health, combat, threats as physiological state
      // - Coupling rules that affect psychological drives (low health -> low security)
      // - World context switching on connect/disconnect
      registerHyperscapeDomainBody(runtime);
    });

    logger.info("[HyperscapePlugin] Plugin initialized successfully");
  },

  // Service for managing game connection and state
  services: [HyperscapeService],

  // Providers supply game context to the agent
  // Note: Goal context now provided by plugin-goals via goalsProvider
  providers: [
    gameStateProvider, // Player health, stamina, position, combat status
    inventoryProvider, // Inventory items, coins, free slots
    nearbyEntitiesProvider, // Players, NPCs, resources nearby
    skillsProvider, // Skill levels and XP
    equipmentProvider, // Equipped items
    availableActionsProvider, // Context-aware available actions
    hyperscapeInstructionsProvider, // Plugin usage instructions for LLM
    hyperscapeSettingsProvider, // Current configuration (non-sensitive)
  ],

  // Evaluators assess game state for autonomous decision making
  // Note: Goal evaluation now handled by plugin-goals via criteria-based system
  // Note: Presence now handled by plugin-presence (optional)
  evaluators: [
    survivalEvaluator, // Assess health, threats, survival needs
    explorationEvaluator, // Identify exploration opportunities
    combatEvaluator, // Assess combat opportunities and threats
  ],

  // HTTP API routes for agent management
  routes: [
    callbackRoute,
    statusRoute,
    getSettingsRoute,
    getLogsRoute,
    messageRoute,
    goalRoute,
  ],

  // Actions the agent can perform in the game
  actions: [
    // Goal-oriented actions (highest priority for autonomous behavior)
    setGoalAction, // Set a new goal when none exists
    navigateToAction, // Navigate to goal location

    // Autonomous behavior actions (used by AutonomousBehaviorManager)
    autonomousAttackAction, // Attack nearby mobs (autonomous-friendly)
    exploreAction, // Move to explore new areas
    fleeAction, // Run away from danger
    idleAction, // Stand still and observe
    approachEntityAction, // Move towards a specific entity

    // Movement
    moveToAction,
    followEntityAction,
    stopMovementAction,

    // Combat
    attackEntityAction,
    changeCombatStyleAction,

    // Skills
    chopTreeAction,
    catchFishAction,
    lightFireAction,
    cookFoodAction,

    // Inventory
    equipItemAction,
    useItemAction,
    dropItemAction,

    // Social
    chatMessageAction,
    findPlayerAction, // Search for players by name using presence + history

    // Banking
    bankDepositAction,
    bankWithdrawAction,
  ],

  // Event handlers for storing game events as memories
  events: {
    // Service started - register event handlers
    RUN_STARTED: [
      async (payload) => {
        const runtime = payload.runtime;
        const service =
          runtime.getService<HyperscapeService>("hyperscapeService");

        if (service) {
          // Only register handlers once per service instance
          if (!service.arePluginEventHandlersRegistered()) {
            registerEventHandlers(runtime, service);
            service.markPluginEventHandlersRegistered();
            logger.info(
              "[HyperscapePlugin] Event handlers registered on RUN_STARTED",
            );
          } else {
            logger.debug(
              "[HyperscapePlugin] Event handlers already registered, skipping",
            );
          }
        } else {
          logger.warn(
            "[HyperscapePlugin] HyperscapeService not found, could not register event handlers",
          );
        }
      },
    ],
  },
};

// Default export
export default hyperscapePlugin;

// Export types for external use
export * from "./types.js";
export { HyperscapeService };

// Export content packs
export * from "./content-packs/index.js";
