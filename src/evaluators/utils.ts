/**
 * Shared utilities for Hyperscape evaluators
 */

import { logger, type IAgentRuntime } from "@elizaos/core";

/**
 * Calculate distance between two positions (2D, ignoring Y)
 */
export function calculateDistance(
  pos1: [number, number, number],
  pos2: [number, number, number],
): number {
  const dx = pos1[0] - pos2[0];
  const dz = pos1[2] - pos2[2];
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Cooldowns for homeostasis reporting to prevent spam
 * Maps event type to last report timestamp
 */
const homeostasisCooldowns: Map<string, number> = new Map();

/**
 * Report a critical survival event to homeostasis (if available)
 * This creates MACRO-level emotional impact from MICRO-level survival events
 *
 * WHY: The survivalEvaluator handles immediate tactical decisions (flee, fight),
 * but these events should also have lasting emotional impact. A near-death
 * experience shouldn't just trigger a flee action — it should make the agent
 * feel anxious, which persists even after they escape to safety.
 */
export async function reportToHomeostasis(
  runtime: IAgentRuntime,
  event: 'critical_health' | 'low_health' | 'in_combat' | 'death' | 'many_threats',
  details?: Record<string, unknown>
): Promise<void> {
  // Check cooldown to prevent spam
  const cooldowns: Record<string, number> = {
    critical_health: 15000,   // 15 seconds
    low_health: 30000,        // 30 seconds
    in_combat: 10000,         // 10 seconds
    death: 60000,             // 1 minute
    many_threats: 20000,      // 20 seconds
  };

  const lastReport = homeostasisCooldowns.get(event) || 0;
  const cooldown = cooldowns[event] || 10000;
  if (Date.now() - lastReport < cooldown) {
    return; // Still in cooldown
  }

  try {
    // Try to get homeostasis service
    const homeostasis = runtime.getService('homeostasis') as {
      proposeDriveDelta?: (
        deltas: Record<string, number>,
        metadata: { source: string; reason: string }
      ) => void;
    } | null;

    if (!homeostasis?.proposeDriveDelta) {
      return; // Homeostasis not available, run standalone
    }

    // Map survival events to psychological drive deltas
    // These are ADDITIONAL to the coupling rules from the domain body
    // Use sparingly — the domain body handles most cases
    const eventDeltas: Record<string, { drive: string; delta: number; reason: string }> = {
      critical_health: { drive: 'security', delta: -10, reason: 'near_death_experience' },
      death: { drive: 'status', delta: -15, reason: 'died_in_game' },
      many_threats: { drive: 'security', delta: -5, reason: 'surrounded_by_enemies' },
      // low_health and in_combat are handled by domain body coupling rules
    };

    const eventConfig = eventDeltas[event];
    if (!eventConfig) return;

    homeostasis.proposeDriveDelta(
      { [eventConfig.drive]: eventConfig.delta },
      { source: 'hyperscape:survivalEvaluator', reason: eventConfig.reason }
    );

    homeostasisCooldowns.set(event, Date.now());
    logger.debug(`[survivalEvaluator] Reported ${event} to homeostasis: ${eventConfig.drive} ${eventConfig.delta}`);

  } catch {
    // Homeostasis not available — this is fine, we're standalone capable
  }
}

