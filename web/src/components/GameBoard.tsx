import type { Address } from "viem";
import { BOARD_PATH_ORDER, BOARD_SPACES, SPACE_GRID } from "../lib/board";
import "../board.css";
import type { MatchSnapshot } from "../hooks/useMatchState";
import { shortAddress } from "../lib/format";

type Props = {
  snap: MatchSnapshot | null;
  currentPlayer?: Address;
};

const PLAYER_COLORS = ["#3dd68c", "#6eb5ff", "#f5c842", "#f07178"];

export function GameBoard({ snap, currentPlayer }: Props) {
  const tokensBySpace = new Map<number, { address: Address; color: string }[]>();

  if (snap) {
    snap.playerSnapshots.forEach((p, i) => {
      if (!p.active) return;
      const list = tokensBySpace.get(p.position) ?? [];
      list.push({ address: p.address, color: PLAYER_COLORS[i % PLAYER_COLORS.length] });
      tokensBySpace.set(p.position, list);
    });
  }

  const ownerForProperty = (propertyId: number) => {
    const owner = snap?.propertyOwners[propertyId];
    if (!owner) return null;
    const idx = snap.players.findIndex((p) => p.toLowerCase() === owner.toLowerCase());
    return idx >= 0 ? PLAYER_COLORS[idx % PLAYER_COLORS.length] : "#888";
  };

  return (
    <div className="panel board-wrap">
      <h2>Board</h2>
      <div className="board-outer">
        <div className="board">
        {BOARD_PATH_ORDER.map((spaceIndex, pathIdx) => {
          const space = BOARD_SPACES[spaceIndex];
          const tokens = tokensBySpace.get(spaceIndex) ?? [];
          const isCurrent = snap?.playerSnapshots[snap.currentPlayerIndex]?.position === spaceIndex;
          const propOwnerColor =
            space.propertyId !== undefined ? ownerForProperty(space.propertyId) : null;
          const grid = SPACE_GRID[pathIdx];

          return (
            <div
              key={spaceIndex}
              className={`board-space kind-${space.kind} ${isCurrent ? "current-turn" : ""}`}
              style={{
                gridColumn: grid.col,
                gridRow: grid.row,
                borderColor: space.color ?? "var(--border)",
                background: propOwnerColor ? `color-mix(in srgb, ${propOwnerColor} 18%, var(--surface-2))` : undefined,
              }}
            >
              <span className="space-idx">{spaceIndex}</span>
              <span className="space-label">{space.label}</span>
              {space.price !== undefined && (
                <span className="space-meta">${space.price}</span>
              )}
              <div className="tokens">
                {tokens.map((t) => (
                  <span
                    key={t.address}
                    className="token"
                    style={{ background: t.color }}
                    title={t.address}
                  />
                ))}
              </div>
            </div>
          );
        })}
        </div>
        <div className="board-center">
          <span className="logo">ARC</span>
          <span className="logo-sub">TYCOON</span>
        </div>
      </div>
      {currentPlayer && (
        <p className="muted" style={{ marginTop: "0.5rem" }}>
          Current turn: <strong>{shortAddress(currentPlayer)}</strong>
        </p>
      )}
    </div>
  );
}
