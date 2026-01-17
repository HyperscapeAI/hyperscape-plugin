/**
 * Type declarations for @elizaos/plugin-rolodex
 * 
 * WHY THIS FILE EXISTS:
 * plugin-rolodex is used for cross-platform IDENTITY resolution.
 * When we discover a player in Hyperscape, we may want to link them
 * to their Discord or Twitter identity.
 * 
 * NOTE: Presence tracking was moved to plugin-presence.
 * Rolodex focuses on WHO (identity), Presence focuses on WHERE (location/availability).
 */
declare module '@elizaos/plugin-rolodex' {
  import type { UUID, Service } from '@elizaos/core';

  /**
   * RolodexService - Cross-platform identity resolution and relationship management.
   * 
   * Use cases:
   * - Link game player ID to Discord handle
   * - Track relationships between entities
   * - Store contact information
   */
  export class RolodexService extends Service {
    static serviceType: 'rolodex';
    
    // Identity resolution
    linkIdentity(entityId: UUID, platform: string, platformId: string): Promise<void>;
    getLinkedIdentities(entityId: UUID): Promise<Array<{ platform: string; platformId: string }>>;
    findByPlatformId(platform: string, platformId: string): Promise<UUID | null>;
  }
}
