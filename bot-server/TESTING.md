# Bot Server Testing Guide

This guide shows you how to test the bot server following the exact patterns from `test.ts`.

## Prerequisites

1. **Solana CLI** configured for devnet:
   ```bash
   solana config set --url https://api.devnet.solana.com
   ```

2. **Wallet** with SOL:
   ```bash
   solana airdrop 2
   ```

3. **Dependencies** installed:
   ```bash
   cd bot-server
   npm install
   ```

## Testing Workflow

### Step 1: Initialize the Program (One-time Setup)

First, initialize the program's global state (matches and vault PDAs):

```bash
cd ../bomberman-program-beta
anchor test --skip-local-validator
```

Or manually in the test file, run the initialize test once.

### Step 2: Create a Test Game

Use the provided script to create a test game:

```bash
cd bot-server
npm run create-game
```

This will:
- ✅ Initialize your user account
- ✅ Create a new game
- ✅ Register it in the matches PDA
- ✅ Display the game PDA and details

**Expected Output:**
```
🎮 Creating Test Game...

📝 Program ID: 3XcKrwCkn5e9Gxk7reHZK7SGn4P64hqax4AdTE82fWTU
👤 Creator: 7sKd...

✅ User initialized
📊 Fetching user account...
   Games created: 0
   Games won: 0

🎮 Game PDA: Ab3x...

✅ Game created successfully!

📊 Game Info:
   Game ID: 0
   Grid Size: 13x11
   Players: 0/4
   Status: {"waiting":{}}
   Ticket Price: 100000000 lamports
```

### Step 3: Test Bot Integration

Test that bots can join games correctly:

```bash
npm run test-bot
```

This will:
- ✅ Create a bot with a new keypair
- ✅ Airdrop SOL to the bot
- ✅ Initialize the bot's user account
- ✅ Find an active game from the matches PDA
- ✅ Join the game at position (1, 1)

**Expected Output:**
```
🧪 Testing Bot Integration...

📝 Program ID: 3XcKrwCkn5e9Gxk7reHZK7SGn4P64hqax4AdTE82fWTU
🤖 Bot Address: 9vZy...
👤 Bot User PDA: Bx4t...

💰 Requesting airdrop...
✅ Airdrop confirmed

👤 Initializing bot user account...
✅ Bot user initialized

🔍 Fetching active matches...
📊 Found 1 active game(s)

🎮 Joining game: Ab3x...
   Players: 0/4
   Status: {"waiting":{}}

✅ Bot joined game successfully!

📊 Updated player count: 1/4
```

### Step 4: Start the Bot Server

Now start the full bot server to automatically monitor and join games:

```bash
npm run dev
```

**Expected Output:**
```
🚀 Initializing Bomberman Bot Server...
📝 Program ID: 3XcKrwCkn5e9Gxk7reHZK7SGn4P64hqax4AdTE82fWTU
🎯 Matches PDA: Dx5y...
💰 Vault PDA: Ex6z...
✅ Blockchain initialized
🌐 Server running on http://localhost:3000
🔍 Starting match monitor...
📡 Scanning for matches...
```

### Step 5: Monitor Bot Activity

The bot server will:

1. **Scan every 30 seconds** for games
2. **Check criteria**:
   - Game status: Waiting
   - Game age: > 3 minutes
   - Players: < 4

3. **Auto-join** when criteria met:
   ```
   🎯 Game Ab3x... needs bots! (1/4 players)
   🤖 Adding 3 bot(s) to game...
   🤖 Creating bot: 5pQw...
   💰 Airdropped 2 SOL to bot
   ✅ Bot user account initialized
   🎮 Bot joining game at (11, 1)...
   ✅ Bot joined game successfully
   ```

4. **Wait for delegation** before playing:
   ```
   ⏳ Waiting for game delegation (attempt 1/10)...
   ✅ Game delegated, starting bot game loop...
   🎮 Starting game loop for bot 5pQw...
   ```

5. **Play the game**:
   ```
   🚶 Bot moved up (energy: 2)
   💣 Bot placed bomb
   🚶 Bot moved right (energy: 1)
   🏁 Game ended for bot
   ```

### Step 6: Test API Endpoints

While the server is running, test the API:

#### Check Server Health
```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "ok",
  "activeBots": 3,
  "monitoredGames": 1
}
```

#### List Monitored Games
```bash
curl http://localhost:3000/games
```

**Response:**
```json
{
  "games": [
    {
      "gamePda": "Ab3x...",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "playerCount": 4,
      "status": "active",
      "lastChecked": "2024-01-01T00:05:00.000Z"
    }
  ]
}
```

#### Manually Trigger Scan
```bash
curl -X POST http://localhost:3000/scan
```

**Response:**
```json
{
  "success": true,
  "message": "Scan completed"
}
```

