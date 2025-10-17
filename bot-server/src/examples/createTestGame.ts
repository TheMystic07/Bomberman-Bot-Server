/**
 * Create a test game - useful for testing the bot server
 * Matches the pattern from test.ts
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BombermanProgramBeta } from "../types/bomberman_program_beta";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import { readFileSync } from "fs";
import { join } from "path";

async function createTestGame() {
  console.log("🎮 Creating Test Game...\n");

  // Setup provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Load IDL
  const idlPath = join(__dirname, "../idl/bomberman_program_beta.json");
  const idl = JSON.parse(readFileSync(idlPath, "utf-8"));

  // Create program instance
  const program = new Program(idl, provider) as Program<BombermanProgramBeta>;

  console.log(`📝 Program ID: ${program.programId.toString()}`);

  // Use wallet as creator
  const creator = (provider.wallet as anchor.Wallet).payer;
  console.log(`👤 Creator: ${creator.publicKey.toString()}\n`);

  // Derive PDAs
  const [creatorUserPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user-pda"), creator.publicKey.toBuffer()],
    program.programId
  );

  const [matchesPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("matches")],
    program.programId
  );

  try {
    // Step 1: Initialize user if not exists
    console.log("👤 Initializing user account...");
    try {
      await program.methods
        .initializeUser()
        .accountsPartial({
          payer: creator.publicKey,
          user: creatorUserPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc({ skipPreflight: true });
      console.log("✅ User initialized\n");
    } catch (error) {
      console.log("ℹ️ User already initialized\n");
    }

    // Step 2: Fetch user account to get game count
    console.log("📊 Fetching user account...");
    const userAccount = await program.account.user.fetch(creatorUserPda);
    console.log(`   Games created: ${userAccount.games}`);
    console.log(`   Games won: ${userAccount.won}\n`);

    // Step 3: Derive game PDA using correct pattern (Big Endian)
    const gameIdBuf = Buffer.alloc(4);
    gameIdBuf.writeUInt32BE(userAccount.games);
    const [gamePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("game"), creatorUserPda.toBuffer(), gameIdBuf],
      program.programId
    );

    console.log(`🎮 Game PDA: ${gamePda.toString()}\n`);

    // Step 4: Initialize game
    console.log("🎮 Creating game...");
    await program.methods
      .initializeGame(null, null, null, null) // Use default values (13x11 grid)
      .accountsPartial({
        creator: creator.publicKey,
        user: creatorUserPda,
        game: gamePda,
        matches: matchesPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator])
      .rpc({ skipPreflight: true });

    console.log("✅ Game created successfully!\n");

    // Step 5: Fetch and display game info
    const gameAccount = await program.account.gamee.fetch(gamePda);
    console.log("📊 Game Info:");
    console.log(`   Game ID: ${gameAccount.id}`);
    console.log(`   Grid Size: ${gameAccount.width}x${gameAccount.height}`);
    console.log(`   Players: ${gameAccount.players.length}/4`);
    console.log(`   Status: ${JSON.stringify(gameAccount.gameState)}`);
    console.log(`   Ticket Price: ${gameAccount.ticketPrice} lamports\n`);

    console.log("✅ Test game created successfully!");
    console.log("\n💡 Tips:");
    console.log("   - Wait 3+ minutes for bots to auto-join");
    console.log("   - Or manually trigger scan: curl -X POST http://localhost:3000/scan");
    console.log("   - Check game status: curl http://localhost:3000/games");

    return {
      gamePda: gamePda.toString(),
      gameId: gameAccount.id,
      status: gameAccount.gameState,
    };
  } catch (error) {
    console.error("❌ Error creating test game:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createTestGame()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { createTestGame };

