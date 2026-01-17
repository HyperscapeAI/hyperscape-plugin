/**
 * Specific system types for Hyperscape plugin - local definitions
 */

import { THREE, System, type ClientInput } from "./core-types";

// Client Input system interface with agent control methods
// ClientInput now provides both hardware input and programmatic agent control
export interface ClientInputSystem extends System {
  goto?(x: number, z: number): Promise<boolean>;
  followEntity?(entityId: string): Promise<boolean>;
  stopNavigation?(): void;
  stopAllActions?(): void;
  startRandomWalk?(): void;
  stopRandomWalk?(): void;
  getIsWalkingRandomly?(): boolean;
  getIsNavigating?(): boolean;
}

// Type guard for ClientInput with agent methods
export function isClientInputSystem(
  obj: unknown,
): obj is ClientInputSystem {
  if (!obj || typeof obj !== 'object') return false;
  return 'goto' in obj || (obj.constructor && obj.constructor.name === "ClientInput");
}

// Backward compatibility alias (deprecated, use ClientInputSystem)
export type AgentControlsSystem = ClientInputSystem;
export const isAgentControlsSystem = isClientInputSystem;
