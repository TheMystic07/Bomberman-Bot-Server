import { PublicKey } from "@solana/web3.js";
import {
  GameState,
  Grid,
  Cell,
  CellType,
  Player,
  Facing,
  GameStatus,
} from "../types";

/**
 * Parse on-chain game account data to our GameState structure
 */
export class GameStateParser {
  /**
   * Parse raw account data from the blockchain
   * @param accountData Raw game account data
   * @returns Parsed GameState
   */
  static parseGameAccount(accountData: any): GameState {
    // Parse game state enum
    let status: GameStatus = GameStatus.Waiting;
    let winner: PublicKey | undefined = undefined;

    if (accountData.gameState) {
      if (accountData.gameState.waiting !== undefined) {
        status = GameStatus.Waiting;
      } else if (accountData.gameState.active !== undefined) {
        status = GameStatus.Active;
      } else if (accountData.gameState.won !== undefined) {
        status = GameStatus.Won;
        winner = accountData.gameState.won.winner;
      }
    }

    // Parse grid
    const grid = this.parseGrid(accountData.grid);

    // Parse players
    const players = this.parsePlayers(accountData.players || []);

    return {
      id: accountData.id,
      width: accountData.width,
      height: accountData.height,
      seed: accountData.seed,
      ticketPrice: accountData.ticketPrice?.toNumber() || 0,
      prizeClaimed: accountData.prizeClaimed || false,
      owner: accountData.owner,
      status,
      winner,
      grid,
      tickCount: accountData.tickCount?.toNumber() || 0,
      players,
    };
  }

  /**
   * Parse grid from account data
   */
  private static parseGrid(gridData: any): Grid {
    const cells: Cell[] = [];

    if (gridData && gridData.cells) {
      for (const cellData of gridData.cells) {
        cells.push(this.parseCell(cellData));
      }
    }

    return {
      cells,
      width: gridData?.width || 13,
      height: gridData?.height || 11,
    };
  }

  /**
   * Parse individual cell
   */
  private static parseCell(cellData: any): Cell {
    if (!cellData) {
      return { type: CellType.Empty };
    }

    if (cellData.empty !== undefined) {
      return { type: CellType.Empty };
    } else if (cellData.wall !== undefined) {
      return { type: CellType.Wall };
    } else if (cellData.box !== undefined) {
      return { type: CellType.Box };
    } else if (cellData.bomb !== undefined) {
      return { type: CellType.Bomb, bombTimer: cellData.bomb };
    }

    return { type: CellType.Empty };
  }

  /**
   * Parse players array
   */
  private static parsePlayers(playersData: any[]): Player[] {
    return playersData.map((playerData) => ({
      x: playerData.x,
      y: playerData.y,
      health: playerData.health,
      address: playerData.address,
      facing: this.parseFacing(playerData.facing),
    }));
  }

  /**
   * Parse facing direction
   */
  private static parseFacing(facingData: any): Facing {
    if (!facingData) return Facing.Down;

    if (facingData.up !== undefined) return Facing.Up;
    if (facingData.down !== undefined) return Facing.Down;
    if (facingData.left !== undefined) return Facing.Left;
    if (facingData.right !== undefined) return Facing.Right;

    return Facing.Down;
  }

  /**
   * Get cell at specific position
   */
  static getCell(grid: Grid, x: number, y: number): Cell | null {
    if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) {
      return null;
    }
    const index = y * grid.width + x;
    return grid.cells[index] || null;
  }

  /**
   * Check if a cell is walkable
   */
  static isCellWalkable(grid: Grid, x: number, y: number): boolean {
    const cell = this.getCell(grid, x, y);
    if (!cell) return false;
    return cell.type === CellType.Empty;
  }

  /**
   * Check if position is occupied by a living player
   */
  static isPositionOccupied(
    players: Player[],
    x: number,
    y: number
  ): boolean {
    return players.some((p) => p.x === x && p.y === y && p.health > 0);
  }

  /**
   * Get all living players
   */
  static getLivingPlayers(players: Player[]): Player[] {
    return players.filter((p) => p.health > 0);
  }

  /**
   * Calculate Manhattan distance between two positions
   */
  static manhattanDistance(
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  }
}

