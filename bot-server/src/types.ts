import { PublicKey } from "@solana/web3.js";
import { BombermanProgramBeta } from "./types/bomberman_program_beta";

// Re-export the program type
export type { BombermanProgramBeta };

// Game state enums matching the Rust program
export enum CellType {
  Empty = "empty",
  Wall = "wall",
  Box = "box",
  Bomb = "bomb",
}

export enum Facing {
  Up = "up",
  Down = "down",
  Left = "left",
  Right = "right",
}

export enum GameStatus {
  Waiting = "waiting",
  Active = "active",
  Won = "won",
}

// Cell structure
export interface Cell {
  type: CellType;
  bombTimer?: number; // Only for bombs
}

// Player structure
export interface Player {
  x: number;
  y: number;
  health: number;
  address: PublicKey;
  facing: Facing;
}

// Grid structure
export interface Grid {
  cells: Cell[];
  width: number;
  height: number;
}

// Game state structure
export interface GameState {
  id: number;
  width: number;
  height: number;
  seed: number;
  ticketPrice: number;
  prizeClaimed: boolean;
  owner: PublicKey;
  status: GameStatus;
  winner?: PublicKey;
  grid: Grid;
  tickCount: number;
  players: Player[];
}

// Position structure for pathfinding
export interface Position {
  x: number;
  y: number;
}

// Bot decision structure
export interface BotDecision {
  action: "move" | "bomb" | "wait";
  direction?: Facing;
  energy?: number;
}

// Match metadata
export interface MatchMetadata {
  gamePda: PublicKey;
  createdAt: Date;
  playerCount: number;
  status: GameStatus;
  lastChecked: Date;
}

// A* node for pathfinding
export interface AStarNode {
  position: Position;
  g: number; // Cost from start
  h: number; // Heuristic to goal
  f: number; // Total cost
  parent: AStarNode | null;
}

