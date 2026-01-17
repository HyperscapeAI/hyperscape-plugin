/**
 * ElizaOS Evaluators for Hyperscape
 *
 * Evaluators run on each decision cycle and add facts/assessments to state.
 * They help the LLM understand the current situation before choosing actions.
 *
 * Architecture:
 * - Each evaluator has validate() to check if it should run
 * - handler() adds facts and recommendations to state
 * - Facts are included in the LLM prompt for action selection
 *
 * MICRO vs MACRO Survival:
 * - survivalEvaluator handles MICRO-level (immediate tactical decisions)
 * - plugin-homeostasis handles MACRO-level (long-term psychological impact)
 * - survivalEvaluator optionally reports to homeostasis if available (progressive enhancement)
 * - Without homeostasis, we still have a competent basic bot
 *
 * INTEGRATION OPPORTUNITIES:
 * - survivalEvaluator → homeostasis (implemented via reportToHomeostasis)
 * - explorationEvaluator → could feed discoveries to plugin-goals
 * - combatEvaluator → could report victories to homeostasis for status boost
 *
 * FILES:
 * - utils.ts: Shared utilities (calculateDistance, reportToHomeostasis)
 * - survivalEvaluator.ts: Health, threats, urgency assessment
 * - explorationEvaluator.ts: Points of interest, exploration suggestions
 * - combatEvaluator.ts: Combat opportunities, mob assessment
 */

// Re-export utilities for use by other modules
export { calculateDistance, reportToHomeostasis } from "./utils.js";

// Re-export individual evaluators
export { survivalEvaluator } from "./survivalEvaluator.js";
export { explorationEvaluator } from "./explorationEvaluator.js";
export { combatEvaluator } from "./combatEvaluator.js";

// Import for combined export
import { survivalEvaluator } from "./survivalEvaluator.js";
import { explorationEvaluator } from "./explorationEvaluator.js";
import { combatEvaluator } from "./combatEvaluator.js";

// Export all evaluators as array for plugin registration
export const evaluators = [
  survivalEvaluator,
  explorationEvaluator,
  combatEvaluator,
];
