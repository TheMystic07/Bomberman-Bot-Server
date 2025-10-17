# Bomberman Bot Server 🤖💣

Automated bot system for the Bomberman blockchain game. This server monitors on-chain matches and automatically joins with intelligent AI bots to fill empty slots.

## Features

- 🔍 **Match Monitoring**: Continuously scans on-chain for active matches
- 🤖 **Intelligent AI Bots**: State machine-based bot AI with strategic decision-making
- 🗺️ **A* Pathfinding**: Advanced navigation on the game grid
- 💣 **Strategic Combat**: Bomb placement, escape logic, and enemy hunting
- ⚡ **Ephemeral Rollup Support**: Fast gameplay using MagicBlock ephemeral rollups
- 🎮 **Auto-Join**: Automatically fills matches with bots after 3 minutes if < 4 players

## Architecture

```
bot-server/
├── src/
│   ├── ai/
│   │   └── botAI.ts          # Bot AI state machine & decision logic
│   ├── controller/
│   │   └── botController.ts  # Bot lifecycle management
│   ├── monitor/
│   │   └── matchMonitor.ts   # On-chain match monitoring
│   ├── utils/
│   │   ├── gameStateParser.ts # Game state parsing utilities
│   │   └── pathfinding.ts     # A* pathfinding algorithm
│   ├── types.ts              # TypeScript type definitions
│   └── server.ts             # Main server entry point
├── package.json
├── tsconfig.json
└── README.md
```

## Prerequisites

- Node.js v16+
- TypeScript
- Solana CLI tools
- Access to Solana devnet/testnet
- Anchor framework

## Installation

1. Install dependencies:
```bash
cd bot-server
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Build the project:
```bash
npm run build
```

## Usage

### Development Mode

Start the server in development mode with hot reload:

```bash
npm run dev
```

### Production Mode

Build and start the server:

```bash
npm run build
npm start
```

## API Endpoints

### Health Check
```
GET /health
```
Returns server health status and active bot count.

**Response:**
```json
{
  "status": "ok",
  "activeBots": 2,
  "monitoredGames": 3
}
```

### List Monitored Games
```
GET /games
```
Returns all currently monitored games.

**Response:**
```json
{
  "games": [
    {
      "gamePda": "...",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "playerCount": 2,
      "status": "waiting",
      "lastChecked": "2024-01-01T00:05:00.000Z"
    }
  ]
}
```

### Manual Scan
```
POST /scan
```
Manually trigger a match scan.

**Response:**
```json
{
  "success": true,
  "message": "Scan completed"
}
```

### Get Game State
```
GET /game/:gamePda
```
Get detailed state of a specific game.

**Response:**
```json
{
  "gameState": {
    "id": 1,
    "width": 13,
    "height": 11,
    "status": "active",
    "players": [...],
    "grid": {...}
  }
}
```

### Stop All Bots
```
POST /stop-bots
```
Stop all active bots.

**Response:**
```json
{
  "success": true,
  "message": "All bots stopped"
}
```

## How It Works

### 1. Match Monitoring
The server continuously scans the on-chain `matches` PDA every 30 seconds to find active games.

### 2. Bot Joining Logic
For each game found, the server checks if:
- Game status is `Waiting`
- Game has fewer than 4 players
- Game has been open for more than 3 minutes

If all conditions are met, bots are automatically spawned to fill the game.

### 3. Bot AI State Machine

Bots operate with a priority-based state machine:

1. **ESCAPING** (Highest Priority): Avoid bomb blasts
2. **ATTACKING**: Place bombs near enemies
3. **COLLECTING**: Break boxes for power-ups
4. **HUNTING**: Move toward enemies
5. **IDLE**: Random exploration

### 4. Pathfinding

Bots use A* pathfinding to navigate the grid, considering:
- Walls and boxes as obstacles
- Active bombs and their blast radius
- Other players' positions
- Safe escape routes

### 5. Action Execution

Once a bot makes a decision, actions are executed on the ephemeral rollup:
- **Move**: Navigate to target position
- **Bomb**: Place bomb at current position
- **Wait**: No action (cooldown or no valid moves)

## Configuration

### Environment Variables

- `ANCHOR_PROVIDER_URL`: Solana RPC endpoint
- `ANCHOR_WALLET`: Path to wallet keypair
- `PROVIDER_ENDPOINT`: Ephemeral rollup endpoint
- `WS_ENDPOINT`: WebSocket endpoint for rollup
- `PORT`: Server port (default: 3000)
- `MAX_BOTS_PER_GAME`: Maximum bots per game (default: 3)
- `SCAN_INTERVAL_MS`: Match scan interval (default: 30000)

### Bot Behavior Tuning

Edit `src/ai/botAI.ts` to adjust:
- Decision cooldown (`decisionCooldown`)
- Attack range
- Escape threshold
- Exploration randomness

## Development

### Project Structure

- **types.ts**: Core type definitions matching the Solana program
- **gameStateParser.ts**: Utilities for parsing on-chain game data
- **pathfinding.ts**: A* implementation for grid navigation
- **botAI.ts**: AI state machine and decision-making logic
- **botController.ts**: Bot lifecycle and transaction execution
- **matchMonitor.ts**: On-chain game scanning and filtering
- **server.ts**: Express server and orchestration

### Adding New Bot Behaviors

1. Add new state to `BotState` enum in `botAI.ts`
2. Implement decision logic in `makeDecision()`
3. Add action execution in `botController.ts`

### Testing

Test the bot system locally by:
1. Creating test games in your local/devnet environment
2. Using the `/scan` endpoint to manually trigger scans
3. Monitoring logs for bot behavior

## Troubleshooting

### Bots not joining games
- Check if wallet has sufficient SOL for transactions
- Verify the ephemeral rollup endpoint is accessible
- Ensure game has valid starting positions

### Pathfinding errors
- Verify grid dimensions match (13x11 default)
- Check if all cells are properly initialized
- Ensure starting positions are not blocked

### Transaction failures
- Increase skipPreflight for faster execution
- Check bot keypair has SOL
- Verify program ID matches deployed program

## License

ISC

## Contributing

Contributions welcome! Please open an issue or PR.

