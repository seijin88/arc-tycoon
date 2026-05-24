import type { Address } from "viem";
import { formatChip } from "../lib/format";

type Props = {
  matchInput: string;
  onMatchInput: (v: string) => void;
  stakeInput: string;
  onStakeInput: (v: string) => void;
  onCreate: () => void;
  onJoin: () => void;
  onStart: () => void;
  createPending: boolean;
  joinPending: boolean;
  startPending: boolean;
  phaseLabel: string;
  playerCount: number;
  isHost: boolean;
  amInMatch: boolean;
  host?: Address;
  stake?: bigint;
};

export function LobbyPanel({
  matchInput,
  onMatchInput,
  stakeInput,
  onStakeInput,
  onCreate,
  onJoin,
  onStart,
  createPending,
  joinPending,
  startPending,
  phaseLabel,
  playerCount,
  isHost,
  amInMatch,
  host,
  stake,
}: Props) {
  return (
    <div className="panel">
      <h2>Lobby</h2>

      <label className="label">Match contract address</label>
      <input
        className="input"
        placeholder="0x…"
        value={matchInput}
        onChange={(e) => onMatchInput(e.target.value)}
      />

      <div style={{ marginTop: "0.75rem" }}>
        <label className="label">Stake per player (CHIP)</label>
        <input className="input" type="number" min="1" value={stakeInput} onChange={(e) => onStakeInput(e.target.value)} />
      </div>

      <div className="btn-row">
        <button type="button" className="btn btn-primary" disabled={createPending} onClick={onCreate}>
          {createPending ? "Creating…" : "Create match"}
        </button>
        <button type="button" className="btn btn-secondary" disabled={joinPending} onClick={onJoin}>
          {joinPending ? "Joining…" : "Join match"}
        </button>
        {isHost && phaseLabel === "Lobby" && (
          <button type="button" className="btn btn-secondary" disabled={startPending || playerCount < 2} onClick={onStart}>
            {startPending ? "Starting…" : `Start (${playerCount}/4)`}
          </button>
        )}
      </div>

      <div style={{ marginTop: "0.75rem" }} className="muted">
        {host && (
          <p>
            Host: <code>{host}</code>
            {stake !== undefined && ` · Stake ${formatChip(stake)} CHIP`}
          </p>
        )}
        {amInMatch && <p>You are in this match.</p>}
        <p>Flow: create or paste address → approve CHIP → join → host starts at 2+ players.</p>
      </div>
    </div>
  );
}
