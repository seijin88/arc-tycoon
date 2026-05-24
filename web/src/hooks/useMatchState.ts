import { useCallback, useEffect, useState } from "react";
import { useAccount, usePublicClient, useReadContracts } from "wagmi";
import type { Address } from "viem";
import { cosmeticChipsAbi, gameMatchAbi } from "../abis";
import { addresses } from "../config/arc";

export type PlayerSnapshot = {
  address: Address;
  cash: bigint;
  position: number;
  active: boolean;
  luckBps: number;
  inJail: boolean;
  netWorth: bigint;
};

export type MatchSnapshot = {
  phase: number;
  playerCount: number;
  players: Address[];
  currentPlayerIndex: number;
  turnNumber: bigint;
  host: Address;
  stakeAmount: bigint;
  deadline: bigint;
  betResolved: boolean;
  richestBetWinner: Address;
  potSize: bigint;
  lowestNetWorth: bigint;
  propertyOwners: (Address | null)[];
  playerSnapshots: PlayerSnapshot[];
};

const PROPERTY_COUNT = 8;

export function useMatchState(matchAddress: Address | undefined) {
  const { address: wallet } = useAccount();
  const client = usePublicClient();
  const [snap, setSnap] = useState<MatchSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!client || !matchAddress) {
      setSnap(null);
      return;
    }

    setLoading(true);
    try {
      const [
        phase,
        playerCount,
        currentPlayerIndex,
        turnNumber,
        host,
        stakeAmount,
        deadline,
        betResolved,
        richestBetWinner,
        potSize,
      ] = await Promise.all([
        client.readContract({ address: matchAddress, abi: gameMatchAbi, functionName: "phase" }),
        client.readContract({ address: matchAddress, abi: gameMatchAbi, functionName: "playerCount" }),
        client.readContract({ address: matchAddress, abi: gameMatchAbi, functionName: "currentPlayerIndex" }),
        client.readContract({ address: matchAddress, abi: gameMatchAbi, functionName: "turnNumber" }),
        client.readContract({ address: matchAddress, abi: gameMatchAbi, functionName: "host" }),
        client.readContract({ address: matchAddress, abi: gameMatchAbi, functionName: "stakeAmount" }),
        client.readContract({ address: matchAddress, abi: gameMatchAbi, functionName: "deadline" }),
        client.readContract({ address: matchAddress, abi: gameMatchAbi, functionName: "betResolved" }),
        client.readContract({ address: matchAddress, abi: gameMatchAbi, functionName: "richestBetWinner" }),
        client.readContract({ address: matchAddress, abi: gameMatchAbi, functionName: "potSize" }),
      ]);

      const count = Number(playerCount);
      const players: Address[] = [];
      for (let i = 0; i < count; i++) {
        const p = await client.readContract({
          address: matchAddress,
          abi: gameMatchAbi,
          functionName: "players",
          args: [i],
        });
        players.push(p);
      }

      let lowestNetWorth = 0n;
      try {
        lowestNetWorth = await client.readContract({
          address: matchAddress,
          abi: gameMatchAbi,
          functionName: "lowestActiveNetWorth",
        });
      } catch {
        lowestNetWorth = 0n;
      }

      const propertyOwners: (Address | null)[] = [];
      for (let i = 0; i < PROPERTY_COUNT; i++) {
        const owner = await client.readContract({
          address: matchAddress,
          abi: gameMatchAbi,
          functionName: "propertyOwner",
          args: [i],
        });
        propertyOwners.push(owner === "0x0000000000000000000000000000000000000000" ? null : owner);
      }

      const playerSnapshots: PlayerSnapshot[] = await Promise.all(
        players.map(async (player) => {
          const [state, netWorth] = await Promise.all([
            client.readContract({
              address: matchAddress,
              abi: gameMatchAbi,
              functionName: "playerState",
              args: [player],
            }),
            client.readContract({
              address: matchAddress,
              abi: gameMatchAbi,
              functionName: "netWorth",
              args: [player],
            }),
          ]);
          return {
            address: player,
            cash: state[0],
            position: Number(state[1]),
            active: state[2],
            luckBps: Number(state[3]),
            inJail: state[4],
            netWorth,
          };
        }),
      );

      setSnap({
        phase: Number(phase),
        playerCount: count,
        players,
        currentPlayerIndex: Number(currentPlayerIndex),
        turnNumber,
        host,
        stakeAmount,
        deadline,
        betResolved,
        richestBetWinner,
        potSize,
        lowestNetWorth,
        propertyOwners,
        playerSnapshots,
      });
    } finally {
      setLoading(false);
    }
  }, [client, matchAddress]);

  useEffect(() => {
    void refresh();
    if (!matchAddress) return;
    const id = setInterval(() => void refresh(), 8_000);
    return () => clearInterval(id);
  }, [matchAddress, refresh]);

  const isMyTurn =
    wallet &&
    snap &&
    snap.phase === 1 &&
    snap.players[snap.currentPlayerIndex]?.toLowerCase() === wallet.toLowerCase();

  const isHost = wallet && snap && snap.host.toLowerCase() === wallet.toLowerCase();
  const amInMatch =
    wallet && snap?.playerSnapshots.some((p) => p.address.toLowerCase() === wallet.toLowerCase());

  return { snap, loading, refresh, isMyTurn: Boolean(isMyTurn), isHost: Boolean(isHost), amInMatch: Boolean(amInMatch) };
}

/** CHIP balance for connected wallet */
export function useChipBalance() {
  const { address } = useAccount();

  const { data, refetch } = useReadContracts({
    contracts:
      address && addresses.chips
        ? [
            {
              address: addresses.chips,
              abi: cosmeticChipsAbi,
              functionName: "balanceOf",
              args: [address],
            },
          ]
        : [],
    query: { enabled: Boolean(address && addresses.chips) },
  });

  return { balance: data?.[0]?.result as bigint | undefined, refetch };
}
