import type { FeedEvent } from "../types/events";

type Props = {
  events: FeedEvent[];
  listening: boolean;
  onClear: () => void;
};

function sourceLabel(source: FeedEvent["source"]) {
  if (source === "factory") return "Factory";
  if (source === "match") return "Match";
  return "System";
}

export function EventFeed({ events, listening, onClear }: Props) {
  return (
    <div className="panel event-feed">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <h2 style={{ margin: 0 }}>Live events</h2>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {listening && <span className="badge badge-live">Listening</span>}
          <button type="button" className="btn btn-secondary" style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem" }} onClick={onClear}>
            Clear
          </button>
        </div>
      </div>
      <p className="muted" style={{ marginBottom: "0.75rem" }}>
        On-chain logs via WebSocket RPC — factory + active match.
      </p>
      <ul className="event-list">
        {events.length === 0 && <li className="muted">No events yet. Create or join a match.</li>}
        {events.map((e) => (
          <li key={e.id} className={`event-item source-${e.source}`}>
            <div className="event-meta">
              <span className="event-source">{sourceLabel(e.source)}</span>
              <span className="event-name">{e.name}</span>
              <time>{new Date(e.at).toLocaleTimeString()}</time>
            </div>
            <p className="event-summary">{e.summary}</p>
            {e.txHash && (
              <a
                href={`https://testnet.arcscan.app/tx/${e.txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                View tx
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
