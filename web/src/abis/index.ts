export const cosmeticChipsAbi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
] as const;

export const matchFactoryAbi = [
  {
    type: "function",
    name: "createMatch",
    stateMutability: "nonpayable",
    inputs: [{ name: "stakeAmount", type: "uint256" }],
    outputs: [{ name: "matchAddress", type: "address" }],
  },
  {
    type: "event",
    name: "MatchCreated",
    inputs: [
      { name: "matchAddress", type: "address", indexed: true },
      { name: "host", type: "address", indexed: true },
      { name: "stakeAmount", type: "uint256", indexed: false },
    ],
  },
] as const;

export const gameMatchAbi = [
  { type: "function", name: "joinMatch", stateMutability: "nonpayable", inputs: [{ name: "outfitTokenIds", type: "uint256[]" }], outputs: [] },
  { type: "function", name: "startMatch", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "rollAndMove", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "buyProperty", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "endTurn", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "skipTurn", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "endByTimeout", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "phase", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "playerCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "players", stateMutability: "view", inputs: [{ name: "", type: "uint8" }], outputs: [{ type: "address" }] },
  { type: "function", name: "currentPlayerIndex", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "turnNumber", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "host", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "stakeAmount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "deadline", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "betResolved", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { type: "function", name: "richestBetWinner", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "isInMatch", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "potSize", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "netWorth", stateMutability: "view", inputs: [{ name: "player", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "lowestActiveNetWorth", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "propertyOwner", stateMutability: "view", inputs: [{ name: "", type: "uint8" }], outputs: [{ type: "address" }] },
  {
    type: "function",
    name: "playerState",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [
      { name: "cash", type: "uint256" },
      { name: "position", type: "uint8" },
      { name: "active", type: "bool" },
      { name: "luckBps", type: "uint16" },
      { name: "inJail", type: "bool" },
      { name: "jailTurns", type: "uint8" },
    ],
  },
  {
    type: "event",
    name: "PlayerJoined",
    inputs: [
      { name: "player", type: "address", indexed: true },
      { name: "index", type: "uint8", indexed: false },
      { name: "luckBps", type: "uint16", indexed: false },
    ],
  },
  { type: "event", name: "MatchStarted", inputs: [{ name: "deadline", type: "uint256", indexed: false }] },
  {
    type: "event",
    name: "DiceRolled",
    inputs: [
      { name: "player", type: "address", indexed: true },
      { name: "die1", type: "uint8", indexed: false },
      { name: "die2", type: "uint8", indexed: false },
      { name: "newPosition", type: "uint8", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PaidRent",
    inputs: [
      { name: "payer", type: "address", indexed: true },
      { name: "receiver", type: "address", indexed: true },
      { name: "propertyId", type: "uint8", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PropertyBought",
    inputs: [
      { name: "buyer", type: "address", indexed: true },
      { name: "propertyId", type: "uint8", indexed: false },
      { name: "price", type: "uint256", indexed: false },
    ],
  },
  { type: "event", name: "Bankrupt", inputs: [{ name: "player", type: "address", indexed: true }] },
  {
    type: "event",
    name: "RichestBetPaid",
    inputs: [
      { name: "winner", type: "address", indexed: true },
      { name: "payout", type: "uint256", indexed: false },
      { name: "treasuryFee", type: "uint256", indexed: false },
    ],
  },
  { type: "event", name: "TurnEnded", inputs: [{ name: "nextPlayer", type: "address", indexed: true }] },
  { type: "event", name: "TurnSkipped", inputs: [{ name: "player", type: "address", indexed: true }] },
  {
    type: "event",
    name: "MatchEnded",
    inputs: [
      { name: "boardWinner", type: "address", indexed: true },
      { name: "reason", type: "string", indexed: false },
    ],
  },
] as const;

export const testnetFaucetAbi = [
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "cooldown",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "lastClaim",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;
