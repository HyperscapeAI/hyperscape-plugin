/**
 * Survival Evaluator - Assesses health, threats, and survival needs
 *
 * MICRO-LEVEL SURVIVAL:
 * This evaluator runs FIRST to check if the agent needs to take
 * immediate survival actions (flee, heal, etc.)
 *
 * It handles the agent's "reflexes" — immediate tactical decisions
 * like fight-or-flight. This works STANDALONE without homeostasis.
 *
 * MACRO-LEVEL INTEGRATION:
 * When plugin-homeostasis is available, critical events (near-death,
 * death, surrounded) are reported to create lasting emotional impact.
 * This is progressive enhancement — not required for basic operation.
 *
 * @see utils.ts for reportToHomeostasis function
 */

import type { Evaluator, IAgentRuntime, Memory, State } from "@elizaos/core";
import type { HyperscapeService } from "../services/HyperscapeService.js";
import { calculateDistance, reportToHomeostasis } from "./utils.js";

export const survivalEvaluator: Evaluator = {
  name: "SURVIVAL_EVALUATOR",
  description: "Assesses health status and immediate survival needs",
  alwaysRun: true,

  examples: [
    {
      prompt: "Agent has low health and enemies nearby",
      messages: [
        { name: "system", content: { text: "Health: 15/100, Goblin nearby" } },
      ],
      outcome: "Agent should flee or heal immediately",
    },
  ],

  validate: async (runtime: IAgentRuntime, _message: Memory) => {
    const service = runtime.getService<HyperscapeService>("hyperscapeService");
    return !!service?.isConnected() && !!service.getPlayerEntity();
  },

  handler: async (runtime: IAgentRuntime, _message: Memory, state?: State) => {
    const service = runtime.getService<HyperscapeService>("hyperscapeService");
    if (!service) return { success: true };

    const player = service.getPlayerEntity();
    if (!player) return { success: true };

    // Require valid position data for distance calculations
    if (
      !player.position ||
      !Array.isArray(player.position) ||
      player.position.length < 3
    ) {
      return { success: true, text: "Waiting for position data" };
    }

    // Defensive health calculation - handle missing/malformed health data
    const currentHealth =
      player.health?.current ??
      (player as unknown as { hp?: number }).hp ??
      100;
    const maxHealth =
      player.health?.max ??
      (player as unknown as { maxHp?: number }).maxHp ??
      100;
    const healthPercent =
      maxHealth > 0 ? (currentHealth / maxHealth) * 100 : 100;

    const nearbyEntities = service.getNearbyEntities();

    // Check for nearby threats (hostile mobs)
    const threats = nearbyEntities.filter((entity) => {
      if (!("mobType" in entity)) return false;
      if (
        !entity.position ||
        !Array.isArray(entity.position) ||
        entity.position.length < 3
      )
        return false;
      const dist = calculateDistance(
        player.position,
        entity.position as [number, number, number],
      );
      return dist < 15; // Within threat range
    });

    // Build survival assessment
    const facts: string[] = [];
    let urgency: "critical" | "warning" | "safe" = "safe";

    if (healthPercent < 20) {
      facts.push(`CRITICAL: Health is very low (${healthPercent.toFixed(0)}%)`);
      urgency = "critical";
    } else if (healthPercent < 50) {
      facts.push(
        `WARNING: Health is below half (${healthPercent.toFixed(0)}%)`,
      );
      urgency = "warning";
    }

    if (player.inCombat) {
      facts.push(
        `IN COMBAT: Currently fighting ${player.combatTarget || "unknown"}`,
      );
      if (healthPercent < 30) urgency = "critical";
    }

    if (threats.length > 0) {
      facts.push(
        `THREATS NEARBY: ${threats.length} hostile entity/entities within attack range`,
      );
      threats.forEach((t) => {
        const dist = calculateDistance(
          player.position,
          t.position as [number, number, number],
        );
        facts.push(`  - ${t.name} at ${dist.toFixed(0)} units away`);
      });
    }

    // Check alive status - only treat as dead if explicitly false
    // undefined or missing alive property means alive
    const isAlive = player.alive !== false;
    if (!isAlive) {
      facts.push("DEAD: Player is dead and needs to respawn");
      urgency = "critical";
    }

    // Add recommendations based on urgency
    const recommendations: string[] = [];
    if (urgency === "critical" && isAlive) {
      if (healthPercent < 20 && threats.length > 0) {
        recommendations.push("FLEE immediately - health is critical");
      } else if (healthPercent < 20) {
        recommendations.push("Find food or safe area to recover");
      }
    }

    // === PROGRESSIVE ENHANCEMENT: Report to homeostasis if available ===
    // This creates MACRO-level emotional impact from MICRO-level survival events
    // WHY: Near-death experiences should have lasting emotional impact,
    // not just trigger a flee action. The agent should "feel" the danger.
    
    if (!isAlive) {
      // Death is traumatic — report to homeostasis
      void reportToHomeostasis(runtime, 'death', { healthPercent });
    } else if (healthPercent < 20) {
      // Critical health — near-death experience
      void reportToHomeostasis(runtime, 'critical_health', { healthPercent, threats: threats.length });
    } else if (threats.length > 2) {
      // Surrounded by many threats — overwhelming situation
      void reportToHomeostasis(runtime, 'many_threats', { threatCount: threats.length });
    }
    // Note: low_health and in_combat are handled by domain body coupling rules,
    // so we don't double-report them here

    // Store assessment in state for action selection
    if (state) {
      state.survivalAssessment = {
        healthPercent,
        urgency,
        inCombat: player.inCombat ?? false,
        threats: threats.map((t) => t.name),
        alive: isAlive,
      };
      state.survivalFacts = facts;
      state.survivalRecommendations = recommendations;
    }

    return {
      success: true,
      text: facts.join("\n"),
      values: { urgency, healthPercent, threatCount: threats.length },
      data: { facts, recommendations },
    };
  },
};

