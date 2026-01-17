import { IAgentRuntime, logger, UUID } from "@elizaos/core";
import { THREE, type Entity, type World, type Vector3 } from "../types/core-types";
import type { BuildManager as IBuildManager } from "../types/core-interfaces";

/**
 * BuildManager handles entity creation, modification, and build system operations
 * for agents in Hyperscape worlds
 */
export class BuildManager implements IBuildManager {
  private runtime: IAgentRuntime;
  private world: World | null = null;
  private buildPermissions: Map<UUID, string[]> = new Map();
  private _tempVec3 = new THREE.Vector3();

  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;
  }

  /**
   * Set the current world for build operations
   */
  setWorld(world: World | null): void {
    this.world = world;
  }

  /**
   * Create a new entity in the world
   */
  createEntity(
    type: string,
    position: Vector3,
    data?: Record<string, unknown>,
  ): Entity | null {
    if (!this.world?.entities?.add) {
      logger.warn("BuildManager: Cannot create entity - world or entities.add not available");
      return null;
    }

    // Create entity data
    const entityData = {
      id: `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      position: [position.x, position.y, position.z] as [number, number, number],
      active: true,
      visible: true,
      ...data,
    };

    // Add entity to world
    const entity = this.world.entities.add(entityData) as Entity;
    logger.info(`BuildManager: Created entity ${entityData.id} of type ${type}`);

    return entity;
  }

  /**
   * Destroy an entity by ID
   */
  destroyEntity(entityId: string): boolean {
    if (!this.world?.entities?.remove) {
      logger.warn("BuildManager: Cannot destroy entity - world or entities.remove not available");
      return false;
    }

    const success = this.world.entities.remove(entityId);
    logger.info(`BuildManager: Destroyed entity ${entityId}`);

    return success ?? false;
  }

  /**
   * Update an entity with new data
   */
  updateEntity(entityId: string, data: Record<string, unknown>): boolean {
    if (!this.world?.entities?.get) {
      logger.warn("BuildManager: Cannot update entity - world or entities.get not available");
      return false;
    }

    const entity = this.world.entities.get(entityId);
    if (!entity) {
      logger.warn(`BuildManager: Entity ${entityId} not found`);
      return false;
    }

    // Update entity properties
    Object.assign(entity.data, data);
    logger.info(`BuildManager: Updated entity ${entityId}`);
    return true;
  }

  /**
   * Check if building is allowed at a position
   */
  canBuild(position: Vector3, _type: string): boolean {
    // Check if position is within world bounds (basic check)
    const maxDistance = 1000; // Max distance from origin
    const distance = Math.sqrt(
      position.x ** 2 + position.y ** 2 + position.z ** 2,
    );

    if (distance > maxDistance) {
      return false;
    }

    // Check for overlapping entities (basic collision check)
    if (!this.world?.entities?.values) {
      return true; // Allow if we can't check
    }

    for (const entity of this.world.entities.values()) {
      const entityPos = entity.position;
      if (!entityPos) continue;
      
      const dx = entityPos.x - position.x;
      const dy = entityPos.y - position.y;
      const dz = entityPos.z - position.z;
      const dist = Math.sqrt(dx ** 2 + dy ** 2 + dz ** 2);

      // Minimum spacing between entities
      if (dist < 2.0) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get build permissions for an agent
   */
  getBuildPermissions(agentId: UUID): string[] {
    return this.buildPermissions.get(agentId) || ["basic_build"];
  }

  /**
   * Set build permissions for an agent
   */
  setBuildPermissions(agentId: UUID, permissions: string[]): void {
    this.buildPermissions.set(agentId, permissions);
    logger.info(
      `BuildManager: Set permissions for agent ${agentId}: ${permissions.join(", ")}`,
    );
  }

  /**
   * Clear all build permissions
   */
  clearPermissions(): void {
    this.buildPermissions.clear();
    logger.info("BuildManager: Cleared all build permissions");
  }

  /**
   * Get stats about the current world
   */
  getWorldStats(): { entityCount: number; activeEntities: number } {
    let entityCount = 0;
    let activeEntities = 0;

    if (this.world?.entities?.values) {
      for (const entity of this.world.entities.values()) {
        entityCount++;
        if (entity.active !== false) {
          activeEntities++;
        }
      }
    }

    return { entityCount, activeEntities };
  }

  /**
   * Translate an entity to a new position
   */
  translate(entityId: string, position: Vector3): boolean {
    if (!this.world?.entities?.get) {
      return false;
    }

    const entity = this.world.entities.get(entityId);
    if (!entity) {
      return false;
    }

    // Update entity position
    if (entity.position) {
      entity.position.x = position.x;
      entity.position.y = position.y;
      entity.position.z = position.z;
    } else {
      entity.position = { x: position.x, y: position.y, z: position.z };
    }

    logger.info(
      `BuildManager: Translated entity ${entityId} to position (${position.x}, ${position.y}, ${position.z})`,
    );
    return true;
  }

  /**
   * Rotate an entity
   */
  rotate(entityId: string, rotation: THREE.Quaternion): boolean {
    if (!this.world?.entities?.get) {
      return false;
    }

    const entity = this.world.entities.get(entityId);
    if (!entity) {
      return false;
    }

    // Update entity rotation
    if (entity.node?.quaternion) {
      entity.node.quaternion.copy(rotation);
    } else if (entity.rotation && typeof (entity.rotation as THREE.Quaternion).copy === 'function') {
      (entity.rotation as THREE.Quaternion).copy(rotation);
    }

    logger.info(`BuildManager: Rotated entity ${entityId}`);
    return true;
  }

  /**
   * Scale an entity
   */
  scale(entityId: string, scale: Vector3): boolean {
    if (!this.world?.entities?.get) {
      return false;
    }

    const entity = this.world.entities.get(entityId);
    if (!entity) {
      return false;
    }

    // Update entity scale via node if available
    if (entity.node?.scale) {
      entity.node.scale.set(scale.x, scale.y, scale.z);
    }

    logger.info(
      `BuildManager: Scaled entity ${entityId} to (${scale.x}, ${scale.y}, ${scale.z})`,
    );
    return true;
  }

  /**
   * Duplicate an entity
   */
  duplicate(entityId: string): Entity | null {
    if (!this.world?.entities?.get) {
      return null;
    }

    const originalEntity = this.world.entities.get(entityId);
    if (!originalEntity) {
      return null;
    }

    // Create a duplicate with offset position
    const position = originalEntity.position || { x: 0, y: 0, z: 0 };
    const duplicatePosition = this._tempVec3.set(
      position.x + 1,
      position.y,
      position.z + 1,
    );

    // Create new entity with same type and modified position
    const duplicate = this.createEntity(
      originalEntity.type || "group",
      duplicatePosition,
      { ...originalEntity.data },
    );

    if (duplicate) {
      logger.info(`BuildManager: Duplicated entity ${entityId} as ${duplicate.id}`);
    }

    return duplicate;
  }

  /**
   * Delete an entity
   */
  delete(entityId: string): boolean {
    return this.destroyEntity(entityId);
  }

  /**
   * Import an entity from external data
   */
  importEntity(
    entityData: Record<string, unknown>,
    position?: Vector3,
  ): Entity | null {
    // Use provided position or default
    const importPosition = position || this._tempVec3.set(0, 0, 0);

    // Create entity from imported data
    const entity = this.createEntity(
      (entityData.type as string) || "group",
      importPosition,
      entityData,
    );

    if (entity) {
      logger.info(`BuildManager: Imported entity as ${entity.id}`);
    }

    return entity;
  }
}
