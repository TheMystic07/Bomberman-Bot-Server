# Implementation Notes

## Integration with test.ts

This document explains how the bot server implementation matches the patterns from `test.ts`.

## Key Patterns Implemented

### 1. PDA Derivation

#### User PDA
```typescript
// test.ts pattern:
[userPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("user-pda"), user.publicKey.toBuffer()],
  program.programId
);

// bot-server implementation (botController.ts):
const [userPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("user-pda"), botAddress.toBuffer()],
  this.program.programId
);
```

#### Game PDA (Big Endian Integer)
```typescript
// test.ts pattern:
const gameIdBuf = Buffer.alloc(4);
gameIdBuf.writeUInt32BE(userAccount.games);  // Big Endian!
[gamePda] = PublicKey.findProgramAddressSync(
  [Buffer.from("game"), userPda.toBuffer(), gameIdBuf],
  program.programId
);

// bot-server implementation (botController.ts):
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
```

### 2. Transaction Patterns

#### Initialize User
```typescript
// test.ts:
await program.methods
  .initializeUser()
  .accountsPartial({
    payer: user.publicKey,
    user: userPda,
    systemProgram: SystemProgram.programId,
  })
  .signers([user])
  .rpc({ skipPreflight: true });

// bot-server (botController.ts):
await this.program.methods
  .initializeUser()
  .accountsPartial({
    payer: botAddress,
    user: userPda,
    systemProgram: SystemProgram.programId,
  })
  .signers([keypair])
  .rpc({ skipPreflight: true });
```

#### Join Game
```typescript
// test.ts:
await program.methods
  .joinGame(11, 1)
  .accountsPartial({
    player: admin.publicKey,
    user: payerPda,
    game: gamePda,
    vault: vaultPda,
    systemProgram: SystemProgram.programId,
  })
  .signers([admin.payer])
  .rpc({ skipPreflight: true });

// bot-server (botController.ts):
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
```

### 3. Ephemeral Rollup Integration

#### Program Setup
```typescript
// test.ts:
const providerEphemeralRollup = new anchor.AnchorProvider(
  new anchor.web3.Connection(
    process.env.PROVIDER_ENDPOINT || "https://devnet.magicblock.app/",
    { wsEndpoint: process.env.WS_ENDPOINT || "wss://devnet.magicblock.app/" }
  ),
  anchor.Wallet.local()
);

const ephemeralProgram = new Program(
  program.idl,
  providerEphemeralRollup
) as Program<BombermanProgramBeta>;

// bot-server (server.ts):
const ephemeralProvider = new anchor.AnchorProvider(
  new anchor.web3.Connection(
    process.env.PROVIDER_ENDPOINT || "https://devnet.magicblock.app/",
    { wsEndpoint: process.env.WS_ENDPOINT || "wss://devnet.magicblock.app/" }
  ),
  anchor.Wallet.local()
);

this.ephemeralProgram = new Program(idl, ephemeralProvider);
```

#### Delegation Check
```typescript
// test.ts:
const info = await provider.connection.getAccountInfo(gamePda);
expect(info.owner.toBase58()).to.equal(DELEGATION_PROGRAM_ID.toBase58());

// bot-server (botController.ts):
const DELEGATION_PROGRAM_ID = "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh";
const info = await this.connection.getAccountInfo(gamePda);
if (info && info.owner.toString() === DELEGATION_PROGRAM_ID) {
  // Game is delegated, use ephemeral program
}
```

#### Game Actions on Ephemeral Program
```typescript
// test.ts uses ephemeralProgram for undelegate:
await ephemeralProgram.methods
  .undelegate()
  .accountsPartial({
    payer: user.publicKey,
    user: userPda,
    game: gamePda,
  })
  .signers([user])
  .rpc({ skipPreflight: true });

// bot-server uses ephemeralProgram for all game actions:
await this.ephemeralProgram.methods
  .makeMove(directionObj, energy)
  .accountsPartial({
    player: bot.keypair.publicKey,
    game: bot.gamePda,
  })
  .signers([bot.keypair])
  .rpc({ skipPreflight: true });
```

### 4. Direction Enum Format

