/**
 * Hyperscape Goal Templates
 * 
 * Predefined goal templates for common game objectives.
 * These templates are registered with the goals plugin's DomainRegistry
 * and used to suggest goals based on current game state.
 */

import type { GoalTemplate } from '@elizaos/plugin-goals';

/**
 * Location definition for known game locations
 */
export interface LocationDef {
  position: [number, number, number];
  description: string;
}

/**
 * Known locations in the Hyperscape game world
 */
export const KNOWN_LOCATIONS: Record<string, LocationDef> = {
  spawn: {
    position: [0, 0, 0],
    description: 'Spawn area where goblins roam - good for combat training',
  },
  forest: {
    position: [-130, 30, 400],
    description: 'Western forest with plenty of trees for woodcutting',
  },
};

/**
 * Combat training goal templates
 */
const combatTemplates: GoalTemplate[] = [
  {
    id: 'train_attack',
    domain: 'hyperscape',
    name: 'Train Attack',
    description: 'Train attack skill by fighting goblins',
    goalType: 'objective',
    checkAfterMs: 5000,      // Start checking after 5 seconds
    checkIntervalMs: 3000,   // Check every 3 seconds
    criteria: {
      type: 'counter',
      domain: 'hyperscape',
      counter: {
        path: 'player.skills.attack.level',
        target: 0,  // Will be set dynamically when goal is created
        initial: 0,
      },
    },
    recommendedAction: { action: 'ATTACK_ENTITY', params: { targetType: 'goblin' } },
    priority: 80,
    availableWhen: {
      path: 'player.health.percent',
      op: '>',
      value: 30,
    },
    metadata: {
      location: 'spawn',
      targetEntity: 'goblin',
      skillType: 'attack',
    },
  },
  {
    id: 'train_strength',
    domain: 'hyperscape',
    name: 'Train Strength',
    description: 'Train strength skill by fighting goblins',
    goalType: 'objective',
    checkAfterMs: 5000,
    checkIntervalMs: 3000,
    criteria: {
      type: 'counter',
      domain: 'hyperscape',
      counter: {
        path: 'player.skills.strength.level',
        target: 0,
        initial: 0,
      },
    },
    recommendedAction: { action: 'ATTACK_ENTITY', params: { targetType: 'goblin' } },
    priority: 75,
    availableWhen: {
      path: 'player.health.percent',
      op: '>',
      value: 30,
    },
    metadata: {
      location: 'spawn',
      targetEntity: 'goblin',
      skillType: 'strength',
    },
  },
  {
    id: 'train_defense',
    domain: 'hyperscape',
    name: 'Train Defense',
    description: 'Train defense skill by fighting goblins',
    goalType: 'objective',
    checkAfterMs: 5000,
    checkIntervalMs: 3000,
    criteria: {
      type: 'counter',
      domain: 'hyperscape',
      counter: {
        path: 'player.skills.defense.level',
        target: 0,
        initial: 0,
      },
    },
    recommendedAction: { action: 'ATTACK_ENTITY', params: { targetType: 'goblin' } },
    priority: 70,
    availableWhen: {
      path: 'player.health.percent',
      op: '>',
      value: 30,
    },
    metadata: {
      location: 'spawn',
      targetEntity: 'goblin',
      skillType: 'defense',
    },
  },
];

/**
 * Resource gathering goal templates
 */
const gatheringTemplates: GoalTemplate[] = [
  {
    id: 'train_woodcutting',
    domain: 'hyperscape',
    name: 'Train Woodcutting',
    description: 'Train woodcutting by chopping trees in the forest',
    goalType: 'objective',
    checkAfterMs: 5000,
    checkIntervalMs: 5000,   // Check less frequently for gathering
    criteria: {
      type: 'counter',
      domain: 'hyperscape',
      counter: {
        path: 'player.skills.woodcutting.level',
        target: 0,
        initial: 0,
      },
    },
    recommendedAction: { action: 'GATHER_RESOURCE', params: { resourceType: 'tree' } },
    priority: 60,
    metadata: {
      location: 'forest',
      targetEntity: 'tree',
      skillType: 'woodcutting',
    },
  },
  {
    id: 'train_fishing',
    domain: 'hyperscape',
    name: 'Train Fishing',
    description: 'Train fishing skill at fishing spots',
    goalType: 'objective',
    checkAfterMs: 5000,
    checkIntervalMs: 5000,
    criteria: {
      type: 'counter',
      domain: 'hyperscape',
      counter: {
        path: 'player.skills.fishing.level',
        target: 0,
        initial: 0,
      },
    },
    recommendedAction: { action: 'GATHER_RESOURCE', params: { resourceType: 'fishing_spot' } },
    priority: 55,
    metadata: {
      skillType: 'fishing',
    },
  },
];

/**
 * Exploration and survival goal templates
 */
const explorationTemplates: GoalTemplate[] = [
  {
    id: 'explore_world',
    domain: 'hyperscape',
    name: 'Explore the World',
    description: 'Discover new areas and learn the map',
    goalType: 'objective',
    checkAfterMs: 30000,     // Start checking after 30 seconds
    checkIntervalMs: 60000,  // Check every minute (exploration is manual/LLM tracked)
    criteria: {
      type: 'manual',
      domain: 'hyperscape',
    },
    recommendedAction: { action: 'EXPLORE' },
    priority: 30,
    metadata: {
      goalCategory: 'exploration',
    },
  },
  {
    id: 'recover_health',
    domain: 'hyperscape',
    name: 'Recover Health',
    description: 'Rest and recover health before continuing',
    goalType: 'milestone',
    checkAfterMs: 1000,
    checkIntervalMs: 2000,   // Check frequently for health recovery
    criteria: {
      type: 'condition',
      domain: 'hyperscape',
      condition: {
        path: 'player.health.percent',
        op: '>=',
        value: 80,
      },
    },
    recommendedAction: { action: 'IDLE', params: { reason: 'recovering' } },
    priority: 95,  // High priority when health is low
    availableWhen: {
      path: 'player.health.percent',
      op: '<',
      value: 30,
    },
    metadata: {
      goalCategory: 'survival',
    },
  },
];

/**
 * All hyperscape goal templates
 */
export const hyperscapeGoalTemplates: GoalTemplate[] = [
  ...combatTemplates,
  ...gatheringTemplates,
  ...explorationTemplates,
];

/**
 * Get goal templates by category
 */
export function getTemplatesByCategory(category: 'combat' | 'gathering' | 'exploration'): GoalTemplate[] {
  switch (category) {
    case 'combat':
      return combatTemplates;
    case 'gathering':
      return gatheringTemplates;
    case 'exploration':
      return explorationTemplates;
    default:
      return [];
  }
}

/**
 * Get a template by ID
 */
export function getTemplateById(id: string): GoalTemplate | undefined {
  return hyperscapeGoalTemplates.find(t => t.id === id);
}

export default hyperscapeGoalTemplates;

