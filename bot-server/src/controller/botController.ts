import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
} from "@solana/web3.js";
import { BotAI } from "../ai/botAI";
import { GameState, GameStatus, Facing, BombermanProgramBeta } from "../types";
import { GameStateParser } from "../utils/gameStateParser";

/**
 * Derive game PDA exactly like in test.ts
 */
function deriveGamePda(
  userPda: PublicKey,
  gameId: number,
  programId: PublicKey
): PublicKey {
  const gameIdBuf = Buffer.alloc(4);
  gameIdBuf.writeUInt32BE(gameId);
  const [gamePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("game"), userPda.toBuffer(), gameIdBuf],
    programId
  );
  return gamePda;
}

/**
 * Represents a managed bot instance
 */
interface ManagedBot {
  keypair: Keypair;
  userPda: PublicKey;
  ai: BotAI;
  gamePda: PublicKey | null;
  isActive: boolean;
  gameLoopTimer: NodeJS.Timeout | null;
}

/**
 * Controller for managing multiple bots
 */
export class BotController {
  private connection: Connection;
  private program: Program<BombermanProgramBeta>;
  private ephemeralProgram: Program<BombermanProgramBeta>;
  private vaultPda: PublicKey;
  private bots: Map<string, ManagedBot> = new Map();
  private maxBotsPerGame: number = 3;

  constructor(
    connection: Connection,
    program: Program<BombermanProgramBeta>,
    ephemeralProgram: Program<BombermanProgramBeta>,
    vaultPda: PublicKey
  ) {
    this.connection = connection;
    this.program = program;
    this.ephemeralProgram = ephemeralProgram;
    this.vaultPda = vaultPda;
  }

