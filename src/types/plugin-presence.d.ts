/**
 * Type declarations for @elizaos/plugin-presence
 * 
 * WHY THIS FILE EXISTS:
 * plugin-presence is an OPTIONAL peer dependency. When it's not installed,
 * TypeScript would fail to compile because the types don't exist.
 * 
 * This file provides the minimum type declarations needed for our
 * progressive enhancement pattern - we can reference the types without
 * requiring the actual package to be installed.
 * 
 * WHEN TO UPDATE:
 * If plugin-presence adds new types we need, add them here.
 * Keep this in sync with the actual plugin-presence types.
 */

declare module '@elizaos/plugin-presence' {
  import type { UUID } from '@elizaos/core';

  /** Presence status */
  export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline' | 'unknown';

  /** Context for presence entries */
  export interface PresenceContext {
    location?: string | [number, number, number];
    activity?: string;
    distance?: number;
    metadata?: Record<string, unknown>;
  }

  /** A single presence entry */
  export interface PresenceEntry {
    entityId: string;
    displayName?: string;
    domain: string;
    status: PresenceStatus;
    context?: PresenceContext;
    lastSeen: number;
    ttlMs?: number;
    rolodexEntityId?: UUID;
  }

  /** Historical presence record */
  export interface PresenceHistoryEntry {
    entityId: string;
    displayName?: string;
    domain: string;
    lastLocation?: string | [number, number, number];
    lastActivity?: string;
    firstSeenAt: number;
    lastSeenAt: number;
    sightingCount: number;
    rolodexEntityId?: UUID;
  }

  /** Name-based search query */
  export interface PresenceNameQuery {
    name: string;
    domain?: string;
    includeHistory?: boolean;
    minSightings?: number;
  }

  /** Search result */
  export interface PresenceSearchResult {
    entityId: string;
    displayName?: string;
    domain: string;
    matchConfidence: number;
    currentPresence?: PresenceEntry;
    history?: PresenceHistoryEntry;
    matchType: 'exact' | 'partial' | 'fuzzy';
  }

  /** Presence source interface for domain plugins */
  export interface PresenceSource {
    domain: string;
    displayName: string;
    getPresence(): PresenceEntry[];
    getPresenceById?(entityId: string): PresenceEntry | null;
    searchPresence?(criteria: PresenceSearchCriteria): PresenceEntry[];
  }

  /** Search criteria */
  export interface PresenceSearchCriteria {
    status?: PresenceStatus | PresenceStatus[];
    maxDistance?: number;
    activity?: string;
    linkedOnly?: boolean;
    limit?: number;
  }

  /** Presence service */
  export interface PresenceService {
    // Source registration
    registerSource(source: PresenceSource): void;
    unregisterSource(domain: string): void;
    getRegisteredDomains(): string[];
    hasDomain(domain: string): boolean;
    
    // Current presence queries
    getAllPresence(): PresenceEntry[];
    getPresenceByDomain(domain: string): PresenceEntry[];
    getPresenceById(domain: string, entityId: string): PresenceEntry | null;
    searchPresence(criteria: PresenceSearchCriteria): PresenceEntry[];
    getPresenceByRolodexId(rolodexEntityId: string): PresenceEntry[];
    
    // Name search & history (for finding players)
    searchByName(query: PresenceNameQuery): PresenceSearchResult[];
    getHistory(domain: string, entityId: string): PresenceHistoryEntry | null;
    getAllHistory(domain?: string): PresenceHistoryEntry[];
    getRecentlySeen(domain: string, withinMs?: number): PresenceHistoryEntry[];
  }
}

