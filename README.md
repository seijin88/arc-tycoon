# Arc Tycoon

Trustless, Monopoly-style board matches on **Arc Testnet** with transferable **CHIP** stakes, **richest-first** side bets (Option A), and cosmetic outfit NFTs that boost luck.

## Rules (on-chain)

| Rule | Value |
|------|--------|
| Players | 2–4 per match |
| Duration | 30 minutes max (`endByTimeout`) |
| Turn skip | Anyone can call `skipTurn()` after 90s idle |
| Starting cash | 1500 CHIP (in-match, not wallet) |
| **Richest first (Option A)** | First active player with `netWorth >= 2 × lowestActiveNetWorth` wins the **bet pot**; match **continues** |
| Net worth | Cash + ½ property price for each owned deed |
| Bet token | **CHIP** (`CosmeticChips`) — transferable ERC-20 |

## Contracts

| Contract | Role |
|----------|------|
| `CosmeticChips` | CHIP ERC-20 |
| `OutfitNFT` | Cosmetic wearables |
| `CosmeticRegistry` | Slot + luck caps (max 5% total) |
| `MatchFactory` | Deploys `GameMatch` instances |
| `GameMatch` | Lobby, board, bet escrow, richest-first |
| `TestnetFaucet` | Drip CHIP on testnet |

## Arc Testnet

| Parameter | Value |
|-----------|--------|
| Chain ID | `5042002` |
| RPC | `https://rpc.testnet.arc.network` |
| Gas | USDC ([faucet](https://faucet.circle.com)) |
| Explorer | [testnet.arcscan.app](https://testnet.arcscan.app) |

## Setup

Install [Foundry](https://book.getfoundry.sh/getting-started/installation), then:

```bash
forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge install foundry-rs/forge-std --no-commit
cp .env.example .env
# Set PRIVATE_KEY in .env (testnet wallet only)
```

Build & test:

```bash
forge build
forge test
```

## Deploy to Arc Testnet

1. Fund deployer with **USDC** from the Circle faucet (gas).
2. Set `PRIVATE_KEY` and `ARC_TESTNET_RPC_URL` in `.env`.
3. Run:

```bash
forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://rpc.testnet.arc.network \
  --broadcast
```

Save logged addresses. Grant players CHIP via `TestnetFaucet.claim()` (after faucet has `MINTER_ROLE` — deploy script does this).

## Play flow (testnet)

1. `MatchFactory.createMatch(stake)` — note the `matchAddress` from the event.
2. Each player: `CHIP.approve(matchAddress, stake)` → `GameMatch.joinMatch(outfitTokenIds)`.
3. Host: `startMatch()` once 2–4 players have joined.
4. Each turn: `rollAndMove()` → optional `buyProperty()` → `endTurn()`.
5. When **richest first** fires, bet CHIP is paid out; keep playing until timeout or one player left.
6. `endByTimeout()` after 30 minutes if needed.

## Register test cosmetics

```solidity
// As admin, after minting outfits to a player:
registry.registerItem(tokenId, CosmeticRegistry.Slot.Head, 200); // 2% luck
```

## Web UI

React + Vite app with wallet connect, board, actions, and a **live on-chain event feed** (factory + match logs via RPC subscriptions).

```bash
cd web
cp .env.example .env
# After deploy, set:
#   VITE_FACTORY_ADDRESS=0x...
#   VITE_CHIP_ADDRESS=0x...
#   VITE_FAUCET_ADDRESS=0x...
npm install
npm run dev
```

Open http://localhost:5173 — connect MetaMask on **Arc Testnet (5042002)**.

### Event listener

`web/src/services/eventListener.ts` uses `watchContractEvent` for all `GameMatch` events and `MatchCreated` on the factory. `useEventFeed` replays the last ~5000 blocks when you load a match, then streams new logs.

## Project layout

```
src/           Solidity contracts
script/        Deploy.s.sol
test/          Forge tests
web/           Game UI + event listener
foundry.toml   Arc RPC profile
```

## License

MIT