  /**
   * Create a new bot and initialize its user account
   */
  async createBot(): Promise<ManagedBot> {
    const keypair = Keypair.generate();
    const botAddress = keypair.publicKey;

    // Derive user PDA
    const [userPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user-pda"), botAddress.toBuffer()],
      this.program.programId
    );

    console.log(`🤖 Creating bot: ${botAddress.toString().slice(0, 8)}...`);

    // Airdrop SOL for testing (devnet/testnet only)
    try {
      const airdropSig = await this.connection.requestAirdrop(
        botAddress,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await this.connection.confirmTransaction(airdropSig);
      console.log(`💰 Airdropped 2 SOL to bot`);
    } catch (error) {
      console.log("⚠️ Airdrop failed (might be on mainnet):", error);
    }

    // Initialize user account
    try {
      await this.program.methods
        .initializeUser()
        .accountsPartial({
          payer: botAddress,
          user: userPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([keypair])
        .rpc({ skipPreflight: true });

      console.log(`✅ Bot user account initialized`);
    } catch (error) {
      console.log("⚠️ User account might already exist:", error);
    }

    const bot: ManagedBot = {
      keypair,
      userPda,
      ai: new BotAI(botAddress),
      gamePda: null,
      isActive: false,
      gameLoopTimer: null,
    };

    this.bots.set(botAddress.toString(), bot);
    return bot;
  }

  /**
   * Join a game with a bot
   */
  async joinGameWithBot(
    gamePda: PublicKey,
    gameState: GameState
  ): Promise<boolean> {
    try {
      // Find or create available bot
      let bot = this.findAvailableBot();
      if (!bot) {
        bot = await this.createBot();
      }

      // Find a valid starting position
      const startingPositions = this.getStartingPositions(gameState);
      if (startingPositions.length === 0) {
        console.log("❌ No valid starting positions available");
        return false;
      }

      const position = startingPositions[0];

      console.log(
        `🎮 Bot joining game at (${position.x}, ${position.y})...`
      );

      // Join the game - matches test.ts pattern exactly
      await this.program.methods
        .joinGame(position.x, position.y)
        .accountsPartial({
          player: bot.keypair.publicKey,
          user: bot.userPda,
          game: gamePda,
          vault: this.vaultPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([bot.keypair])
        .rpc({ skipPreflight: true });

      console.log(`✅ Bot joined game successfully`);

      // Assign bot to game
      bot.gamePda = gamePda;
      bot.isActive = true;

      // Wait for game to be delegated and then start game loop
      setTimeout(async () => {
        await this.checkAndStartGameLoop(bot, gamePda);
      }, 5000);

      return true;
    } catch (error) {
      console.error("Error joining game with bot:", error);
      return false;
    }
  }

  /**
   * Check if game is delegated and start game loop
   */
  private async checkAndStartGameLoop(
    bot: ManagedBot,
    gamePda: PublicKey,
    retryCount: number = 0
  ): Promise<void> {
    try {
      // Check if game account owner is the delegation program
      // DELEGATION_PROGRAM_ID from @magicblock-labs/ephemeral-rollups-sdk
      const DELEGATION_PROGRAM_ID = "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh";
      
      const info = await this.connection.getAccountInfo(gamePda);
      if (info && info.owner.toString() === DELEGATION_PROGRAM_ID) {
        console.log(`✅ Game delegated, starting bot game loop...`);
        this.startBotGameLoop(bot);
      } else {
        if (retryCount < 10) {
          console.log(`⏳ Waiting for game delegation (attempt ${retryCount + 1}/10)...`);
          // Retry after 3 seconds
          setTimeout(() => {
            this.checkAndStartGameLoop(bot, gamePda, retryCount + 1);
          }, 3000);
        } else {
          console.log(`⚠️ Game not delegated after 10 attempts, starting anyway...`);
          this.startBotGameLoop(bot);
        }
      }
    } catch (error) {
      console.error("Error checking delegation:", error);
      // Start anyway in case of error
      this.startBotGameLoop(bot);
    }
  }

  /**
   * Fill a game with bots until it has 4 players
   */
  async fillGameWithBots(
    gamePda: PublicKey,
    gameState: GameState
  ): Promise<number> {
    const currentPlayers = gameState.players.length;
    const neededBots = Math.min(
      4 - currentPlayers,
      this.maxBotsPerGame
    );

    console.log(`🤖 Adding ${neededBots} bot(s) to game...`);

    let addedBots = 0;
    for (let i = 0; i < neededBots; i++) {
      // Fetch updated game state
      const updatedGameState = await this.fetchGameState(gamePda);
      if (!updatedGameState) break;

      const success = await this.joinGameWithBot(gamePda, updatedGameState);
      if (success) {
        addedBots++;
        // Wait a bit between joins
        await this.sleep(2000);
      }
    }

    console.log(`✅ Added ${addedBots} bot(s) to game`);
    return addedBots;
  }

  /**
   * Start the game loop for a bot
   */
  private startBotGameLoop(bot: ManagedBot): void {
    if (!bot.gamePda || bot.gameLoopTimer) return;

    console.log(
      `🎮 Starting game loop for bot ${bot.keypair.publicKey
        .toString()
        .slice(0, 8)}...`
    );

    // Game loop runs every 3-5 seconds
    const loopInterval = 3000 + Math.random() * 2000;

    bot.gameLoopTimer = setInterval(async () => {
      await this.executeBotTurn(bot);
    }, loopInterval);
  }

  /**
   * Execute a single bot turn
   */
  private async executeBotTurn(bot: ManagedBot): Promise<void> {
    if (!bot.gamePda || !bot.isActive) return;

    try {
      // Fetch current game state
      const gameState = await this.fetchGameState(bot.gamePda);
      if (!gameState) return;

      // Check if game is still active
      if (
        gameState.status !== GameStatus.Active &&
        gameState.status !== GameStatus.Waiting
      ) {
        console.log(`🏁 Game ended for bot`);
        this.stopBotGameLoop(bot);
        return;
      }

      // Make decision
      const decision = bot.ai.makeDecision(gameState);

      // Execute action
      if (decision.action === "move" && decision.direction && decision.energy) {
        await this.executeMoveAction(bot, decision.direction, decision.energy);
      } else if (decision.action === "bomb") {
        await this.executeBombAction(bot);
      }
    } catch (error) {
      console.error("Error executing bot turn:", error);
    }
  }

  /**
   * Execute move action - matches test.ts pattern
   */
  private async executeMoveAction(
    bot: ManagedBot,
    direction: Facing,
    energy: number
  ): Promise<void> {
    if (!bot.gamePda) return;

    try {
      // Convert direction to program format matching Rust enum
      let directionObj: any;
      if (direction === Facing.Up) directionObj = { up: {} };
      else if (direction === Facing.Down) directionObj = { down: {} };
      else if (direction === Facing.Left) directionObj = { left: {} };
      else if (direction === Facing.Right) directionObj = { right: {} };

      // Use ephemeral program for game actions after delegation
      await this.ephemeralProgram.methods
        .makeMove(directionObj, energy)
        .accountsPartial({
          player: bot.keypair.publicKey,
          game: bot.gamePda,
        })
        .signers([bot.keypair])
        .rpc({ skipPreflight: true });

      console.log(`🚶 Bot moved ${direction} (energy: ${energy})`);
    } catch (error) {
      // Silently handle errors to avoid spam
      if (error instanceof Error && error.message && !error.message.includes("custom program error")) {
        console.error("Error executing move:", error.message);
      }
    }
  }

  /**
   * Execute bomb action - matches test.ts pattern
   */
  private async executeBombAction(bot: ManagedBot): Promise<void> {
    if (!bot.gamePda) return;

    try {
      // Use ephemeral program for game actions after delegation
      await this.ephemeralProgram.methods
        .placeBomb()
        .accountsPartial({
          player: bot.keypair.publicKey,
          game: bot.gamePda,
        })
        .signers([bot.keypair])
        .rpc({ skipPreflight: true });

      console.log(`💣 Bot placed bomb`);
    } catch (error) {
      // Silently handle errors to avoid spam
      if (error instanceof Error && error.message && !error.message.includes("custom program error")) {
        console.error("Error placing bomb:", error.message);
      }
    }
  }

  /**
   * Stop bot game loop
   */
  private stopBotGameLoop(bot: ManagedBot): void {
    if (bot.gameLoopTimer) {
      clearInterval(bot.gameLoopTimer);
      bot.gameLoopTimer = null;
    }
    bot.isActive = false;
    bot.gamePda = null;
  }

  /**
   * Find an available bot
   */
  private findAvailableBot(): ManagedBot | null {
    for (const bot of this.bots.values()) {
      if (!bot.isActive && !bot.gamePda) {
        return bot;
      }
    }
    return null;
  }

  /**
   * Get valid starting positions for a game
   */
  private getStartingPositions(
    gameState: GameState
  ): Array<{ x: number; y: number }> {
    const positions = [
      { x: 1, y: 1 },
      { x: 11, y: 1 },
      { x: 1, y: 9 },
      { x: 11, y: 9 },
    ];

    // Filter out occupied positions
    return positions.filter(
      (pos) =>
        !GameStateParser.isPositionOccupied(gameState.players, pos.x, pos.y) &&
        GameStateParser.isCellWalkable(gameState.grid, pos.x, pos.y)
    );
  }

  /**
   * Fetch game state from blockchain
   */
  private async fetchGameState(gamePda: PublicKey): Promise<GameState | null> {
    try {
      const gameAccount = await this.ephemeralProgram.account.gamee.fetch(
        gamePda
      );
      return GameStateParser.parseGameAccount(gameAccount);
    } catch (error) {
      console.error("Error fetching game state:", error);
      return null;
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Stop all bots
   */
  stopAllBots(): void {
    for (const bot of this.bots.values()) {
      this.stopBotGameLoop(bot);
    }
    console.log("🛑 All bots stopped");
  }

  /**
   * Get active bots count
   */
  getActiveBotsCount(): number {
    return Array.from(this.bots.values()).filter((b) => b.isActive).length;
  }
}