```typescript
// Rust enum variants require empty object format:
{ up: {} }    // not just "up"
{ down: {} }
{ left: {} }
{ right: {} }

// bot-server implementation:
if (direction === Facing.Up) directionObj = { up: {} };
else if (direction === Facing.Down) directionObj = { down: {} };
else if (direction === Facing.Left) directionObj = { left: {} };
else if (direction === Facing.Right) directionObj = { right: {} };
```

### 5. Account Fetching

```typescript
// test.ts:
const userAccount = await program.account.user.fetch(userPda);
const gameAccount = await program.account.gamee.fetch(gamePda);

// bot-server:
const userAccount = await this.program.account.user.fetch(bot.userPda);
const gameAccount = await this.ephemeralProgram.account.gamee.fetch(gamePda);
```

## Important Details

### Big Endian vs Little Endian

**Critical**: The game ID buffer uses **Big Endian** (`writeUInt32BE`), not Little Endian!

```typescript
// ✅ Correct:
gameIdBuf.writeUInt32BE(gameId);

// ❌ Wrong:
gameIdBuf.writeUInt32LE(gameId);  // Would generate wrong PDA!
```

### Account Structure

The `user` account in `joinGame` is the **PDA derived from the player's public key**, not the player's public key itself:

```typescript
// ✅ Correct:
const [userPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("user-pda"), playerPublicKey.toBuffer()],
  programId
);

await program.methods.joinGame(x, y)
  .accountsPartial({
    player: playerPublicKey,  // Actual wallet
    user: userPda,             // PDA from player's pubkey
    // ...
  })
```

### Program Switching

- **Base Program**: Used for user initialization, game creation, joining, delegation
- **Ephemeral Program**: Used for game actions (move, bomb) after delegation

```typescript
// Before delegation: use base program
await this.program.methods.joinGame(...);

// After delegation: use ephemeral program  
await this.ephemeralProgram.methods.makeMove(...);
```

### Error Handling

The bot server implements silent error handling for game actions to avoid log spam:

```typescript
catch (error) {
  // Only log non-game errors
  if (error.message && !error.message.includes("custom program error")) {
    console.error("Error:", error.message);
  }
}
```

### Retry Logic

Unlike test.ts which expects immediate delegation, the bot server polls for delegation:

```typescript
private async checkAndStartGameLoop(
  bot: ManagedBot,
  gamePda: PublicKey,
  retryCount: number = 0
): Promise<void> {
  // Check if delegated
  // If not, retry up to 10 times with 3-second intervals
  // After 10 attempts, start anyway
}
```

## File Structure Comparison

### test.ts Structure
```
- Setup providers (base + ephemeral)
- Setup program instances
- Derive PDAs
- Run tests:
  1. Initialize program
  2. Initialize user
  3. Create game
  4. Join game
  5. Delegate
  6. Undelegate
```

### bot-server Structure
```
src/
├── server.ts           # Setup providers + programs (like test.ts before block)
├── controller/
│   └── botController.ts # Bot lifecycle (initialize, join, play)
├── monitor/
│   └── matchMonitor.ts # Scan for games (reads matches PDA)
├── ai/
│   └── botAI.ts        # Decision making (which actions to take)
└── utils/
    ├── gameStateParser.ts # Parse game accounts
    └── pathfinding.ts     # A* navigation
```

## Testing Utilities

### createTestGame.ts
Mimics the game creation from test.ts:
- Initialize user
- Derive game PDA
- Create game
- Register in matches

### testBotIntegration.ts
Tests bot join functionality:
- Create bot
- Initialize bot user
- Find game from matches
- Join game

Both follow test.ts patterns exactly.

## Summary

The bot server implementation is a **production-ready, automated version** of the manual tests in `test.ts`. Every instruction call, PDA derivation, and account structure matches the test patterns exactly. The main differences are:

1. **Automation**: Continuously monitors instead of one-time test
2. **Multiple Bots**: Manages many bots instead of one user
3. **AI Logic**: Makes intelligent decisions instead of fixed actions
4. **Retry Logic**: Handles network issues and timing gracefully
5. **API Interface**: Exposes monitoring and control endpoints

But the **core blockchain interactions are identical** to test.ts.

