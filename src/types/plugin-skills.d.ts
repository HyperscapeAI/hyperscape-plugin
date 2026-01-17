/**
 * Type declarations for @elizaos/plugin-skills
 * 
 * WHY THIS FILE EXISTS:
 * plugin-skills is an OPTIONAL peer dependency. When it's not installed,
 * TypeScript would fail to compile because the types don't exist.
 * 
 * This file provides the minimum type declarations needed for our
 * progressive enhancement pattern - we can reference the types without
 * requiring the actual package to be installed.
 * 
 * WHEN TO UPDATE:
 * If plugin-skills adds new types we need, add them here.
 * Keep this in sync with the actual plugin-skills types.
 */

declare module '@elizaos/plugin-skills' {
  /** Namespaced skill identifier */
  export type SkillId = string;

  /** Skill proficiency category */
  export type SkillCategory = 'none' | 'novice' | 'apprentice' | 'journeyman' | 'expert' | 'master';

  /** How the skill was acquired */
  export type SkillSource = 'innate' | 'learned' | 'earned' | 'granted' | 'temporary';

  /** Skill level/proficiency */
  export interface SkillLevel {
    numeric?: number;
    maxLevel?: number;
    category?: SkillCategory;
    experience?: number;
    experienceToNext?: number;
  }

  /** A single skill entry */
  export interface SkillEntry {
    id: SkillId;
    domain: string;
    name: string;
    displayName?: string;
    description?: string;
    level: SkillLevel;
    acquiredAt?: number;
    lastUsedAt?: number;
    source?: SkillSource;
    active: boolean;
    metadata?: Record<string, unknown>;
  }

  /** Partial skill update */
  export interface SkillUpdate {
    displayName?: string;
    description?: string;
    level?: Partial<SkillLevel>;
    active?: boolean;
    lastUsedAt?: number;
    metadata?: Record<string, unknown>;
  }

  /** Skill change event */
  export interface SkillChangeEvent {
    type: 'registered' | 'updated' | 'removed';
    skillId: SkillId;
    skill?: SkillEntry;
    source: 'direct' | 'provider';
  }

  /** Skill change listener */
  export type SkillChangeListener = (event: SkillChangeEvent) => void;

  /** Skill source interface for domain plugins */
  export interface SkillSource_Provider {
    domain: string;
    displayName: string;
    getSkills(): SkillEntry[];
    getSkill?(skillName: string): SkillEntry | null;
    hasSkill?(skillName: string, minLevel?: number): boolean;
  }

  /** Search criteria */
  export interface SkillSearchCriteria {
    domain?: string;
    minLevel?: number;
    minCategory?: SkillCategory;
    source?: SkillSource;
    activeOnly?: boolean;
    query?: string;
    limit?: number;
  }

  /** Skills service */
  export interface SkillsService {
    // Source registration (read-only aggregation)
    registerSource(source: SkillSource_Provider): void;
    unregisterSource(domain: string): void;
    getRegisteredDomains(): string[];
    
    // Direct skill registration (writable)
    registerSkill(skill: SkillEntry): SkillEntry;
    updateSkill(skillId: SkillId, updates: SkillUpdate): SkillEntry | null;
    removeSkill(skillId: SkillId): boolean;
    isDirectSkill(skillId: SkillId): boolean;
    getDirectSkills(): SkillEntry[];
    
    // Event subscription
    onSkillChange(listener: SkillChangeListener): () => void;
    
    // Queries
    getAllSkills(): SkillEntry[];
    getSkillsByDomain(domain: string): SkillEntry[];
    getSkill(skillId: SkillId): SkillEntry | null;
    hasSkill(skillId: SkillId, minLevel?: number): boolean;
    hasSkillCategory(skillId: SkillId, minCategory: SkillCategory): boolean;
    searchSkills(criteria: SkillSearchCriteria): SkillEntry[];
    getTopSkills(limit?: number): SkillEntry[];
    getSkillsSummary(): Map<string, { total: number; topSkills: SkillEntry[] }>;
  }
}
