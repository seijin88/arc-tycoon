export type FeedEvent = {
  id: string;
  at: number;
  source: "factory" | "match" | "system";
  name: string;
  summary: string;
  txHash?: string;
  blockNumber?: bigint;
};
