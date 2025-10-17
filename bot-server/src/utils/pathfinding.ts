import { Position, AStarNode, Grid, GameState } from "../types";
import { GameStateParser } from "./gameStateParser";

/**
 * A* pathfinding implementation for the Bomberman grid
 */
export class Pathfinder {
  /**
   * Find path from start to goal using A* algorithm
   * @param gameState Current game state
   * @param start Starting position
   * @param goal Goal position
   * @param avoidBombs Whether to avoid cells near bombs
   * @returns Array of positions forming the path (including start and goal)
   */
  static findPath(
    gameState: GameState,
    start: Position,
    goal: Position,
    avoidBombs: boolean = true
  ): Position[] {
    const openSet: AStarNode[] = [];
    const closedSet: Set<string> = new Set();

    // Create start node
    const startNode: AStarNode = {
      position: start,
      g: 0,
      h: this.heuristic(start, goal),
      f: 0,
      parent: null,
    };
    startNode.f = startNode.g + startNode.h;
    openSet.push(startNode);

    while (openSet.length > 0) {
      // Get node with lowest f score
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;

      // Check if we reached the goal
      if (
        current.position.x === goal.x &&
        current.position.y === goal.y
      ) {
        return this.reconstructPath(current);
      }

      closedSet.add(this.positionKey(current.position));

      // Check all neighbors
      const neighbors = this.getNeighbors(gameState, current.position, avoidBombs);
      for (const neighborPos of neighbors) {
        const key = this.positionKey(neighborPos);
        if (closedSet.has(key)) continue;

        const g = current.g + 1;
        const h = this.heuristic(neighborPos, goal);
        const f = g + h;

        // Check if neighbor is already in open set
        const existingNode = openSet.find(
          (n) => n.position.x === neighborPos.x && n.position.y === neighborPos.y
        );

        if (existingNode) {
          // Update if we found a better path
          if (g < existingNode.g) {
            existingNode.g = g;
            existingNode.f = f;
            existingNode.parent = current;
          }
        } else {
          // Add new node to open set
          const neighborNode: AStarNode = {
            position: neighborPos,
            g,
            h,
            f,
            parent: current,
          };
          openSet.push(neighborNode);
        }
      }
    }

    // No path found
    return [];
  }

  /**
   * Get valid neighboring positions
   */
  private static getNeighbors(
    gameState: GameState,
    pos: Position,
    avoidBombs: boolean
  ): Position[] {
    const neighbors: Position[] = [];
    const directions = [
      { x: 0, y: -1 }, // Down
      { x: 0, y: 1 },  // Up
      { x: -1, y: 0 }, // Left
      { x: 1, y: 0 },  // Right
    ];

    for (const dir of directions) {
      const newPos: Position = {
        x: pos.x + dir.x,
        y: pos.y + dir.y,
      };

      // Check bounds
      if (
        newPos.x < 0 ||
        newPos.y < 0 ||
        newPos.x >= gameState.width ||
        newPos.y >= gameState.height
      ) {
        continue;
      }

      // Check if walkable
      if (!GameStateParser.isCellWalkable(gameState.grid, newPos.x, newPos.y)) {
        continue;
      }

      // Check if occupied by player
      if (
        GameStateParser.isPositionOccupied(gameState.players, newPos.x, newPos.y)
      ) {
        continue;
      }

      // Check if we should avoid bombs
      if (avoidBombs && this.isNearBomb(gameState, newPos)) {
        continue;
      }

      neighbors.push(newPos);
    }

    return neighbors;
  }

