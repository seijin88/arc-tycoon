import { useCallback, useMemo, useState } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { decodeEventLog, isAddress, parseEther, type Address } from "viem";
import "./App.css";
import { addresses, contractsConfigured } from "./config/arc";
import { cosmeticChipsAbi, gameMatchAbi, matchFactoryAbi, testnetFaucetAbi } from "./abis";
import { useEventFeed } from "./hooks/useEventFeed";
import { useMatchState } from "./hooks/useMatchState";
import { propertyAtPosition } from "./lib/board";
import { Header } from "./components/Header";
import { LobbyPanel } from "./components/LobbyPanel";
import { GameBoard } from "./components/GameBoard";
import { PlayerPanel } from "./components/PlayerPanel";
import { ActionBar } from "./components/ActionBar";
import { EventFeed } from "./components/EventFeed";
import { MatchStatus } from "./components/MatchStatus";

function App() {
  const { address, isConnected } = useAccount();
  const client = usePublicClient();
  const [matchInput, setMatchInput] = useState("");
  const [stakeInput, setStakeInput] = useState("100");
  const [txAction, setTxAction] = useState<string | null>(null);

  const matchAddress = useMemo(() => {
    if (!matchInput || !isAddress(matchInput)) return undefined;
    return matchInput as Address;
  }, [matchInput]);

  const { snap, loading, refresh, isMyTurn, isHost, amInMatch } = useMatchState(matchAddress);
  const { events, listening, clear, pushSystem } = useEventFeed(matchAddress, refresh);

  const { writeContractAsync } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const { isLoading: txPending } = useWaitForTransactionReceipt({ hash: txHash });

  const pending = Boolean(txAction) || txPending;

  const runTx = useCallback(
    async (label: string, fn: () => Promise<`0x${string}`>) => {
      setTxAction(label);
      try {
        const hash = await fn();
        setTxHash(hash);
        pushSystem(`${label} submitted`);
        await client?.waitForTransactionReceipt({ hash });
        pushSystem(`${label} confirmed`);
        await refresh();
      } catch (e) {
        pushSystem(`${label} failed: ${e instanceof Error ? e.message : "unknown"}`);
      } finally {
        setTxAction(null);
      }
    },
    [client, pushSystem, refresh],
  );

  const ensureChipAllowance = useCallback(
    async (spender: Address, amount: bigint) => {
      if (!address || !addresses.chips) throw new Error("CHIP not configured");
      const allowance = await client!.readContract({
        address: addresses.chips,
        abi: cosmeticChipsAbi,
        functionName: "allowance",
        args: [address, spender],
      });
      if (allowance >= amount) return;
      await runTx("Approve CHIP", () =>
        writeContractAsync({
          address: addresses.chips!,
          abi: cosmeticChipsAbi,
          functionName: "approve",
          args: [spender, amount],
        }),
      );
    },
    [address, client, runTx, writeContractAsync],
  );

  const onClaimFaucet = () => {
    if (!addresses.faucet) {
      pushSystem("Set VITE_FAUCET_ADDRESS in .env");
      return;
    }
    void runTx("Faucet claim", () =>
      writeContractAsync({
        address: addresses.faucet!,
        abi: testnetFaucetAbi,
        functionName: "claim",
      }),
    );
  };

  const onCreate = async () => {
    if (!addresses.factory) {
      pushSystem("Set VITE_FACTORY_ADDRESS in .env");
      return;
    }
    const stake = parseEther(stakeInput || "0");
    await runTx("Create match", async () => {
      const hash = await writeContractAsync({
        address: addresses.factory!,
        abi: matchFactoryAbi,
        functionName: "createMatch",
        args: [stake],
      });
      const receipt = await client!.waitForTransactionReceipt({ hash });
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({ abi: matchFactoryAbi, ...log });
          if (decoded.eventName === "MatchCreated") {
            setMatchInput(decoded.args.matchAddress);
            pushSystem(`Match deployed at ${decoded.args.matchAddress}`);
          }
        } catch {
          /* other logs */
        }
      }
      return hash;
    });
  };

  const onJoin = async () => {
    if (!matchAddress) return;
    let stake = snap?.stakeAmount;
    if (stake === undefined) {
      stake = await client!.readContract({
        address: matchAddress,
        abi: gameMatchAbi,
        functionName: "stakeAmount",
      });
    }
    await ensureChipAllowance(matchAddress, stake);
    await runTx("Join match", () =>
      writeContractAsync({
        address: matchAddress,
        abi: gameMatchAbi,
        functionName: "joinMatch",
        args: [[]],
      }),
    );
  };

  const onStart = () => {
    if (!matchAddress) return;
    void runTx("Start match", () =>
      writeContractAsync({
        address: matchAddress,
        abi: gameMatchAbi,
        functionName: "startMatch",
      }),
    );
  };

  const onRoll = () => {
    if (!matchAddress) return;
    void runTx("Roll", () =>
      writeContractAsync({ address: matchAddress, abi: gameMatchAbi, functionName: "rollAndMove" }),
    );
  };

  const onBuy = () => {
    if (!matchAddress) return;
    void runTx("Buy property", () =>
      writeContractAsync({ address: matchAddress, abi: gameMatchAbi, functionName: "buyProperty" }),
    );
  };

  const onEndTurn = () => {
    if (!matchAddress) return;
    void runTx("End turn", () =>
      writeContractAsync({ address: matchAddress, abi: gameMatchAbi, functionName: "endTurn" }),
    );
  };

  const onSkip = () => {
    if (!matchAddress) return;
    void runTx("Skip turn", () =>
      writeContractAsync({ address: matchAddress, abi: gameMatchAbi, functionName: "skipTurn" }),
    );
  };

  const onEndTimeout = () => {
    if (!matchAddress) return;
    void runTx("End by timeout", () =>
      writeContractAsync({ address: matchAddress, abi: gameMatchAbi, functionName: "endByTimeout" }),
    );
  };

  const me = snap?.playerSnapshots.find((p) => address && p.address.toLowerCase() === address.toLowerCase());
  const propId = me ? propertyAtPosition(me.position) : null;
  const canBuy =
    propId !== null &&
    snap?.propertyOwners[propId] === null &&
    snap?.phase === 1;

  const phaseLabel = snap ? ["Lobby", "Active", "Ended"][snap.phase] ?? "?" : "—";
  const currentPlayer = snap?.players[snap.currentPlayerIndex];

  return (
    <div className="app">
      <Header onClaimFaucet={onClaimFaucet} faucetPending={pending && txAction === "Faucet claim"} />

      {!contractsConfigured && (
        <div className="alert alert-warn">
          Copy <code>web/.env.example</code> to <code>web/.env</code> and set contract addresses after{" "}
          <code>forge script</code> deploy.
        </div>
      )}

      {!isConnected && (
        <div className="alert">Connect MetaMask on Arc Testnet (chain 5042002) to play.</div>
      )}

      <MatchStatus snap={snap} />

      <div className="layout">
        <div className="main-column">
          <LobbyPanel
            matchInput={matchInput}
            onMatchInput={setMatchInput}
            stakeInput={stakeInput}
            onStakeInput={setStakeInput}
            onCreate={onCreate}
            onJoin={onJoin}
            onStart={onStart}
            createPending={pending && txAction === "Create match"}
            joinPending={pending && txAction === "Join match"}
            startPending={pending && txAction === "Start match"}
            phaseLabel={phaseLabel}
            playerCount={snap?.playerCount ?? 0}
            isHost={isHost}
            amInMatch={amInMatch}
            host={snap?.host}
            stake={snap?.stakeAmount}
          />

          <GameBoard snap={snap} currentPlayer={currentPlayer} />

          <ActionBar
            phase={snap?.phase ?? -1}
            isMyTurn={isMyTurn}
            betResolved={snap?.betResolved ?? false}
            onRoll={onRoll}
            onBuy={onBuy}
            onEndTurn={onEndTurn}
            onSkip={onSkip}
            onEndTimeout={onEndTimeout}
            pending={pending}
            canBuyHint={Boolean(canBuy)}
          />

          {loading && <p className="muted">Refreshing state…</p>}
        </div>

        <aside className="side-column">
          <PlayerPanel snap={snap} wallet={address} />
          <EventFeed events={events} listening={listening} onClear={clear} />
        </aside>
      </div>
    </div>
  );
}

export default App;
