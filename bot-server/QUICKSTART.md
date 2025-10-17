# Quick Start Guide 🚀

## Prerequisites

1. **Solana Wallet**: Ensure you have a Solana wallet configured
   ```bash
   solana-keygen new  # If you don't have one
   ```

2. **Environment Setup**: Your Solana CLI should be configured for devnet
   ```bash
   solana config set --url https://api.devnet.solana.com
   ```

3. **SOL for Transactions**: Airdrop SOL to your wallet (devnet only)
   ```bash
   solana airdrop 2
   ```

## Installation

1. Navigate to the bot-server directory:
   ```bash
   cd bot-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment:
   ```bash
   # Create .env file (or use env.example)
   cp env.example .env
   ```

4. Edit `.env` file with your configuration:
   ```env
   ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
   ANCHOR_WALLET=~/.config/solana/id.json
   PROVIDER_ENDPOINT=https://devnet.magicblock.app/
   WS_ENDPOINT=wss://devnet.magicblock.app/
   ```

## Running the Bot Server

### Development Mode (with hot reload)

```bash
npm run dev
```

### Production Mode

```bash
# Build the TypeScript code
npm run build

# Start the server
npm start
```

## What Happens When You Start?

1. **Initialization**: The server connects to Solana and loads the Bomberman program
2. **Match Scanning**: Every 30 seconds, it scans for active games on-chain
3. **Auto-Join Logic**: When it finds a game that meets criteria, bots automatically join
4. **Game Play**: Bots use AI to navigate, place bombs, and compete

### Criteria for Bot Joining

Bots automatically join games that meet ALL these conditions:
- ✅ Game status is `Waiting` (not yet started or already ended)
- ✅ Game has been open for **more than 3 minutes**
- ✅ Game has **fewer than 4 players**
- ✅ Valid starting positions are available

## Testing the System

### 1. Create a Test Game

In the main bomberman-program-beta directory:

```bash
cd ../bomberman-program-beta
anchor test
```

Or manually create a game using the test script.

### 2. Monitor Bot Activity

Watch the bot server console for output:
```
🚀 Initializing Bomberman Bot Server...
📝 Program ID: 3XcKrwCkn5e9Gxk7reHZK7SGn4P64hqax4AdTE82fWTU
✅ Blockchain initialized
🌐 Server running on http://localhost:3000
🔍 Starting match monitor...
📡 Scanning for matches...
```

### 3. Use API Endpoints

#### Check Health
```bash
curl http://localhost:3000/health
```

#### List Monitored Games
```bash
curl http://localhost:3000/games
```

#### Manually Trigger Scan
```bash
curl -X POST http://localhost:3000/scan
```

#### Get Specific Game State
```bash
curl http://localhost:3000/game/{GAME_PDA_ADDRESS}
```

#### Stop All Bots
```bash
curl -X POST http://localhost:3000/stop-bots
```

## Understanding Bot Behavior

### State Machine Priority

Bots make decisions based on priority:

1. **🏃 ESCAPING** (Highest Priority)
   - Triggered when near a bomb
   - Finds nearest safe position and moves there

2. **⚔️ ATTACKING**
   - Triggered when enemy is within 3 cells
   - Places bomb if adjacent to enemy and escape route exists

3. **📦 COLLECTING**
   - Breaks boxes to potentially find power-ups
   - Moves adjacent to boxes and places bombs

4. **🎯 HUNTING**
   - Moves toward nearest enemy player
   - Uses A* pathfinding to navigate

5. **🚶 IDLE/EXPLORING**
   - Random exploration when no specific goal
   - Avoids obstacles and other players

### Pathfinding Features

- **A* Algorithm**: Optimal path finding
- **Obstacle Avoidance**: Walls, boxes, and other players
- **Bomb Awareness**: Avoids bomb blast radius
- **Dynamic Updates**: Recalculates paths based on current game state

## Configuration Options

### Environment Variables

Edit your `.env` file:

```env
# Scan interval (milliseconds)
SCAN_INTERVAL_MS=30000

# Maximum bots per game
MAX_BOTS_PER_GAME=3

# Server port
PORT=3000
```

### Code Configuration

Edit `src/ai/botAI.ts` for AI behavior:

```typescript
private decisionCooldown: number = 500; // ms between decisions
```

Edit `src/monitor/matchMonitor.ts` for monitoring:

```typescript
private scanInterval: number = 30000; // 30 seconds
```

## Troubleshooting

### Issue: "Airdrop failed"
**Solution**: This is normal on mainnet. Ensure your wallet has SOL for transactions.

### Issue: "No active games found"
**Solution**: 
- Create a test game using the main program
- Check that games are being registered in the `matches` PDA
- Manually trigger a scan: `curl -X POST http://localhost:3000/scan`

### Issue: "Bot not joining game"
**Solution**:
- Verify game has been open for 3+ minutes
- Check if game has < 4 players
- Ensure game status is "Waiting"
- Check bot wallet has sufficient SOL

### Issue: "Transaction failed"
**Solution**:
- Increase `skipPreflight` duration
- Check RPC endpoint is responsive
- Verify program ID matches deployed program

### Issue: "Cannot find module"
**Solution**:
- Run `npm install` to ensure all dependencies are installed
- Check that TypeScript files are compiled: `npm run build`

## Monitoring Logs

The bot server provides detailed logging:

```
🤖 Creating bot: 7sKd...      # New bot created
💰 Airdropped 2 SOL to bot    # Bot funded
✅ Bot user account initialized # Bot ready
🎮 Bot joining game at (1, 1) # Bot attempting to join
✅ Bot joined game successfully # Join successful
🎮 Starting game loop...       # Bot active in game
🚶 Bot moved up (energy: 2)   # Bot action
💣 Bot placed bomb            # Bot placed bomb
🏁 Game ended for bot         # Game completed
```

## Next Steps

1. **Adjust AI Behavior**: Modify `src/ai/botAI.ts` for different strategies
2. **Add More Bots**: Change `MAX_BOTS_PER_GAME` in config
3. **Tune Performance**: Adjust decision cooldown and scan intervals
4. **Monitor Metrics**: Use the API endpoints to track bot performance

## Support

For issues or questions:
- Check the main README.md for architecture details
- Review code comments in source files
- Test with the included test suite

Happy Bot Battling! 🎮💣

