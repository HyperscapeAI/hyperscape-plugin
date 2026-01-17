/**
 * Hyperscape Goals Module
 * 
 * Provides goal domain evaluation and templates for the Hyperscape game.
 */

export { hyperscapeDomainEvaluator } from './domain.js';
export { hyperscapeGoalTemplates, KNOWN_LOCATIONS, getTemplateById, getTemplatesByCategory } from './templates.js';

import type { HyperscapeService } from '../services/HyperscapeService.js';
import { hyperscapeGoalTemplates } from './templates.js';

/**
 * Goal option for backward compatibility with old goalProvider
 */
export interface GoalOption {
  id: string;
  type: 'combat_training' | 'woodcutting' | 'exploration' | 'idle';
  description: string;
  targetSkill?: string;
  targetSkillLevel?: number;
  targetEntity?: string;
  location?: string;
  priority: number;
  reason: string;
}

/**
 * Get available goals based on current game state
 * Backward-compatible wrapper that uses the new templates system
 */
export function getAvailableGoals(service: HyperscapeService): GoalOption[] {
  const goals: GoalOption[] = [];
  const player = service.getPlayerEntity();
  
  if (!player) {
    return goals;
  }

  // Get current skill levels
  const skills = player.skills;
  const attackLevel = skills?.attack?.level ?? 1;
  const strengthLevel = skills?.strength?.level ?? 1;
  const defenseLevel = skills?.defense?.level ?? skills?.defence?.level ?? 1;
  const woodcuttingLevel = skills?.woodcutting?.level ?? 1;

  // Get health status
  const healthPercent = player.health
    ? (player.health.current / player.health.max) * 100
    : 100;

  // Get nearby entities
  const nearbyEntities = service.getNearbyEntities();
  const hasGoblins = nearbyEntities.some((e) =>
    e.name?.toLowerCase().includes('goblin')
  );
  const hasTrees = nearbyEntities.some((e) =>
    e.name?.toLowerCase().includes('tree')
  );

  // Combat training goals (only if health is decent)
  if (healthPercent >= 30) {
    // Attack training
    goals.push({
      id: 'train_attack',
      type: 'combat_training',
      description: `Train attack from ${attackLevel} to ${attackLevel + 2} by killing goblins`,
      targetSkill: 'attack',
      targetSkillLevel: attackLevel + 2,
      targetEntity: 'goblin',
      location: 'spawn',
      priority: hasGoblins ? 80 : 60,
      reason: hasGoblins
        ? 'Goblins nearby - great for attack training!'
        : 'Goblins at spawn area for attack training',
    });

    // Strength training
    goals.push({
      id: 'train_strength',
      type: 'combat_training',
      description: `Train strength from ${strengthLevel} to ${strengthLevel + 2} by killing goblins`,
      targetSkill: 'strength',
      targetSkillLevel: strengthLevel + 2,
      targetEntity: 'goblin',
      location: 'spawn',
      priority: hasGoblins ? 75 : 55,
      reason: hasGoblins
        ? 'Goblins nearby - good for strength training'
        : 'Train strength on goblins at spawn',
    });

    // Defense training
    goals.push({
      id: 'train_defence',
      type: 'combat_training',
      description: `Train defence from ${defenseLevel} to ${defenseLevel + 2} by killing goblins`,
      targetSkill: 'defence',
      targetSkillLevel: defenseLevel + 2,
      targetEntity: 'goblin',
      location: 'spawn',
      priority: hasGoblins ? 70 : 50,
      reason: 'Train defence by taking hits from goblins',
    });
  }

  // Woodcutting goal
  goals.push({
    id: 'train_woodcutting',
    type: 'woodcutting',
    description: `Train woodcutting from ${woodcuttingLevel} to ${woodcuttingLevel + 2} by chopping trees in the forest`,
    targetSkill: 'woodcutting',
    targetSkillLevel: woodcuttingLevel + 2,
    targetEntity: 'tree',
    location: 'forest',
    priority: hasTrees ? 65 : 40,
    reason: hasTrees
      ? 'Trees nearby - safe way to train'
      : 'Head to the western forest for woodcutting',
  });

  // Exploration goal (good when health is low)
  goals.push({
    id: 'explore',
    type: 'exploration',
    description: 'Explore the world and discover new areas',
    location: 'spawn',
    priority: healthPercent < 50 ? 90 : 30, // High priority when hurt
    reason:
      healthPercent < 50
        ? 'Health is low - explore safely while recovering'
        : 'Discover new areas and resources',
  });

  // Idle/rest goal (when health is very low)
  if (healthPercent < 30) {
    goals.push({
      id: 'rest',
      type: 'idle',
      description: 'Rest and recover health before continuing',
      priority: 95,
      reason: 'Health critically low - rest to recover',
    });
  }

  // Sort by priority (highest first)
  return goals.sort((a, b) => b.priority - a.priority);
}

