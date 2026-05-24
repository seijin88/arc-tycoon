import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { arcTestnet } from "../config/arc";
import { shortAddress, formatChip } from "../lib/format";
import { useChipBalance } from "../hooks/useMatchState";

type Props = {
  onClaimFaucet: () => void;
  faucetPending: boolean;
};

export function Header({ onClaimFaucet, faucetPending }: Props) {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { balance } = useChipBalance();

  const wrongChain = isConnected && chain?.id !== arcTestnet.id;

  return (
    <header className="header panel" style={{ marginBottom: "1rem", display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <h1 style={{ fontSize: "1.5rem" }}>Arc Tycoon</h1>
        <p className="muted" style={{ margin: "0.25rem 0 0" }}>
          On-chain board · Richest-first bets · Arc Testnet
        </p>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
        {isConnected && balance !== undefined && (
          <span className="muted">
            CHIP: <strong style={{ color: "var(--chip)" }}>{formatChip(balance)}</strong>
          </span>
        )}
        {wrongChain && (
          <button type="button" className="btn btn-secondary" onClick={() => switchChain({ chainId: arcTestnet.id })}>
            Switch to Arc
          </button>
        )}
        {!isConnected ? (
          <button
            type="button"
            className="btn btn-primary"
            disabled={isPending}
            onClick={() => connect({ connector: connectors[0] })}
          >
            Connect wallet
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-secondary" disabled={faucetPending} onClick={onClaimFaucet}>
              Claim CHIP
            </button>
            <span className="muted">{shortAddress(address)}</span>
            <button type="button" className="btn btn-secondary" onClick={() => disconnect()}>
              Disconnect
            </button>
          </>
        )}
      </div>
    </header>
  );
}
