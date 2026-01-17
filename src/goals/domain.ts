/**
 * Hyperscape Domain Evaluator
 * 
 * Provides goal evaluation capabilities for the Hyperscape game domain.
 * Implements the DomainEvaluator interface from plugin-goals.
 */

import type { HyperscapeService } from '../services/HyperscapeService.js';

/**
 * Generic runtime interface for cross-package compatibility
 */
interface RuntimeLike {
  getService<T>(name: string): T | undefined;
  agentId: string;
}

/**
 * Goal data structure (simplified for domain evaluator)
 */
interface GoalDataLike {
  id: string;
  name: string;
  description?: string | null;
  progress: number;
  status: string;
  criteria?: {
    type: 'manual' | 'condition' | 'counter';
    domain?: string;
    condition?: { path: string; op: string; value?: unknown };
    counter?: { path: string; target: number; initial?: number };
  } | null;
  recommendedAction?: { action: string; params?: Record<string, unknown> } | null;
  metadata: Record<string, unknown>;
}

/**
 * Action hint type
 */
interface ActionHintLike {
  action: string;
  params?: Record<string, unknown>;
}

/**
 * Domain evaluator interface (local definition for cross-package compatibility)
 */
interface DomainEvaluatorLike {
  getValue(path: string, runtime: RuntimeLike): unknown;
  getRecommendedAction?(goal: GoalDataLike, runtime: RuntimeLike): ActionHintLike | null;
}

/**
 * Get a nested value from an object using dot notation path
 * e.g., getValue(obj, 'player.skills.attack.level')
 */
function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Hyperscape domain evaluator implementation
 */
export const hyperscapeDomainEvaluator: DomainEvaluatorLike = {
  /**
   * Get current value at a path in the Hyperscape game state
   * 
   * Supported paths:
   * - player.health.current, player.health.max, player.health.percent
   * - player.stamina.current, player.stamina.max
   * - player.skills.<skill>.level, player.skills.<skill>.xp
   * - player.position (array [x, y, z])
   * - player.alive
   * - player.inCombat
   * - player.coins
   * - nearby.<count> (number of nearby entities)
   * - nearby.mobs (array of mob entities)
   * - nearby.resources (array of resource entities)
   * - nearby.players (array of player entities)
   */
  getValue(path: string, runtime: RuntimeLike): unknown {
    const service = runtime.getService<HyperscapeService>('hyperscapeService');
    if (!service) {
      return undefined;
    }

    const player = service.getPlayerEntity();
    const nearbyEntities = service.getNearbyEntities();

    // Build state object for path traversal
    const state: Record<string, unknown> = {
      player: player ? {
        ...player,
        health: player.health ? {
          ...player.health,
          percent: player.health.max > 0 
            ? Math.round((player.health.current / player.health.max) * 100) 
            : 0,
        } : null,
      } : null,
      nearby: {
        count: nearbyEntities.length,
        mobs: nearbyEntities.filter(e => 'mobType' in e),
        resources: nearbyEntities.filter(e => 'resourceType' in e),
        players: nearbyEntities.filter(e => 'playerId' in e && e.id !== player?.id),
        all: nearbyEntities,
      },
    };

    return getNestedValue(state, path);
  },

  /**
   * Get recommended action for a goal based on current game state
   */
  getRecommendedAction(goal: GoalDataLike, runtime: RuntimeLike): ActionHintLike | null {
    // If goal already has explicit recommendation, use it
    if (goal.recommendedAction) {
      return goal.recommendedAction;
    }

    const service = runtime.getService<HyperscapeService>('hyperscapeService');
    if (!service) {
      return null;
    }

    const player = service.getPlayerEntity();
    const nearbyEntities = service.getNearbyEntities();
    const criteria = goal.criteria;

    // Health-based recommendations
    if (player && player.health) {
      const healthPercent = (player.health.current / player.health.max) * 100;
      if (healthPercent < 20) {
        // Very low health - prioritize survival
        return { action: 'EXPLORE', params: { reason: 'low_health' } };
      }
    }

    // Counter-based goals (skill training)
    if (criteria?.type === 'counter' && criteria.counter?.path) {
      const counterPath = criteria.counter.path;

      // Attack/combat skill training
      if (counterPath.includes('skills.attack') || 
          counterPath.includes('skills.strength') || 
          counterPath.includes('skills.defense') ||
          counterPath.includes('skills.constitution')) {
        
        // Look for mobs to fight
        const mobs = nearbyEntities.filter(e => 'mobType' in e && (e as any).alive !== false);
        
        if (mobs.length > 0) {
          // Find goblin or lowest level mob
          const goblin = mobs.find(m => m.name?.toLowerCase().includes('goblin'));
          const target = goblin || mobs[0];
          return { 
            action: 'ATTACK_ENTITY', 
            params: { targetId: target.id, targetName: target.name } 
          };
        }
        
        // No mobs nearby - explore to find them
        return { action: 'EXPLORE', params: { reason: 'find_mobs' } };
      }

      // Woodcutting skill training
      if (counterPath.includes('skills.woodcutting')) {
        const trees = nearbyEntities.filter(e => 
          'resourceType' in e && 
          (e as any).resourceType?.toLowerCase().includes('tree')
        );
        
        if (trees.length > 0) {
          return { 
            action: 'GATHER_RESOURCE', 
            params: { targetId: trees[0].id, resourceType: 'tree' } 
          };
        }
        
        // No trees nearby - go to forest
        return { action: 'MOVE_TO', params: { location: 'forest' } };
      }

      // Fishing skill training
      if (counterPath.includes('skills.fishing')) {
        const fishingSpots = nearbyEntities.filter(e => 
          'resourceType' in e && 
          (e as any).resourceType?.toLowerCase().includes('fish')
        );
        
        if (fishingSpots.length > 0) {
          return { 
            action: 'GATHER_RESOURCE', 
            params: { targetId: fishingSpots[0].id, resourceType: 'fishing_spot' } 
          };
        }
        
        return { action: 'EXPLORE', params: { reason: 'find_fishing_spots' } };
      }
    }

    // Condition-based goals
    if (criteria?.type === 'condition' && criteria.condition?.path) {
      const condPath = criteria.condition.path;

      // Health recovery
      if (condPath.includes('health')) {
        // Rest/wait for health recovery
        return { action: 'IDLE', params: { reason: 'recovering_health' } };
      }

      // Level-based goals
      if (condPath.includes('skills')) {
        // Generic skill training - try combat first
        const mobs = nearbyEntities.filter(e => 'mobType' in e);
        if (mobs.length > 0) {
          return { action: 'ATTACK_ENTITY', params: { targetId: mobs[0].id } };
        }
        return { action: 'EXPLORE' };
      }
    }

    // Default: explore
    return { action: 'EXPLORE' };
  },
};

export default hyperscapeDomainEvaluator;

