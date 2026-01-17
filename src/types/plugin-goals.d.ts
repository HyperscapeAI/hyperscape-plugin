/**
 * Type declarations for @elizaos/plugin-goals
 * Used for dynamic imports
 */
declare module '@elizaos/plugin-goals' {
  export interface GoalCriteria {
    type: 'manual' | 'condition' | 'counter';
    domain?: string;
    condition?: { path: string; op: string; value?: unknown };
    counter?: { path: string; target: number; initial?: number };
  }

  export interface ActionHint {
    action: string;
    params?: Record<string, unknown>;
  }

  export interface GoalData {
    id: string;
    agentId: string;
    ownerType: 'agent' | 'entity';
    ownerId: string;
    parentId?: string | null;
    name: string;
    description?: string | null;
    goalType: 'mission' | 'objective' | 'milestone';
    progress: number;
    priority: number;
    status: 'active' | 'completed' | 'paused' | 'cancelled';
    isCompleted: boolean;
    completedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
    metadata: Record<string, unknown>;
    tags?: string[];
    criteria?: GoalCriteria | null;
    checkAfterMs?: number | null;
    checkIntervalMs?: number | null;
    lastCheckedAt?: Date | null;
    expiresAt?: Date | null;
    recommendedAction?: ActionHint | null;
  }

  export interface GoalTemplate {
    id: string;
    domain: string;
    name: string;
    description?: string;
    goalType: 'mission' | 'objective' | 'milestone';
    checkAfterMs: number;
    checkIntervalMs: number;
    criteria: GoalCriteria;
    recommendedAction?: ActionHint;
    priority: number;
    availableWhen?: GoalCriteria['condition'];
    metadata?: Record<string, unknown>;
  }

  export interface DomainEvaluator {
    getValue(path: string, runtime: unknown): unknown;
    getRecommendedAction?(goal: GoalData, runtime: unknown): ActionHint | null;
  }

  export class DomainRegistry {
    static serviceName: string;
    register(domain: string, evaluator: DomainEvaluator): void;
    registerTemplates(domain: string, templates: GoalTemplate[]): void;
    getSuggestions(runtime: unknown): GoalTemplate[];
    getRecommendedAction(goal: GoalData, runtime: unknown): ActionHint | null;
  }
}

