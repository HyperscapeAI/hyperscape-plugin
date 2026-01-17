// Core types for plugin-hyperscape - standalone, no @hyperscape/shared dependency
// This plugin uses lightweight mock physics and local type definitions
import { Action, IAgentRuntime, Provider, Service, UUID } from "@elizaos/core";
// @ts-ignore - THREE types loaded from @types/three
import * as THREE from "three";

// Re-export THREE for convenience
export { THREE };

// ============================================================================
// BASIC 3D TYPES (replacing @hyperscape/shared types)
// ============================================================================

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

// Position type (alias for Vector3 for backwards compatibility)
export type Position = Vector3;

// Transform type
export interface Transform {
  position?: Position;
  rotation?: Quaternion;
  scale?: Position;
}

export interface BaseObject {
  position: Vector3;
  quaternion: Quaternion;
  scale: Vector3;
}

// ============================================================================
// GAME ENTITY TYPES (local definitions, no external dependency)
// ============================================================================

export interface Component {
  type: string;
  data?: Record<string, unknown>;
  values?(): unknown[];
  [key: string]: unknown;
}

export interface AppearanceComponent extends Component {
  type: "appearance";
}

// Entity data structure - common properties are required
export interface EntityData {
  id?: string;
  type?: string;
  name?: string;
  appearance?: unknown;
  [key: string]: unknown;
}

export interface Entity {
  id: string;
  type: string;
  data: EntityData;
  base?: {
    position: Vector3;
    quaternion?: Quaternion;
    scale?: Vector3;
    visible?: boolean;
    children?: unknown[];
    parent?: unknown | null;
  };
  position?: Vector3;
  rotation?: unknown;
  node?: {
    position: THREE.Vector3;
    quaternion?: THREE.Quaternion;
    scale?: THREE.Vector3;
    [key: string]: unknown;
  };
  components?: Component[];
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Entities {
  player: Player | null;
  players: Map<string, Player>;
  items: Map<string, Entity>;
  npcs?: Map<string, Entity>;
  add?: (data: unknown, local?: boolean) => Entity;
  remove?: (id: string) => boolean;
  get?: (id: string) => Entity | undefined;
  values?: () => IterableIterator<Entity>;
  getPlayer?: (id: string) => Player | undefined;
  getLocalPlayer?: () => Player | null;
  getPlayers?: () => Player[];
  [key: string]: unknown;
}

export interface Player extends Entity {
  type: "player";
  velocity?: Vector3;
  speed?: number;
  // Movement methods for AI agent control
  move?: (displacement: Position) => void;
  walkToward?: (
    targetPosition: { x: number; y?: number; z: number },
    speed?: number,
  ) => Position;
  walk?: (direction: { x: number; z: number }, speed?: number) => Position;
  teleport?: (options: { position?: Position; rotationY?: number }) => void;
  modify?: (data: { name?: string; [key: string]: unknown }) => void;
  setSessionAvatar?: (url: string) => void;
}

// ============================================================================
// GAME SYSTEM TYPES (local definitions)
// ============================================================================

export class System {
  id?: string;
  world?: World;

  constructor(world?: World) {
    this.world = world;
  }