  /**
   * Check if position is near a bomb (within blast radius)
   */
  private static isNearBomb(gameState: GameState, pos: Position): boolean {
    // Check if current cell has a bomb
    const cell = GameStateParser.getCell(gameState.grid, pos.x, pos.y);
    if (cell && cell.type === "bomb") {
      return true;
    }

    // Check cardinal directions for bombs (blast radius = 1 in each direction)
    const blastRadius = 1;
    const directions = [
      { x: 0, y: -1 }, // Down
      { x: 0, y: 1 },  // Up
      { x: -1, y: 0 }, // Left
      { x: 1, y: 0 },  // Right
    ];

    for (const dir of directions) {
      for (let dist = 1; dist <= blastRadius; dist++) {
        const checkX = pos.x + dir.x * dist;
        const checkY = pos.y + dir.y * dist;

        const checkCell = GameStateParser.getCell(gameState.grid, checkX, checkY);
        if (!checkCell) break; // Out of bounds

        if (checkCell.type === "wall") break; // Wall blocks blast

        if (checkCell.type === "bomb") {
          return true; // Found a bomb in blast range
        }

        if (checkCell.type === "box") break; // Box blocks blast
      }
    }

    return false;
  }

  /**
   * Manhattan distance heuristic
   */
  private static heuristic(a: Position, b: Position): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  /**
   * Reconstruct path from goal node
   */
  private static reconstructPath(node: AStarNode): Position[] {
    const path: Position[] = [];
    let current: AStarNode | null = node;

    while (current !== null) {
      path.unshift(current.position);
      current = current.parent;
    }

    return path;
  }

  /**
   * Generate unique key for position
   */
  private static positionKey(pos: Position): string {
    return `${pos.x},${pos.y}`;
  }

  /**
   * Find the nearest safe position (away from bombs)
   */
  static findNearestSafePosition(
    gameState: GameState,
    start: Position
  ): Position | null {
    // BFS to find nearest safe cell
    const queue: Position[] = [start];
    const visited = new Set<string>();
    visited.add(this.positionKey(start));

    while (queue.length > 0) {
      const current = queue.shift()!;

      // Check if this position is safe
      if (!this.isNearBomb(gameState, current)) {
        return current;
      }

      // Add neighbors to queue
      const neighbors = this.getNeighbors(gameState, current, false);
      for (const neighbor of neighbors) {
        const key = this.positionKey(neighbor);
        if (!visited.has(key)) {
          visited.add(key);
          queue.push(neighbor);
        }
      }
    }

    return null; // No safe position found
  }

  /**
   * Find nearest destructible box
   */
  static findNearestBox(
    gameState: GameState,
    start: Position
  ): Position | null {
    // BFS to find nearest box
    const queue: Position[] = [start];
    const visited = new Set<string>();
    visited.add(this.positionKey(start));

    while (queue.length > 0) {
      const current = queue.shift()!;

      // Check neighbors for boxes (we want to be adjacent to a box)
      const directions = [
        { x: 0, y: -1 }, { x: 0, y: 1 },
        { x: -1, y: 0 }, { x: 1, y: 0 },
      ];

      for (const dir of directions) {
        const checkX = current.x + dir.x;
        const checkY = current.y + dir.y;
        const cell = GameStateParser.getCell(gameState.grid, checkX, checkY);

        if (cell && cell.type === "box") {
          return current; // Return position adjacent to box
        }
      }

      // Add walkable neighbors to queue
      const neighbors = this.getNeighbors(gameState, current, true);
      for (const neighbor of neighbors) {
        const key = this.positionKey(neighbor);
        if (!visited.has(key)) {
          visited.add(key);
          queue.push(neighbor);
        }
      }
    }

    return null; // No box found
  }

  /**
   * Find nearest enemy player
   */
  static findNearestEnemy(
    gameState: GameState,
    botAddress: string,
    start: Position
  ): Position | null {
    let nearestEnemy: Position | null = null;
    let minDistance = Infinity;

    const livingPlayers = GameStateParser.getLivingPlayers(gameState.players);
    for (const player of livingPlayers) {
      // Skip if it's the bot itself
      if (player.address.toString() === botAddress) continue;

      const distance = this.heuristic(start, { x: player.x, y: player.y });
      if (distance < minDistance) {
        minDistance = distance;
        nearestEnemy = { x: player.x, y: player.y };
      }
    }

    return nearestEnemy;
  }
}

