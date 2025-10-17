import {
  GameState,
  Position,
  BotDecision,
  Facing,
  Player,
} from "../types";
import { Pathfinder } from "../utils/pathfinding";
import { GameStateParser } from "../utils/gameStateParser";
import { PublicKey } from "@solana/web3.js";

/**
 * Bot AI state machine for Bomberman
 */
export enum BotState {
  IDLE = "idle",
  HUNTING = "hunting",
  ESCAPING = "escaping",
  ATTACKING = "attacking",
  COLLECTING = "collecting",
}

export class BotAI {
  private state: BotState = BotState.IDLE;
  private botAddress: PublicKey;
  private lastDecisionTime: number = 0;
  private decisionCooldown: number = 500; // ms between decisions

  constructor(botAddress: PublicKey) {
    this.botAddress = botAddress;
  }

  /**
   * Main decision-making function
   * @param gameState Current game state
   * @returns Bot decision (action to take)
   */
  makeDecision(gameState: GameState): BotDecision {
    // Rate limit decisions
    const now = Date.now();
    if (now - this.lastDecisionTime < this.decisionCooldown) {
      return { action: "wait" };
    }
    this.lastDecisionTime = now;

    // Find bot in players list
    const bot = this.findBot(gameState);
    if (!bot || bot.health === 0) {
      return { action: "wait" };
    }

    const botPos: Position = { x: bot.x, y: bot.y };

    // Priority 1: Escape if in danger
    if (this.isInDanger(gameState, botPos)) {
      this.state = BotState.ESCAPING;
      return this.escapeFromDanger(gameState, botPos);
    }

    // Priority 2: Attack if enemy is nearby
    const nearestEnemy = Pathfinder.findNearestEnemy(
      gameState,
      this.botAddress.toString(),
      botPos
    );
    if (nearestEnemy && GameStateParser.manhattanDistance(
      botPos.x,
      botPos.y,
      nearestEnemy.x,
      nearestEnemy.y
    ) <= 3) {
      this.state = BotState.ATTACKING;
      return this.attackEnemy(gameState, botPos, nearestEnemy);
    }

    // Priority 3: Break boxes for power-ups
    const nearestBox = Pathfinder.findNearestBox(gameState, botPos);
    if (nearestBox) {
      this.state = BotState.COLLECTING;
      return this.breakBox(gameState, botPos, nearestBox);
    }

    // Priority 4: Hunt for enemies
    if (nearestEnemy) {
      this.state = BotState.HUNTING;
      return this.huntEnemy(gameState, botPos, nearestEnemy);
    }

    // Default: Random exploration
    this.state = BotState.IDLE;
    return this.explore(gameState, botPos);
  }

  /**
   * Find bot player in game state
   */
  private findBot(gameState: GameState): Player | null {
    return (
      gameState.players.find(
        (p) => p.address.toString() === this.botAddress.toString()
      ) || null
    );
  }

  /**
   * Check if bot is in danger (near a bomb)
   */
  private isInDanger(gameState: GameState, pos: Position): boolean {
    const cell = GameStateParser.getCell(gameState.grid, pos.x, pos.y);
    if (cell && cell.type === "bomb") {
      return true;
    }

    // Check cardinal directions for bombs
    const directions = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ];

    for (const dir of directions) {
      for (let dist = 1; dist <= 2; dist++) {
        const checkX = pos.x + dir.x * dist;
        const checkY = pos.y + dir.y * dist;
        const checkCell = GameStateParser.getCell(
          gameState.grid,
          checkX,
          checkY
        );

        if (!checkCell) break;
        if (checkCell.type === "wall") break;

        if (checkCell.type === "bomb") {
          // Check bomb timer
          if (checkCell.bombTimer !== undefined && checkCell.bombTimer <= 2) {
            return true;
          }
        }

        if (checkCell.type === "box") break;
      }
    }