  // These methods are optional - subclasses can override them
  init(_world: World): void | Promise<void> {
    return;
  }
  start(): void {
    return;
  }
  stop(): void {
    return;
  }
  update(_delta: number): void {
    return;
  }
  destroy(): void {
    return;
  }
}

// Loader interface for asset loading
export interface Loader {
  load?: (type: string, url: string) => Promise<unknown>;
  get?: (type: string, url: string) => unknown;
  has?: (type: string, url: string) => boolean;
  [key: string]: unknown;
}

// Stage interface for rendering
export interface Stage {
  scene?: THREE.Scene;
  environment?: unknown;
  [key: string]: unknown;
}

// Settings interface
export interface Settings {
  on?: (event: string, callback: (data: unknown) => void) => void;
  off?: (event: string, callback?: (data: unknown) => void) => void;
  [key: string]: unknown;
}

export interface World {
  id?: string;
  systems: System[];
  entities: Entities;
  network: NetworkSystem;
  chat: ChatSystem;
  events?: EventSystem;
  physics?: Physics;
  assetsUrl?: string;
  rig?: THREE.Object3D;
  camera?: THREE.PerspectiveCamera;
  loader?: Loader;
  stage?: Stage;
  settings?: Settings;
  livekit?: {
    on?: (event: string, callback: (data: unknown) => void) => void;
    [key: string]: unknown;
  };
  register?: (name: string, system: unknown) => System;
  getSystem?: (name: string) => System | undefined;
  on?: (event: string, callback: (data: unknown) => void) => void;
  off?: (event: string, callback?: (data: unknown) => void) => void;
  disconnect?: () => Promise<void>;
  destroy?: () => void;
  [key: string]: unknown;
}

export interface WorldOptions {
  wsUrl?: string;
  assetsUrl?: string;
  networkRate?: number;
  [key: string]: unknown;
}

// World configuration - plugin-specific
// Note: This plugin uses lightweight mock physics, no PhysX WASM required
export interface WorldConfig extends WorldOptions {
  viewport?: HTMLElement | MockElement;
  ui?: HTMLElement | MockElement;
  initialAuthToken?: string;
  name?: string;
  avatar?: string;
}

export interface MockWorldConfig {
  worldId?: string;
  name?: string;
  assets?: string[];
}

export interface MockElement {
  appendChild: (child: unknown) => void;
  removeChild: (child: unknown) => void;
  offsetWidth: number;
  offsetHeight: number;
  addEventListener: (event: string, handler: unknown) => void;
  removeEventListener: (event: string, handler: unknown) => void;
  style: Record<string, unknown>;
}

// ============================================================================
// PHYSICS TYPES (mock physics, no PhysX required)
// ============================================================================

export interface RigidBody {
  type: "static" | "dynamic" | "kinematic";
  mass: number;
  position: Vector3 | THREE.Vector3;
  rotation: Quaternion | THREE.Quaternion;
  velocity: Vector3 | THREE.Vector3;
  angularVelocity: Vector3 | THREE.Vector3;
  applyForce(force: Vector3, point?: Vector3): void;
  applyImpulse(impulse: Vector3, point?: Vector3): void;
  setLinearVelocity(velocity: Vector3): void;
  setAngularVelocity(velocity: Vector3): void;
}

export interface CharacterController {
  id: string;
  position: Position | THREE.Vector3;
  velocity: Position | THREE.Vector3;
  isGrounded: boolean;
  radius: number;
  height: number;
  maxSpeed: number;
  move: (displacement: Position) => void;
  jump: () => void;
  walkToward: (
    targetPosition: { x: number; y?: number; z: number },
    speed?: number,
  ) => Position;
  walk?: (direction: { x: number; z: number }, speed?: number) => Position;
  setPosition: (position: Position) => void;
  getPosition: () => Position;
  getVelocity: () => Position;
}

export interface CharacterControllerOptions {
  radius?: number;
  height?: number;
  stepHeight?: number;
  slopeLimit?: number;
  skinWidth?: number;
}

export interface Physics {
  enabled: boolean;
  gravity: Vector3;
  timeStep: number;
  substeps?: number;
  world?: unknown | null;
  controllers: Map<string, CharacterController>;
  rigidBodies: Map<string, RigidBody>;

