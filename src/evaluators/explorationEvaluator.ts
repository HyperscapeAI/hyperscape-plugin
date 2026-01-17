/**
 * Exploration Evaluator - Assesses exploration opportunities
 *
 * Runs when the agent is safe and could explore. Identifies points
 * of interest (resources, players) and suggests exploration directions.
 *
 * FUTURE INTEGRATION OPPORTUNITIES:
 * - Could feed discovered locations to plugin-goals as exploration objectives
 * - Resource locations could inform plugin-commerce about gathering opportunities
 * - Player locations feed into plugin-presence via registerHyperscapePresenceSource
 */

import type { Evaluator, IAgentRuntime, Memory, State } from "@elizaos/core";
import type { HyperscapeService } from "../services/HyperscapeService.js";
import { calculateDistance } from "./utils.js";

export const explorationEvaluator: Evaluator = {
  name: "EXPLORATION_EVALUATOR",
  description: "Identifies exploration opportunities and interesting locations",
  alwaysRun: true,

  examples: [
    {
      prompt: "Agent is idle with no threats nearby",
      messages: [
        {
          name: "system",
          content: { text: "Safe area, no combat, high health" },
        },
      ],
      outcome: "Agent should consider exploring",
    },
  ],

  validate: async (runtime: IAgentRuntime, _message: Memory) => {
    const service = runtime.getService<HyperscapeService>("hyperscapeService");
    if (!service?.isConnected()) return false;

    const player = service.getPlayerEntity();
    if (!player) return false;

    // Require valid position data
    if (
      !player.position ||
      !Array.isArray(player.position) ||
      player.position.length < 3
    ) {
      return false;
    }

    // Only treat as dead if explicitly false
    if (player.alive === false) return false;

    // Only run exploration evaluator when not in immediate danger
    const currentHealth = player.health?.current ?? 100;
    const maxHealth = player.health?.max ?? 100;
    const healthPercent =
      maxHealth > 0 ? (currentHealth / maxHealth) * 100 : 100;
    return healthPercent > 30 && !player.inCombat;
  },

  handler: async (runtime: IAgentRuntime, _message: Memory, state?: State) => {
    const service = runtime.getService<HyperscapeService>("hyperscapeService");
    if (!service) return { success: true };

    const player = service.getPlayerEntity();
    if (!player) return { success: true };

    // Require valid position data
    if (
      !player.position ||
      !Array.isArray(player.position) ||
      player.position.length < 3
    ) {
      return { success: true, text: "Waiting for position data" };
    }

    const nearbyEntities = service.getNearbyEntities();
    const facts: string[] = [];

    // Categorize nearby entities
    const players = nearbyEntities.filter(
      (e) => "playerId" in e && e.id !== player.id,
    );
    const mobs = nearbyEntities.filter((e) => "mobType" in e);
    const resources = nearbyEntities.filter((e) => "resourceType" in e);

    // Identify points of interest
    const pointsOfInterest: Array<{
      type: string;
      name: string;
      position: [number, number, number];
      distance: number;
    }> = [];

    // Add resources as POIs
    for (const resource of resources) {
      if (
        !resource.position ||
        !Array.isArray(resource.position) ||
        resource.position.length < 3
      )
        continue;
      const dist = calculateDistance(
        player.position,
        resource.position as [number, number, number],
      );
      if (dist < 50) {
        pointsOfInterest.push({
          type: "resource",
          name: resource.name,
          position: resource.position as [number, number, number],
          distance: dist,
        });
      }
    }

    // Add other players as social POIs
    for (const p of players) {
      if (!p.position || !Array.isArray(p.position) || p.position.length < 3)
        continue;
      const dist = calculateDistance(
        player.position,
        p.position as [number, number, number],
      );
      if (dist < 100) {
        pointsOfInterest.push({
          type: "player",
          name: p.name,
          position: p.position as [number, number, number],
          distance: dist,
        });
      }
    }

    // Generate exploration suggestions
    facts.push(
      `Current position: [${player.position[0].toFixed(1)}, ${player.position[2].toFixed(1)}]`,
    );

    if (pointsOfInterest.length > 0) {
      facts.push(`Points of interest nearby:`);
      pointsOfInterest.slice(0, 5).forEach((poi) => {
        facts.push(
          `  - ${poi.type}: ${poi.name} (${poi.distance.toFixed(0)} units away)`,
        );
      });
    } else {
      facts.push(
        "No specific points of interest nearby - open area for exploration",
      );
    }

    // Generate random exploration direction suggestion
    const directions = [
      { name: "north", dx: 0, dz: 25 },
      { name: "south", dx: 0, dz: -25 },
      { name: "east", dx: 25, dz: 0 },
      { name: "west", dx: -25, dz: 0 },
      { name: "northeast", dx: 18, dz: 18 },
      { name: "northwest", dx: -18, dz: 18 },
      { name: "southeast", dx: 18, dz: -18 },
      { name: "southwest", dx: -18, dz: -18 },
    ];
    const suggestion =
      directions[Math.floor(Math.random() * directions.length)];
    const suggestedTarget: [number, number, number] = [
      player.position[0] + suggestion.dx,
      player.position[1],
      player.position[2] + suggestion.dz,
    ];

    facts.push(
      `Exploration suggestion: head ${suggestion.name} towards [${suggestedTarget[0].toFixed(1)}, ${suggestedTarget[2].toFixed(1)}]`,
    );

    // Store in state
    if (state) {
      state.explorationAssessment = {
        currentPosition: player.position,
        pointsOfInterest,
        suggestedDirection: suggestion.name,
        suggestedTarget,
        nearbyPlayerCount: players.length,
        nearbyResourceCount: resources.length,
        nearbyMobCount: mobs.length,
      };
      state.explorationFacts = facts;
    }

    return {
      success: true,
      text: facts.join("\n"),
      values: {
        poiCount: pointsOfInterest.length,
        suggestedDirection: suggestion.name,
      },
      data: { facts, pointsOfInterest, suggestedTarget },
    };
  },
};

