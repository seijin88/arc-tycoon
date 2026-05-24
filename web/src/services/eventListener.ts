import {
  type Address,
  type Log,
  type PublicClient,
  decodeEventLog,
  formatEther,
} from "viem";
import { gameMatchAbi, matchFactoryAbi } from "../abis";
import type { FeedEvent } from "../types/events";
import { shortAddress } from "../lib/format";

type OnFeedEvent = (event: FeedEvent) => void;

function feedId(log: Log): string {
  return `${log.blockNumber ?? 0}-${log.logIndex ?? 0}-${log.transactionHash ?? "local"}`;
}

function summarizeMatchLog(log: Log): FeedEvent | null {
  try {
    const decoded = decodeEventLog({
      abi: gameMatchAbi,
      data: log.data,
      topics: log.topics,
    });

    const base: Omit<FeedEvent, "name" | "summary"> = {
      id: feedId(log),
      at: Date.now(),
      source: "match",
      txHash: log.transactionHash ?? undefined,
      blockNumber: log.blockNumber ?? undefined,
    };

    switch (decoded.eventName) {
      case "PlayerJoined":
        return {
          ...base,
          name: decoded.eventName,
          summary: `${shortAddress(decoded.args.player)} joined (luck ${Number(decoded.args.luckBps) / 100}%)`,
        };
      case "MatchStarted":
        return {
          ...base,
          name: decoded.eventName,
          summary: `Match live — ends ${new Date(Number(decoded.args.deadline) * 1000).toLocaleTimeString()}`,
        };
      case "DiceRolled":
        return {
          ...base,
          name: decoded.eventName,
          summary: `${shortAddress(decoded.args.player)} rolled ${decoded.args.die1}+${decoded.args.die2} → space ${decoded.args.newPosition}`,
        };
      case "PropertyBought":
        return {
          ...base,
          name: decoded.eventName,
          summary: `${shortAddress(decoded.args.buyer)} bought lot ${Number(decoded.args.propertyId) + 1} for ${formatEther(decoded.args.price)} CHIP`,
        };
      case "PaidRent":
        return {
          ...base,
          name: decoded.eventName,
          summary: `${shortAddress(decoded.args.payer)} paid ${formatEther(decoded.args.amount)} CHIP rent`,
        };
      case "RichestBetPaid":
        return {
          ...base,
          name: decoded.eventName,
          summary: `Richest first: ${shortAddress(decoded.args.winner)} won ${formatEther(decoded.args.payout)} CHIP — match continues`,
        };
      case "Bankrupt":
        return {
          ...base,
          name: decoded.eventName,
          summary: `${shortAddress(decoded.args.player)} is bankrupt`,
        };
      case "TurnEnded":
        return {
          ...base,
          name: decoded.eventName,
          summary: `Next turn: ${shortAddress(decoded.args.nextPlayer)}`,
        };
      case "TurnSkipped":
        return {
          ...base,
          name: decoded.eventName,
          summary: `Turn skipped: ${shortAddress(decoded.args.player)}`,
        };
      case "MatchEnded":
        return {
          ...base,
          name: decoded.eventName,
          summary: `Match ended — board winner ${shortAddress(decoded.args.boardWinner)} (${decoded.args.reason})`,
        };
      default:
        return null;
    }
  } catch {
    return null;
  }
}

function summarizeFactoryLog(log: Log): FeedEvent | null {
  try {
    const decoded = decodeEventLog({
      abi: matchFactoryAbi,
      data: log.data,
      topics: log.topics,
    });
    if (decoded.eventName !== "MatchCreated") return null;
    return {
      id: feedId(log),
      at: Date.now(),
      source: "factory",
      name: decoded.eventName,
      summary: `New match ${shortAddress(decoded.args.matchAddress)} by ${shortAddress(decoded.args.host)} (stake ${formatEther(decoded.args.stakeAmount)} CHIP)`,
      txHash: log.transactionHash ?? undefined,
      blockNumber: log.blockNumber ?? undefined,
    };
  } catch {
    return null;
  }
}

/** Subscribe to all GameMatch events on a match contract. Returns unsubscribe. */
export function watchMatchEvents(
  client: PublicClient,
  matchAddress: Address,
  onEvent: OnFeedEvent,
): () => void {
  const unsubs = gameMatchAbi
    .filter((item) => item.type === "event")
    .map((item) =>
      client.watchContractEvent({
        address: matchAddress,
        abi: gameMatchAbi,
        eventName: item.name,
        onLogs: (logs) => {
          for (const log of logs) {
            const feed = summarizeMatchLog(log as Log);
            if (feed) onEvent(feed);
          }
        },
      }),
    );

  return () => {
    for (const unsub of unsubs) unsub();
  };
}

/** Subscribe to MatchCreated on the factory. */
export function watchFactoryEvents(
  client: PublicClient,
  factoryAddress: Address,
  onEvent: OnFeedEvent,
): () => void {
  return client.watchContractEvent({
    address: factoryAddress,
    abi: matchFactoryAbi,
    eventName: "MatchCreated",
    onLogs: (logs) => {
      for (const log of logs) {
        const feed = summarizeFactoryLog(log as Log);
        if (feed) onEvent(feed);
      }
    },
  });
}

/** Replay recent history (e.g. when joining mid-game). */
export async function fetchRecentMatchEvents(
  client: PublicClient,
  matchAddress: Address,
  fromBlock: bigint,
  onEvent: OnFeedEvent,
): Promise<void> {
  const logs = await client.getContractEvents({
    address: matchAddress,
    abi: gameMatchAbi,
    fromBlock,
    toBlock: "latest",
  });

  for (const log of logs) {
    const feed = summarizeMatchLog(log as Log);
    if (feed) onEvent({ ...feed, at: Date.now() });
  }
}