  createRigidBody?: (
    type: "static" | "dynamic" | "kinematic",
    position?: Vector3,
    rotation?: Quaternion,
  ) => RigidBody;
  createCharacterController?: (
    options: CharacterControllerOptions & {
      id?: string;
      position?: Position;
      maxSpeed?: number;
    },
  ) => CharacterController;
  step?: (deltaTime: number) => void;
}

// ============================================================================
// NETWORK TYPES
// ============================================================================

export interface NetworkSystem {
  id: string | null;
  isClient?: boolean;
  isServer?: boolean;
  connections?: Map<string, NetworkConnection>;
  broadcast?: (event: string, data: unknown) => void;
  send: (event: string, data?: unknown) => void;
  upload?: (file: File) => Promise<string>;
  disconnect: () => Promise<void>;
  maxUploadSize?: number;
}

export interface NetworkConnection {
  id: string;
  socket?: WebSocket;
  lastPing?: number;
  [key: string]: unknown;
}

export interface ClientInput {
  keys?: Record<string, boolean>;
  mouse?: { x: number; y: number; buttons: number };
  goto?: (x: number, z: number) => Promise<boolean>;
  [key: string]: unknown;
}

export interface ClientNetwork extends NetworkSystem {
  isClient: true;
}

// ============================================================================
// CHAT TYPES
// ============================================================================

export interface ChatMessage {
  id: string;
  from: string;
  fromId?: string;
  userId?: string;
  userName?: string;
  username?: string;
  body: string;
  text: string;
  message?: string; // For backward compatibility
  timestamp: number;
  createdAt: string;
  avatar?: string;
  entityId?: string;
  playerId?: string;
  playerName?: string;
}

export interface ChatListener {
  (messages: ChatMessage[]): void;
}

export interface ChatSystem {
  msgs: ChatMessage[];
  listeners?: ((msgs: ChatMessage[]) => void)[];
  add: (message: ChatMessage, broadcast?: boolean) => void;
  subscribe: (callback: (msgs: ChatMessage[]) => void) => (() => void) | { unsubscribe: () => void };
  clear?: () => void;
}

export interface Chat extends ChatSystem {}

// ============================================================================
// EVENT TYPES
// ============================================================================

export interface Events {
  listeners: Map<string, ((data: unknown) => void)[]>;
  emit: (eventName: string, data?: unknown) => void;
  on: (eventName: string, callback: (data: unknown) => void) => void;
  off: (eventName: string, callback?: (data: unknown) => void) => void;
}

export interface EventSystem extends Events {
  push?: (callback: (data: unknown) => void) => void;
  indexOf?: (callback: (data: unknown) => void) => number;
  splice?: (index: number, count: number) => void;
  clear?: () => void;
}

export enum EventType {
  CHAT = "chat",
  PLAYER_JOIN = "player_join",
  PLAYER_LEAVE = "player_leave",
  ENTITY_SPAWN = "entity_spawn",
  ENTITY_DESPAWN = "entity_despawn",
  WORLD_UPDATE = "world_update",
  CLIENT_DISCONNECT = "client_disconnect",
}

// ============================================================================
// PLAYER INPUT/STATS TYPES
// ============================================================================

export interface PlayerInput {
  forward?: boolean;
  backward?: boolean;
  left?: boolean;
  right?: boolean;
  jump?: boolean;
  sprint?: boolean;
  [key: string]: unknown;
}

export interface PlayerStats {
  health?: number;
  maxHealth?: number;
  level?: number;
  experience?: number;
  [key: string]: unknown;
}

export interface Control {
  id: string;
  playerId: string;
  enabled: boolean;
  [key: string]: unknown;
}

export interface InputState {
  down: boolean;
  pressed: boolean;
  released: boolean;
}

// ============================================================================
// CONTENT BUNDLE TYPES
// ============================================================================

export interface Avatar {
  id: string;
  name: string;
  url?: string;
}

export interface ContentBundle {
  id: string;
  name: string;
  description?: string;
  version?: string;
  actions?: Action[];
  providers?: Provider[];
  handlers?: unknown[];
  dynamicActions?: HyperscapeActionDescriptor[];
  config?: {
    features?: Record<string, unknown>;
    [key: string]: unknown;
  };
  install?: (world: World, runtime: IAgentRuntime) => Promise<ContentInstance>;
}

export interface ContentInstance {
  actions?: Action[];
  providers?: Provider[];
  dynamicActions?: string[];
  uninstall?: () => Promise<void>;
  [key: string]: unknown;
}

export interface HyperscapeActionDescriptor {
  name: string;
  description: string;
  parameters: ActionParameter[];
  examples: string[];
  category:
    | "combat"
    | "inventory"
    | "skills"
    | "quest"
    | "social"
    | "movement"
    | "other";
  handler?: string;
}

export interface ActionParameter {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  required: boolean;
  description: string;
  default?: unknown;
}

// ============================================================================
// MANAGER AND SERVICE TYPES
// ============================================================================

export interface ManagerInterface {
  runtime: IAgentRuntime;
  start?(): void;
  stop?(): void;
  isActive?(): boolean;
}

export interface ResponseContent {
  text?: string;
  action?: string;
  emote?: string;
  [key: string]: unknown;
}

export interface BehaviorResponse {
  content: ResponseContent;
  context: string;
}

export interface AgentInstance {
  id: UUID;
  runtime: IAgentRuntime;
  service: Service;
  name: string;
  position?: Position;
  status: "connecting" | "connected" | "disconnected" | "error";
  lastUpdate: number;
}

export interface MultiAgentConfig {
  worldUrl: string;
  maxAgents: number;
  agentSpacing: number;
  enableAutonomy?: boolean;
}

export interface FileUploadResult {
  url: string;
  hash: string;
  size: number;
}

export interface ServiceConfig {
  wsUrl: string;
  authToken?: string;
  worldId: UUID;
}

export interface ServiceError extends Error {
  code?: string;
  details?: unknown;
}

export enum ModelType {
  SMALL = "small",
  MEDIUM = "medium",
  LARGE = "large",
  SMART = "smart",
}

// ============================================================================
// PLUGIN-SPECIFIC EXPORTS
// ============================================================================

// Export plugin-specific interfaces from core-interfaces
export type {
  HyperscapeAction,
  HyperscapeProvider,
} from "./core-interfaces.js";
