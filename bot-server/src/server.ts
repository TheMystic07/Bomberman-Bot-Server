import dotenv from "dotenv";
// Load environment variables from .env file
dotenv.config();

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import express from "express";
import { readFileSync } from "fs";
import { join } from "path";
import { MatchMonitor } from "./monitor/matchMonitor";
import { BotController } from "./controller/botController";
import { GameState, BombermanProgramBeta } from "./types";

/**
 * Main Bot Server
 */
class BombermanBotServer {
  private app: express.Application;
  private connection!: Connection;
  private ephemeralConnection!: Connection;
  private program!: Program<BombermanProgramBeta>;
  private ephemeralProgram!: Program<BombermanProgramBeta>;
  private matchMonitor!: MatchMonitor;
  private botController!: BotController;
  private matchesPda!: PublicKey;
  private vaultPda!: PublicKey;
  private port: number = 3000;

  constructor() {
    this.app = express();
    this.setupExpress();

    // Initialize connections and programs
    this.initializeBlockchain();
  }

  /**
   * Initialize blockchain connections
   */
  private async initializeBlockchain(): Promise<void> {
    console.log("🚀 Initializing Bomberman Bot Server...");

    // Setup provider for base chain (devnet)
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    // Setup ephemeral rollup provider
    const ephemeralProvider = new anchor.AnchorProvider(
      new anchor.web3.Connection(
        process.env.PROVIDER_ENDPOINT || "https://devnet.magicblock.app/",
        {
          wsEndpoint:
            process.env.WS_ENDPOINT || "wss://devnet.magicblock.app/",
        }
      ),
      anchor.Wallet.local()
    );

    // Load IDL
    const idlPath = join(__dirname, "idl/bomberman_program_beta.json");
    const idl = JSON.parse(readFileSync(idlPath, "utf-8")) as BombermanProgramBeta;

    // Create program instances
    this.connection = provider.connection;
    this.ephemeralConnection = ephemeralProvider.connection;

    const programId = new PublicKey(idl.address);
    this.program = new Program(idl, provider);
    this.ephemeralProgram = new Program(idl, ephemeralProvider);

    console.log(`📝 Program ID: ${programId.toString()}`);

    // Derive PDAs
    [this.matchesPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("matches")],
      programId
    );

    [this.vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault")],
      programId
    );

    console.log(`🎯 Matches PDA: ${this.matchesPda.toString()}`);
    console.log(`💰 Vault PDA: ${this.vaultPda.toString()}`);

    // Initialize controllers
    this.botController = new BotController(
      this.connection,
      this.program,
      this.ephemeralProgram,
      this.vaultPda
    );

    this.matchMonitor = new MatchMonitor(
      this.connection,
      this.program,
      this.matchesPda
    );

    // Override the onGameNeedsBots handler
    this.matchMonitor.onGameNeedsBots = async (
      gamePda: PublicKey,
      gameState: GameState
    ) => {
      await this.handleGameNeedsBots(gamePda, gameState);
    };

    console.log("✅ Blockchain initialized");
  }

  /**
   * Setup Express server
   */
  private setupExpress(): void {
    this.app.use(express.json());

    // Health check endpoint
    this.app.get("/health", (req, res) => {
      res.json({
        status: "ok",
        activeBots: this.botController?.getActiveBotsCount() || 0,
        monitoredGames:
          this.matchMonitor?.getMonitoredGames().size || 0,
      });
    });

    // Get monitored games
    this.app.get("/games", (req, res) => {
      const games = Array.from(
        this.matchMonitor.getMonitoredGames().entries()
      ).map(([key, metadata]) => ({
        gamePdaKey: key,
        gamePda: metadata.gamePda,
        createdAt: metadata.createdAt,
        playerCount: metadata.playerCount,
        status: metadata.status,
        lastChecked: metadata.lastChecked,
      }));
      res.json({ games });
    });

    // Manually trigger a scan
    this.app.post("/scan", async (req, res) => {
      try {
        await this.matchMonitor.scan();
        res.json({ success: true, message: "Scan completed" });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ success: false, error: errorMessage });
      }
    });

    // Get specific game state
    this.app.get("/game/:gamePda", async (req, res) => {
      try {
        const gamePda = new PublicKey(req.params.gamePda);
        const gameState = await this.matchMonitor.getGameState(gamePda);
        res.json({ gameState });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: errorMessage });
      }
    });

    // Stop all bots
    this.app.post("/stop-bots", (req, res) => {
      this.botController.stopAllBots();
      res.json({ success: true, message: "All bots stopped" });
    });

    console.log("✅ Express routes configured");
  }

  /**
   * Handle when a game needs bots
   */
  private async handleGameNeedsBots(
    gamePda: PublicKey,
    gameState: GameState
  ): Promise<void> {
    console.log(
      `🎮 Handling game that needs bots: ${gamePda.toString().slice(0, 8)}...`
    );

    try {
      await this.botController.fillGameWithBots(gamePda, gameState);
    } catch (error) {
      console.error("Error filling game with bots:", error);
    }
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    await this.initializeBlockchain();

    // Start match monitor
    this.matchMonitor.start();

    // Start Express server
    this.app.listen(this.port, () => {
      console.log(`🌐 Server running on http://localhost:${this.port}`);
      console.log(`📊 Health check: http://localhost:${this.port}/health`);
      console.log(`🎮 Games list: http://localhost:${this.port}/games`);
      console.log("");
      console.log("🤖 Bot server is now monitoring for matches!");
      console.log("📡 Scanning for games every 30 seconds...");
    });
  }

  /**
   * Stop the server
   */
  stop(): void {
    this.matchMonitor.stop();
    this.botController.stopAllBots();
    console.log("🛑 Server stopped");
  }
}

// Start server
const server = new BombermanBotServer();

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Shutting down gracefully...");
  server.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n👋 Shutting down gracefully...");
  server.stop();
  process.exit(0);
});

// Start the server
server.start().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});

export default BombermanBotServer;

