import { env } from '../config/env';

interface EtherscanTx {
  hash: string;
  from: string;
  to: string;
  value: string; // in wei
  timeStamp: string;
  isError: string;
}

interface BlockscoutAddressRef {
  hash?: string | null;
}

interface BlockscoutTx {
  hash: string;
  from: BlockscoutAddressRef | null;
  to: BlockscoutAddressRef | null;
  value: string;
  timestamp: string;
  status?: string;
}

interface BlockscoutResponse {
  items?: BlockscoutTx[];
}

export interface NormalizedTx {
  hash: string;
  fromAddress: string;
  toAddress: string;
  amountETH: number;
  amountUSD: number;
  timestamp: Date;
  isFlagged: boolean;
  source: 'etherscan' | 'blockscout';
}

const ETH_PRICE_USD = 2500; // Static fallback — replace with live rate if needed
const ETHERSCAN_NO_TRANSACTIONS = 'No transactions found';
const CACHE_TTL_MS = 30 * 1000;
const historyCache = new Map<string, { expiresAt: number; data: NormalizedTx[] }>();

interface EtherscanResponse {
  status: string;
  message: string;
  result: EtherscanTx[] | string;
}

function getCacheKey(walletAddress: string, days: number): string {
  return `${walletAddress.toLowerCase()}:${days}`;
}

function getBlockscoutBaseUrl(chainId: string): string | null {
  switch (chainId) {
    case '1':
      return 'https://eth.blockscout.com';
    case '11155111':
      return 'https://eth-sepolia.blockscout.com';
    case '8453':
      return 'https://base.blockscout.com';
    case '84532':
      return 'https://base-sepolia.blockscout.com';
    default:
      return null;
  }
}

function normalizeEtherscanTransactions(result: EtherscanTx[], startTimestamp: number): NormalizedTx[] {
  return result
    .filter((tx) => {
      const ts = parseInt(tx.timeStamp, 10);
      return ts >= startTimestamp && tx.isError === '0';
    })
    .map((tx) => {
      const amountETH = parseFloat(tx.value) / 1e18;
      return {
        hash: tx.hash,
        fromAddress: tx.from,
        toAddress: tx.to,
        amountETH,
        amountUSD: amountETH * ETH_PRICE_USD,
        timestamp: new Date(parseInt(tx.timeStamp, 10) * 1000),
        isFlagged: false,
        source: 'etherscan' as const,
      };
    });
}

async function fetchFromEtherscan(walletAddress: string, startTimestamp: number): Promise<NormalizedTx[] | null> {
  const startBlock = 0;
  const endBlock = 99999999;

  const url = new URL(env.ETHERSCAN_API_URL);
  url.searchParams.set('chainid', env.ETHERSCAN_CHAIN_ID);
  url.searchParams.set('module', 'account');
  url.searchParams.set('action', 'txlist');
  url.searchParams.set('address', walletAddress);
  url.searchParams.set('startblock', String(startBlock));
  url.searchParams.set('endblock', String(endBlock));
  url.searchParams.set('page', '1');
  url.searchParams.set('offset', '100');
  url.searchParams.set('sort', 'desc');
  if (env.ETHERSCAN_API_KEY) url.searchParams.set('apikey', env.ETHERSCAN_API_KEY);

  try {
    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      console.warn(`Etherscan request failed with HTTP ${response.status}`);
      return null;
    }

    const data = (await response.json()) as EtherscanResponse;

    if (!Array.isArray(data.result)) {
      if (data.result === ETHERSCAN_NO_TRANSACTIONS) {
        return [];
      }

      const authHint = env.ETHERSCAN_API_KEY ? '' : ' Add ETHERSCAN_API_KEY to fetch explorer transaction history reliably.';
      console.warn(`Etherscan history unavailable for ${walletAddress}: ${data.result}.${authHint}`);
      return null;
    }

    if (data.status !== '1') {
      console.warn(`Unexpected Etherscan status for ${walletAddress}: ${data.message}`);
      return null;
    }

    return normalizeEtherscanTransactions(data.result, startTimestamp);
  } catch (err) {
    console.error('Failed to fetch Etherscan history:', err);
    return null;
  }
}

async function fetchFromBlockscout(walletAddress: string, startTimestamp: number): Promise<NormalizedTx[]> {
  const baseUrl = getBlockscoutBaseUrl(env.ETHERSCAN_CHAIN_ID);
  if (!baseUrl) return [];

  const response = await fetch(`${baseUrl}/api/v2/addresses/${walletAddress}/transactions`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    console.warn(`Blockscout request failed with HTTP ${response.status}`);
    return [];
  }

  const data = (await response.json()) as BlockscoutResponse;
  if (!Array.isArray(data.items)) return [];

  return data.items
    .filter((tx) => {
      const ts = Math.floor(new Date(tx.timestamp).getTime() / 1000);
      return Number.isFinite(ts) && ts >= startTimestamp;
    })
    .map((tx) => {
      const amountETH = parseFloat(tx.value) / 1e18;
      return {
        hash: tx.hash,
        fromAddress: tx.from?.hash ?? '',
        toAddress: tx.to?.hash ?? '',
        amountETH,
        amountUSD: amountETH * ETH_PRICE_USD,
        timestamp: new Date(tx.timestamp),
        isFlagged: false,
        source: 'blockscout' as const,
      };
    });
}

export async function fetchWalletHistory(
  walletAddress: string,
  days = 90,
): Promise<NormalizedTx[]> {
  const cacheKey = getCacheKey(walletAddress, days);
  const cached = historyCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const startTimestamp = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;

  const etherscanHistory = await fetchFromEtherscan(walletAddress, startTimestamp);
  const history = etherscanHistory ?? await fetchFromBlockscout(walletAddress, startTimestamp);

  const normalized = history
    .filter((tx) => tx.fromAddress || tx.toAddress)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  historyCache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    data: normalized,
  });

  return normalized;
}
