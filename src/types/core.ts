// Re-export core types for convenience
// World and Entity are interfaces, System is a class
export type { World, Entity } from "./core-types";
export { System } from "./core-types";
export type {
  Player,
  Vector3,
  Quaternion,
  Component,
  Physics,
  Entities,
  Events,
  WorldOptions,
  Position,
  ContentInstance,
} from "./core-types";

// Re-export plugin-specific interfaces
export type { HyperscapeAction, HyperscapeProvider } from "./core-interfaces";
