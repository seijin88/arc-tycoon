type Props = {
  phase: number;
  isMyTurn: boolean;
  betResolved: boolean;
  onRoll: () => void;
  onBuy: () => void;
  onEndTurn: () => void;
  onSkip: () => void;
  onEndTimeout: () => void;
  pending: boolean;
  canBuyHint: boolean;
};

export function ActionBar({
  phase,
  isMyTurn,
  betResolved,
  onRoll,
  onBuy,
  onEndTurn,
  onSkip,
  onEndTimeout,
  pending,
  canBuyHint,
}: Props) {
  if (phase !== 1) {
    return (
      <div className="panel">
        <h2>Actions</h2>
        <p className="muted">{phase === 0 ? "Waiting in lobby — join and start the match." : "Match ended."}</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>Actions</h2>
      {betResolved && <p className="muted">Richest-first bet settled — keep playing for board rank.</p>}
      {!isMyTurn && <p className="muted">Waiting for another player&apos;s turn…</p>}
      <div className="btn-row">
        <button type="button" className="btn btn-primary" disabled={!isMyTurn || pending} onClick={onRoll}>
          Roll & move
        </button>
        <button type="button" className="btn btn-secondary" disabled={!isMyTurn || pending || !canBuyHint} onClick={onBuy}>
          Buy property
        </button>
        <button type="button" className="btn btn-secondary" disabled={!isMyTurn || pending} onClick={onEndTurn}>
          End turn
        </button>
        <button type="button" className="btn btn-secondary" disabled={pending} onClick={onSkip}>
          Skip turn (90s)
        </button>
        <button type="button" className="btn btn-secondary" disabled={pending} onClick={onEndTimeout}>
          End match (30m)
        </button>
      </div>
    </div>
  );
}
