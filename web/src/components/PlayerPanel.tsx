import type { MatchSnapshot } from "../hooks/useMatchState";
import { formatChip, shortAddress } from "../lib/format";
import { propertyAtPosition } from "../lib/board";

type Props = {
  snap: MatchSnapshot | null;
  wallet?: string;
};

export function PlayerPanel({ snap, wallet }: Props) {
  if (!snap) {
    return (
      <div className="panel">
        <h2>Players</h2>
        <p className="muted">Load a match to see player stats.</p>
      </div>
    );
  }

  const threshold = snap.lowestNetWorth * 2n;
  const richestTarget = snap.lowestNetWorth > 0n ? threshold : 0n;

  return (
    <div className="panel">
      <h2>Players</h2>
      <p className="muted" style={{ marginBottom: "0.75rem" }}>
        Richest first: reach <strong>{formatChip(richestTarget)}</strong> net worth (2× lowest active)
      </p>
      <ul className="player-list">
        {snap.playerSnapshots.map((p, i) => {
          const isMe = wallet && p.address.toLowerCase() === wallet.toLowerCase();
          const isTurn = snap.players[snap.currentPlayerIndex]?.toLowerCase() === p.address.toLowerCase();
          const canWinBet = p.active && snap.lowestNetWorth > 0n && p.netWorth >= richestTarget;
          const onBuyable =
            snap.phase === 1 &&
            propertyAtPosition(p.position) !== null &&
            !snap.propertyOwners[propertyAtPosition(p.position)!];

          return (
            <li key={p.address} className={`player-card ${!p.active ? "inactive" : ""} ${isMe ? "me" : ""}`}>
              <div className="player-card-head">
                <span className="player-dot" style={{ background: ["#3dd68c", "#6eb5ff", "#f5c842", "#f07178"][i % 4] }} />
                <strong>{shortAddress(p.address)}</strong>
                {isMe && <span className="badge badge-live">You</span>}
                {isTurn && snap.phase === 1 && <span className="badge badge-lobby">Turn</span>}
                {canWinBet && !snap.betResolved && <span className="badge badge-live">2×</span>}
              </div>
              <div className="player-stats">
                <span>Cash {formatChip(p.cash)}</span>
                <span>Net {formatChip(p.netWorth)}</span>
                <span>Pos {p.position}</span>
                {p.inJail && <span>Jail</span>}
                {p.luckBps > 0 && <span>Luck +{(p.luckBps / 100).toFixed(1)}%</span>}
              </div>
              {onBuyable && isMe && isTurn && (
                <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.8rem" }}>
                  Unowned property here — you can buy
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {snap.betResolved && (
        <p className="muted" style={{ marginTop: "0.75rem" }}>
          Bet paid to {shortAddress(snap.richestBetWinner)} — board play continues
        </p>
      )}
    </div>
  );
}
