/**
 * Test bot integration - demonstrates how to use the bot server programmatically
 * Matches the patterns from test.ts
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BombermanProgramBeta } from "../types/bomberman_program_beta";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import { readFileSync } from "fs";
import { join } from "path";

async function testBotIntegration() {
  console.log("🧪 Testing Bot Integration...\n");

  // Setup provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Load IDL
  const idlPath = join(__dirname, "../idl/bomberman_program_beta.json");
  const idl = JSON.parse(readFileSync(idlPath, "utf-8"));

  // Create program instance
  const program = new Program(idl, provider) as Program<BombermanProgramBeta>;

  console.log(`📝 Program ID: ${program.programId.toString()}`);

  // Derive PDAs
  const [matchesPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("matches")],
    program.programId
  );

  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault")],
    program.programId
  );

  console.log(`🎯 Matches PDA: ${matchesPda.toString()}`);
  console.log(`💰 Vault PDA: ${vaultPda.toString()}\n`);

  // Create test bot
  const botKeypair = Keypair.generate();
  const [botUserPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user-pda"), botKeypair.publicKey.toBuffer()],
    program.programId
  );

  console.log(`🤖 Bot Address: ${botKeypair.publicKey.toString()}`);
  console.log(`👤 Bot User PDA: ${botUserPda.toString()}\n`);

  try {
    // Step 1: Airdrop SOL to bot (devnet only)
    console.log("💰 Requesting airdrop...");
    const airdropSig = await provider.connection.requestAirdrop(
      botKeypair.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig);
    console.log("✅ Airdrop confirmed\n");

    // Step 2: Initialize bot user account
    console.log("👤 Initializing bot user account...");
    await program.methods
      .initializeUser()
      .accountsPartial({
        payer: botKeypair.publicKey,
        user: botUserPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([botKeypair])
      .rpc({ skipPreflight: true });
    console.log("✅ Bot user initialized\n");

    // Step 3: Fetch matches to find an available game
    console.log("🔍 Fetching active matches...");
    const matchesAccount = await program.account.matches.fetch(matchesPda);
    console.log(`📊 Found ${matchesAccount.activeGames.length} active game(s)\n`);

    if (matchesAccount.activeGames.length > 0) {
      const gamePda = matchesAccount.activeGames[0];
      console.log(`🎮 Joining game: ${gamePda.toString()}`);

      // Step 4: Fetch game state
      const gameAccount = await program.account.gamee.fetch(gamePda);
      console.log(`   Players: ${gameAccount.players.length}/4`);
      console.log(`   Status: ${JSON.stringify(gameAccount.gameState)}\n`);

      // Step 5: Join the game (if space available)
      if (gameAccount.players.length < 4) {
        console.log("🎯 Joining game at position (1, 1)...");
        await program.methods
          .joinGame(1, 1)
          .accountsPartial({
            player: botKeypair.publicKey,
            user: botUserPda,
            game: gamePda,
            vault: vaultPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([botKeypair])
          .rpc({ skipPreflight: true });
        console.log("✅ Bot joined game successfully!\n");

        // Fetch updated game state
        const updatedGame = await program.account.gamee.fetch(gamePda);
        console.log(`📊 Updated player count: ${updatedGame.players.length}/4\n`);
      } else {
        console.log("⚠️ Game is full, cannot join\n");
      }
    } else {
      console.log("ℹ️ No active games found. Create a game first using the main test suite.\n");
    }

    console.log("✅ Bot integration test completed!");
  } catch (error) {
    console.error("❌ Error during bot integration test:", error);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testBotIntegration()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { testBotIntegration };