#### Get Specific Game State
```bash
curl http://localhost:3000/game/Ab3x...
```

**Response:**
```json
{
  "gameState": {
    "id": 0,
    "width": 13,
    "height": 11,
    "status": "active",
    "players": [...],
    "grid": {...}
  }
}
```

## Integration Patterns (from test.ts)

### User PDA Derivation
```typescript
const [userPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("user-pda"), userPublicKey.toBuffer()],
  programId
);
```

### Game PDA Derivation (Big Endian!)
```typescript
const gameIdBuf = Buffer.alloc(4);
gameIdBuf.writeUInt32BE(gameId); // Note: Big Endian!
const [gamePda] = PublicKey.findProgramAddressSync(
  [Buffer.from("game"), userPda.toBuffer(), gameIdBuf],
  programId
);
```

### Initialize User
```typescript
await program.methods
  .initializeUser()
  .accountsPartial({
    payer: userPublicKey,
    user: userPda,
    systemProgram: SystemProgram.programId,
  })
  .signers([userKeypair])
  .rpc({ skipPreflight: true });
```

### Join Game
```typescript
await program.methods
  .joinGame(x, y) // Position on grid (u8, u8)
  .accountsPartial({
    player: playerPublicKey,
    user: playerUserPda,
    game: gamePda,
    vault: vaultPda,
    systemProgram: SystemProgram.programId,
  })
  .signers([playerKeypair])
  .rpc({ skipPreflight: true });
```

### Delegate to Ephemeral Rollup
```typescript
await program.methods
  .delegate()
  .accountsPartial({
    payer: creatorPublicKey,
    user: creatorUserPda,
    game: gamePda,
  })
  .signers([creatorKeypair])
  .rpc({ skipPreflight: true });
```

### Make Move (on Ephemeral Program)
```typescript
// Direction: { up: {} } | { down: {} } | { left: {} } | { right: {} }
await ephemeralProgram.methods
  .makeMove({ up: {} }, 2) // direction, energy
  .accountsPartial({
    player: playerPublicKey,
    game: gamePda,
  })
  .signers([playerKeypair])
  .rpc({ skipPreflight: true });
```

### Place Bomb (on Ephemeral Program)
```typescript
await ephemeralProgram.methods
  .placeBomb()
  .accountsPartial({
    player: playerPublicKey,
    game: gamePda,
  })
  .signers([playerKeypair])
  .rpc({ skipPreflight: true });
```

### Undelegate (on Ephemeral Program)
```typescript
await ephemeralProgram.methods
  .undelegate()
  .accountsPartial({
    payer: creatorPublicKey,
    user: creatorUserPda,
    game: gamePda,
  })
  .signers([creatorKeypair])
  .rpc({ skipPreflight: true });
```

## Troubleshooting

### Issue: "User account already exists"
**Solution**: This is normal. The script catches this and continues.

### Issue: "No active games found"
**Solution**: 
```bash
npm run create-game
```

### Issue: "Game is full"
**Solution**: Create a new game or wait for the current game to finish.

### Issue: "Airdrop failed"
**Solution**: 
- Wait a few seconds and retry
- Check you're on devnet
- Request manually: `solana airdrop 2`

### Issue: "Bot not moving"
**Solution**:
- Check that game is delegated (should see "Game delegated" in logs)
- Verify bot is in active game: `curl http://localhost:3000/health`
- Check for errors in server logs

### Issue: "Transaction failed"
**Solution**:
- Increase `skipPreflight: true` already set
- Check RPC endpoint is responsive
- Verify sufficient SOL in bot wallets

## Complete Test Flow

```bash
# Terminal 1: Create a game
cd bot-server
npm run create-game

# Wait 3+ minutes for bot auto-join criteria
# Or manually trigger (for testing)

# Terminal 2: Start bot server
npm run dev

# Terminal 3: Monitor via API
curl http://localhost:3000/health
curl http://localhost:3000/games

# Manually trigger scan (skip 3-minute wait)
curl -X POST http://localhost:3000/scan
```

## Next Steps

1. **Adjust Bot Timing**: Edit `src/ai/botAI.ts` - change `decisionCooldown`
2. **Change Scan Interval**: Edit `src/monitor/matchMonitor.ts` - change `scanInterval`
3. **Add More Bots**: Edit `.env` - change `MAX_BOTS_PER_GAME`
4. **Custom Strategies**: Modify bot AI in `src/ai/botAI.ts`

## Success Indicators

✅ Bot server starts without errors
✅ Games are detected and monitored
✅ Bots join games automatically
✅ Bots wait for delegation before playing
✅ Bots make moves and place bombs
✅ Games complete successfully
✅ No transaction failures

Happy Testing! 🎮🤖

