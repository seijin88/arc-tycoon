import { useEffect, useState } from "react";
import type { MatchSnapshot } from "../hooks/useMatchState";
import { formatChip, formatCountdown } from "../lib/format";

type Props = {
  snap: MatchSnapshot | null;
};

const PHASES = ["Lobby", "Active", "Ended"];

export function MatchStatus({ snap }: Props) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  if (!snap) return null;

  const phaseName = PHASES[snap.phase] ?? "Unknown";
  const badgeClass =
    snap.phase === 1 ? "badge-live" : snap.phase === 2 ? "badge-ended" : "badge-lobby";

  return (
    <div className="panel status-bar">
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
        <span className={`badge ${badgeClass}`}>{phaseName}</span>
        <span>
          Pot <strong style={{ color: "var(--chip)" }}>{formatChip(snap.potSize)}</strong> CHIP
        </span>
        <span>Turn #{snap.turnNumber.toString()}</span>
        {snap.phase === 1 && snap.deadline > 0n && (
          <span>
            Time left <strong>{formatCountdown(Number(snap.deadline), now)}</strong>
          </span>
        )}
        {snap.betResolved && <span className="badge badge-live">Bet resolved</span>}
      </div>
    </div>
  );
}
