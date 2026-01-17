/**
 * Combat Evaluator - Assesses combat opportunities and threats
 *
 * Identifies potential combat targets and assesses combat situations.
 * Provides recommendations based on health and nearby mobs.
 *
 * INTEGRATION NOTES:
 * - Combat outcomes could feed into plugin-homeostasis (victory → status boost)
 * - Kill tracking feeds into plugin-goals domain evaluator
 * - Combat skill progression could inform plugin-discovery capabilities
 */

import type { Evaluator, IAgentRuntime, Memory, State } from "@elizaos/core";
import type { HyperscapeService } from "../services/HyperscapeService.js";
import { calculateDistance } from "./utils.js";

export const combatEvaluator: Evaluator = {
  name: "COMBAT_EVALUATOR",
  description: "Identifies combat opportunities and assesses combat situations",
  alwaysRun: true,

  examples: [
    {
      prompt: "Weak mobs nearby that agent could fight",
      messages: [
        {
          name: "system",
          content: { text: "Level 2 Goblin nearby, agent is level 10" },
        },
      ],
      outcome: "Agent could engage the goblin for combat training",
    },
  ],

  validate: async (runtime: IAgentRuntime, _message: Memory) => {
    const service = runtime.getService<HyperscapeService>("hyperscapeService");
    if (!service?.isConnected()) return false;

    const player = service.getPlayerEntity();
    // Only treat as dead if explicitly false
    return !!player && player.alive !== false;
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

    const nearbyEntities = service.getNearbyEntities();
    // Filter mobs with valid positions
    const mobs = nearbyEntities.filter(
      (e) =>
        "mobType" in e &&
        e.position &&
        Array.isArray(e.position) &&
        e.position.length >= 3,
    );

    const facts: string[] = [];

    // Current combat status
    if (player.inCombat) {
      facts.push(
        `Currently in combat with: ${player.combatTarget || "unknown"}`,
      );
      facts.push(`Combat style: ${player.combatStyle || "melee"}`);
    }

    // Nearby mobs
    const mobsWithDistance = mobs.map((mob) => ({
      ...mob,
      distance: calculateDistance(
        player.position,
        mob.position as [number, number, number],
      ),
    }));

    const nearbyMobs = mobsWithDistance.filter((m) => m.distance < 30);
    if (nearbyMobs.length > 0) {
      facts.push(`Potential combat targets nearby:`);
      nearbyMobs.forEach((mob) => {
        const mobEntity = mob as unknown as {
          name: string;
          level?: number;
          alive?: boolean;
        };
        const level = mobEntity.level ? ` (Level ${mobEntity.level})` : "";
        const status = mobEntity.alive === false ? " [DEAD]" : "";
        facts.push(
          `  - ${mob.name}${level}${status} at ${mob.distance.toFixed(0)} units`,
        );
      });
    }

    // Combat recommendations based on health - defensive calculation
    const currentHealth = player.health?.current ?? 100;
    const maxHealth = player.health?.max ?? 100;
    const healthPercent =
      maxHealth > 0 ? (currentHealth / maxHealth) * 100 : 100;
    const recommendations: string[] = [];

    if (player.inCombat && healthPercent < 30) {
      recommendations.push("FLEE - health is critically low!");
    } else if (
      !player.inCombat &&
      healthPercent > 50 &&
      nearbyMobs.length > 0
    ) {
      const aliveMobs = nearbyMobs.filter(
        (m) => (m as unknown as { alive?: boolean }).alive !== false,
      );
      if (aliveMobs.length > 0) {
        const nearest = aliveMobs[0];
        recommendations.push(
          `ATTACK_ENTITY recommended - ${nearest.name} is nearby and you have ${healthPercent.toFixed(0)}% health`,
        );
        facts.push(
          `** COMBAT OPPORTUNITY: Use ATTACK_ENTITY to fight ${nearest.name} **`,
        );
      }
    } else if (
      !player.inCombat &&
      healthPercent <= 50 &&
      nearbyMobs.length > 0
    ) {
      recommendations.push("Avoid combat - health is below 50%");
    }

    if (state) {
      state.combatAssessment = {
        inCombat: player.inCombat,
        combatTarget: player.combatTarget,
        combatStyle: player.combatStyle,
        nearbyMobs: nearbyMobs.map((m) => ({
          name: m.name,
          id: m.id,
          distance: m.distance,
        })),
        healthPercent,
      };
      state.combatFacts = facts;
      state.combatRecommendations = recommendations;
    }

    return {
      success: true,
      text: facts.join("\n"),
      values: { inCombat: player.inCombat, nearbyMobCount: nearbyMobs.length },
      data: { facts, recommendations },
    };
  },
};

