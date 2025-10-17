/**
 * Debug tool to check what's in the matches account
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BombermanProgramBeta } from "../types/bomberman_program_beta";
import { PublicKey } from "@solana/web3.js";
import { readFileSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function debugMatches() {
  console.log("🔍 Debugging Matches Account...\n");

  // Setup provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Load IDL
  const idlPath = join(__dirname, "../idl/bomberman_program_beta.json");
  const idl = JSON.parse(readFileSync(idlPath, "utf-8"));
  const program = new Program(idl, provider) as Program<BombermanProgramBeta>;

  console.log(`📝 Program ID: ${program.programId.toString()}\n`);

  // Derive matches PDA
  const [matchesPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("matches")],
    program.programId
  );

  console.log(`🎯 Matches PDA: ${matchesPda.toString()}\n`);

  try {
    // Check if account exists
    const accountInfo = await provider.connection.getAccountInfo(matchesPda);
    
    if (!accountInfo) {
      console.log("❌ Matches account does NOT exist on-chain!");
      console.log("\n💡 Solution: Run the initialize instruction:");
      console.log("   await program.methods.initialize()...\n");
      return;
    }

    console.log("✅ Matches account exists on-chain\n");
    console.log(`📊 Account Info:`);
    console.log(`   Owner: ${accountInfo.owner.toString()}`);
    console.log(`   Data Length: ${accountInfo.data.length} bytes`);
    console.log(`   Lamports: ${accountInfo.lamports}\n`);

    // Fetch and decode the matches account
    const matchesAccount = await program.account.matches.fetch(matchesPda);
    
    console.log(`📋 Matches Account Data:`);
    console.log(`   Active Games: ${matchesAccount.activeGames.length}\n`);

    if (matchesAccount.activeGames.length === 0) {
      console.log("ℹ️  No games registered in matches account");
      console.log("\n💡 When creating games, make sure to pass the matches PDA:");
      console.log("   .accountsPartial({");
      console.log("     ...,");
      console.log("     matches: matchesPda,  // ← Important!");
      console.log("   })\n");
    } else {
      console.log("🎮 Games in Matches Account:");
      for (let i = 0; i < matchesAccount.activeGames.length; i++) {
        const gamePda = matchesAccount.activeGames[i];
        console.log(`\n   ${i + 1}. ${gamePda.toString()}`);
        
        try {
          const gameAccount = await program.account.gamee.fetch(gamePda);
          console.log(`      Status: ${JSON.stringify(gameAccount.gameState)}`);
          console.log(`      Players: ${gameAccount.players.length}/4`);
          console.log(`      Grid: ${gameAccount.width}x${gameAccount.height}`);
        } catch (error) {
          console.log(`      ⚠️ Could not fetch game details: ${error.message}`);
        }
      }
      console.log("");
    }

    // Check if bot server can read it
    console.log("✅ Bot server should be able to see these games!");
    console.log("\n💡 If bot server still doesn't see games:");
    console.log("   1. Make sure bot server is running");
    console.log("   2. Check the wallet path in .env");
    console.log("   3. Restart the bot server: npm run dev");

  } catch (error) {
    console.error("❌ Error:", error);
    
    if (error.message && error.message.includes("Account does not exist")) {
      console.log("\n💡 The matches account hasn't been initialized yet!");
      console.log("   Run: anchor test (with the initialize test)");
    }
  }
}

// Run if called directly
if (require.main === module) {
  debugMatches()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { debugMatches };

