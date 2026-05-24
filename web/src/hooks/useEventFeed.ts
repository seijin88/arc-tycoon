import { useCallback, useEffect, useRef, useState } from "react";
import { usePublicClient } from "wagmi";
import type { Address } from "viem";
import { addresses } from "../config/arc";
import {
  fetchRecentMatchEvents,
  watchFactoryEvents,
  watchMatchEvents,
} from "../services/eventListener";
import type { FeedEvent } from "../types/events";

const MAX_EVENTS = 80;

export function useEventFeed(matchAddress: Address | undefined, onChainActivity?: () => void) {
  const client = usePublicClient();
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [listening, setListening] = useState(false);
  const seenIds = useRef(new Set<string>());

  const push = useCallback((event: FeedEvent) => {
    if (seenIds.current.has(event.id)) return;
    seenIds.current.add(event.id);
    setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS));
  }, []);

  const pushSystem = useCallback((summary: string) => {
    push({
      id: `sys-${Date.now()}-${Math.random()}`,
      at: Date.now(),
      source: "system",
      name: "System",
      summary,
    });
  }, [push]);

  const clear = useCallback(() => {
    setEvents([]);
    seenIds.current.clear();
  }, []);

  useEffect(() => {
    if (!client) return;

    const unsubs: (() => void)[] = [];

    if (addresses.factory) {
      unsubs.push(
        watchFactoryEvents(client, addresses.factory, (e) => {
          push(e);
        }),
      );
    }

    setListening(true);
    return () => {
      unsubs.forEach((u) => u());
      setListening(false);
    };
  }, [client, push]);

  useEffect(() => {
    if (!client || !matchAddress) return;

    let cancelled = false;

    (async () => {
      const block = await client.getBlockNumber();
      const from = block > 5000n ? block - 5000n : 0n;
      if (!cancelled) {
        await fetchRecentMatchEvents(client, matchAddress, from, push);
        pushSystem(`Loaded on-chain history for match ${matchAddress.slice(0, 10)}…`);
      }
    })();

    const unwatch = watchMatchEvents(client, matchAddress, (e) => {
      push(e);
      onChainActivity?.();
    });

    return () => {
      cancelled = true;
      unwatch();
    };
  }, [client, matchAddress, push, pushSystem, onChainActivity]);

  return { events, listening, clear, pushSystem };
}
