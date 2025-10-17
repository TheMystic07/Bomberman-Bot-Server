import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { GameState, GameStatus, MatchMetadata, BombermanProgramBeta } from "../types";
import { GameStateParser } from "../utils/gameStateParser";

/**
 * Monitor for scanning on-chain matches
 */
export class MatchMonitor {
  private connection: Connection;
  private program: Program<BombermanProgramBeta>;
  private matchesPda: PublicKey;
  private monitoredGames: Map<string, MatchMetadata> = new Map();
  private scanInterval: number = 30000; // 30 seconds
  private scanTimer: NodeJS.Timeout | null = null;

  constructor(
    connection: Connection,
    program: Program<BombermanProgramBeta>,
    matchesPda: PublicKey
  ) {
    this.connection = connection;
    this.program = program;
    this.matchesPda = matchesPda;
  }

  /**
   * Start monitoring matches
   */
  start(): void {
    console.log("🔍 Starting match monitor...");
    this.scanMatches(); // Initial scan
    this.scanTimer = setInterval(() => this.scanMatches(), this.scanInterval);
  }

  /**
   * Stop monitoring matches
   */
  stop(): void {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
    console.log("🛑 Match monitor stopped");
  }

  /**
   * Scan for active matches
   */
  private async scanMatches(): Promise<void> {
    try {
      console.log("📡 Scanning for matches...");

      // Fetch matches account
      const matchesAccount = await this.program.account.matches.fetch(
        this.matchesPda
      );

      if (!matchesAccount || !matchesAccount.activeGames) {
        console.log("ℹ️  No active games found");
        return;
      }

      const allGames = matchesAccount.activeGames as PublicKey[];
      console.log(`📊 Found ${allGames.length} game(s) in matches PDA`);

      // Check each game and show detailed info
      for (const gamePda of allGames) {
        await this.checkGame(gamePda);
      }

      // Clean up old games
      this.cleanupOldGames(allGames);
    } catch (error) {
      // Gracefully handle when matches account doesn't exist yet or is empty
      if (error instanceof Error && error.message.includes("Account does not exist")) {
        console.log("ℹ️  No matches account found yet - waiting for games to be created");
      } else {
        console.error("⚠️  Error scanning matches:", error);
      }
    }
  }

  /**
   * Check individual game
   */
  private async checkGame(gamePda: PublicKey): Promise<void> {
    try {
      const gameKey = gamePda.toString();

      // Fetch game account
      const gameAccount = await this.program.account.gamee.fetch(gamePda);
      const gameState = GameStateParser.parseGameAccount(gameAccount);

      // Get or create metadata
      let metadata = this.monitoredGames.get(gameKey);
      const isNewGame = !metadata;
      
      if (!metadata) {
        metadata = {
          gamePda,
          createdAt: new Date(),
          playerCount: gameState.players.length,
          status: gameState.status,
          lastChecked: new Date(),
        };
        this.monitoredGames.set(gameKey, metadata);
      } else {
        metadata.lastChecked = new Date();
        metadata.playerCount = gameState.players.length;
        metadata.status = gameState.status;
      }

      // Log ALL games with their status
      const gameAge = Date.now() - metadata.createdAt.getTime();
      const ageMinutes = Math.floor(gameAge / 60000);
      
      console.log(
        `🎮 Game ${gameKey.slice(0, 8)}... | ` +
        `Status: ${gameState.status} | ` +
        `Players: ${gameState.players.length}/4 | ` +
        `Age: ${ageMinutes}m | ` +
        `${isNewGame ? '🆕 NEW' : '📊 Updated'}`
      );

      // Check if this game needs bots with detailed reasoning
      const shouldJoin = this.shouldJoinWithBots(gameState, metadata);
      
      if (shouldJoin) {
        console.log(
          `  ✅ Game qualifies for bots - adding bots now!`
        );
        // Emit event or callback to bot controller
        this.onGameNeedsBots(gamePda, gameState);
      } else {
        // Show why it doesn't qualify
        const reasons = this.getDisqualificationReasons(gameState, metadata);
        if (reasons.length > 0) {
          console.log(`  ℹ️  Not joining: ${reasons.join(", ")}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error checking game ${gamePda.toString()}:`, error);
    }
  }

  /**
   * Check if game needs bots
   */
  private shouldJoinWithBots(
    gameState: GameState,
    metadata: MatchMetadata
  ): boolean {
    // Game must be waiting
    if (gameState.status !== GameStatus.Waiting) {
      return false;
    }

    // Must have fewer than 4 players
    if (gameState.players.length >= 4) {
      return false;
    }

    // Game must be open for more than 3 minutes
    const timeElapsed = Date.now() - metadata.createdAt.getTime();
    const threeMinutes = 3 * 60 * 1000;
    if (timeElapsed < threeMinutes) {
      return false;
    }

    return true;
  }

  /**
   * Get reasons why a game doesn't qualify for bots
   */
  private getDisqualificationReasons(
    gameState: GameState,
    metadata: MatchMetadata
  ): string[] {
    const reasons: string[] = [];

    if (gameState.status !== GameStatus.Waiting) {
      reasons.push(`status is ${gameState.status} (need Waiting)`);
    }

    if (gameState.players.length >= 4) {
      reasons.push("game is full (4/4 players)");
    }

    const timeElapsed = Date.now() - metadata.createdAt.getTime();
    const threeMinutes = 3 * 60 * 1000;
    const remainingMinutes = Math.ceil((threeMinutes - timeElapsed) / 60000);
    
    if (timeElapsed < threeMinutes) {
      reasons.push(`too new (wait ${remainingMinutes}m)`);
    }

    return reasons;
  }

  /**
   * Clean up games that are no longer active
   */
  private cleanupOldGames(activeGames: PublicKey[]): void {
    const activeKeys = new Set(activeGames.map((g) => g.toString()));
    const monitored = Array.from(this.monitoredGames.keys());

    for (const key of monitored) {
      if (!activeKeys.has(key)) {
        console.log(`🧹 Removing old game: ${key.slice(0, 8)}...`);
        this.monitoredGames.delete(key);
      }
    }
  }

  /**
   * Event handler for when a game needs bots
   * Override this in the bot controller
   */
  onGameNeedsBots(gamePda: PublicKey, gameState: GameState): void {
    // To be overridden by bot controller
  }

  /**
   * Get all monitored games
   */
  getMonitoredGames(): Map<string, MatchMetadata> {
    return this.monitoredGames;
  }

  /**
   * Manually trigger a scan
   */
  async scan(): Promise<void> {
    await this.scanMatches();
  }

  /**
   * Get specific game state
   */
  async getGameState(gamePda: PublicKey): Promise<GameState | null> {
    try {
      const gameAccount = await this.program.account.gamee.fetch(gamePda);
      return GameStateParser.parseGameAccount(gameAccount);
    } catch (error) {
      console.error("Error fetching game state:", error);
      return null;
    }
  }

  /**
   * Set scan interval
   */
  setScanInterval(intervalMs: number): void {
    this.scanInterval = intervalMs;
    if (this.scanTimer) {
      this.stop();
      this.start();
    }
  }
}

