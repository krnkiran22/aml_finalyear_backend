import { env } from '../config/env';

interface EtherscanTx {
  hash: string;
  from: string;
  to: string;
  value: string; // in wei
  timeStamp: string;
  isError: string;
}

interface NormalizedTx {
  hash: string;
  fromAddress: string;
  toAddress: string;
  amountUSD: number;
  timestamp: Date;
  isFlagged: boolean;
}

const ETH_PRICE_USD = 2500; // Static fallback — replace with live rate if needed

export async function fetchWalletHistory(
  walletAddress: string,
  days = 90,
): Promise<NormalizedTx[]> {
  if (!env.ETHERSCAN_API_KEY) {
    console.warn('ETHERSCAN_API_KEY not set — returning empty tx history');
    return [];
  }

  const startBlock = 0;
  const endBlock = 99999999;
  const startTimestamp = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;

  const url = new URL('https://api-sepolia.etherscan.io/api');
  url.searchParams.set('module', 'account');
  url.searchParams.set('action', 'txlist');
  url.searchParams.set('address', walletAddress);
  url.searchParams.set('startblock', String(startBlock));
  url.searchParams.set('endblock', String(endBlock));
  url.searchParams.set('sort', 'desc');
  url.searchParams.set('apikey', env.ETHERSCAN_API_KEY);

  try {
    const response = await fetch(url.toString());
    const data = (await response.json()) as { status: string; result: EtherscanTx[] | string };

    if (data.status !== '1' || !Array.isArray(data.result)) {
      return [];
    }

    return data.result
      .filter((tx) => {
        const ts = parseInt(tx.timeStamp, 10);
        return ts >= startTimestamp && tx.isError === '0';
      })
      .map((tx) => ({
        hash: tx.hash,
        fromAddress: tx.from,
        toAddress: tx.to,
        amountUSD: (parseFloat(tx.value) / 1e18) * ETH_PRICE_USD,
        timestamp: new Date(parseInt(tx.timeStamp, 10) * 1000),
        isFlagged: false,
      }));
  } catch (err) {
    console.error('Failed to fetch Etherscan history:', err);
    return [];
  }
}