    return false;
  }

  /**
   * Escape from danger
   */
  private escapeFromDanger(
    gameState: GameState,
    pos: Position
  ): BotDecision {
    const safePos = Pathfinder.findNearestSafePosition(gameState, pos);
    if (!safePos) {
      // No safe position, try random movement
      return this.explore(gameState, pos);
    }

    const path = Pathfinder.findPath(gameState, pos, safePos, false);
    if (path.length <= 1) {
      return { action: "wait" };
    }

    return this.moveAlongPath(pos, path);
  }

  /**
   * Attack nearby enemy
   */
  private attackEnemy(
    gameState: GameState,
    botPos: Position,
    enemyPos: Position
  ): BotDecision {
    // Check if we're adjacent to enemy - place bomb
    const distance = GameStateParser.manhattanDistance(
      botPos.x,
      botPos.y,
      enemyPos.x,
      enemyPos.y
    );

    if (distance <= 1) {
      // Place bomb if we can escape
      const safePos = Pathfinder.findNearestSafePosition(gameState, botPos);
      if (safePos) {
        return { action: "bomb" };
      }
    }

    // Try to position for attack
    return this.huntEnemy(gameState, botPos, enemyPos);
  }

  /**
   * Hunt for enemy
   */
  private huntEnemy(
    gameState: GameState,
    botPos: Position,
    enemyPos: Position
  ): BotDecision {
    const path = Pathfinder.findPath(gameState, botPos, enemyPos, true);
    if (path.length <= 1) {
      return this.explore(gameState, botPos);
    }

    return this.moveAlongPath(botPos, path);
  }

  /**
   * Break a box
   */
  private breakBox(
    gameState: GameState,
    botPos: Position,
    boxPos: Position
  ): BotDecision {
    // Check if we're adjacent to a box
    const directions = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ];

    for (const dir of directions) {
      const checkX = botPos.x + dir.x;
      const checkY = botPos.y + dir.y;
      const cell = GameStateParser.getCell(gameState.grid, checkX, checkY);

      if (cell && cell.type === "box") {
        // Place bomb if safe
        const safePos = Pathfinder.findNearestSafePosition(gameState, botPos);
        if (safePos) {
          return { action: "bomb" };
        }
      }
    }

    // Move toward box
    const path = Pathfinder.findPath(gameState, botPos, boxPos, true);
    if (path.length <= 1) {
      return { action: "wait" };
    }

    return this.moveAlongPath(botPos, path);
  }

  /**
   * Random exploration
   */
  private explore(gameState: GameState, pos: Position): BotDecision {
    const directions = [
      { dir: Facing.Down, dx: 0, dy: -1 },
      { dir: Facing.Up, dx: 0, dy: 1 },
      { dir: Facing.Left, dx: -1, dy: 0 },
      { dir: Facing.Right, dx: 1, dy: 0 },
    ];

    // Shuffle directions for randomness
    const shuffled = directions.sort(() => Math.random() - 0.5);

    for (const { dir, dx, dy } of shuffled) {
      const newX = pos.x + dx;
      const newY = pos.y + dy;

      if (
        GameStateParser.isCellWalkable(gameState.grid, newX, newY) &&
        !GameStateParser.isPositionOccupied(gameState.players, newX, newY)
      ) {
        return {
          action: "move",
          direction: dir,
          energy: 1,
        };
      }
    }

    return { action: "wait" };
  }

  /**
   * Move along a path
   */
  private moveAlongPath(
    currentPos: Position,
    path: Position[]
  ): BotDecision {
    if (path.length <= 1) {
      return { action: "wait" };
    }

    const nextPos = path[1]; // path[0] is current position
    const dx = nextPos.x - currentPos.x;
    const dy = nextPos.y - currentPos.y;

    let direction: Facing;
    if (dx === 1) direction = Facing.Right;
    else if (dx === -1) direction = Facing.Left;
    else if (dy === 1) direction = Facing.Up;
    else if (dy === -1) direction = Facing.Down;
    else return { action: "wait" };

    // Calculate how many steps we can take in this direction
    let energy = 1;
    for (let i = 2; i < Math.min(path.length, 5); i++) {
      const checkPos = path[i];
      const checkDx = checkPos.x - path[i - 1].x;
      const checkDy = checkPos.y - path[i - 1].y;

      // Check if still moving in same direction
      if (
        (direction === Facing.Right && checkDx === 1 && checkDy === 0) ||
        (direction === Facing.Left && checkDx === -1 && checkDy === 0) ||
        (direction === Facing.Up && checkDx === 0 && checkDy === 1) ||
        (direction === Facing.Down && checkDx === 0 && checkDy === -1)
      ) {
        energy++;
      } else {
        break;
      }
    }

    return {
      action: "move",
      direction,
      energy,
    };
  }

  /**
   * Get current state
   */
  getState(): BotState {
    return this.state;
  }
}

