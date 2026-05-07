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
const ETHERSCAN_NO_TRANSACTIONS = 'No transactions found';

interface EtherscanResponse {
  status: string;
  message: string;
  result: EtherscanTx[] | string;
}

export async function fetchWalletHistory(
  walletAddress: string,
  days = 90,
): Promise<NormalizedTx[]> {
  const startBlock = 0;
  const endBlock = 99999999;
  const startTimestamp = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;

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
  if (env.ETHERSCAN_API_KEY) {
    url.searchParams.set('apikey', env.ETHERSCAN_API_KEY);
  }

  try {
    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      console.warn(`Etherscan request failed with HTTP ${response.status}`);
      return [];
    }

    const data = (await response.json()) as EtherscanResponse;

    if (!Array.isArray(data.result)) {
      if (data.result === ETHERSCAN_NO_TRANSACTIONS) {
        return [];
      }

      const authHint = env.ETHERSCAN_API_KEY
        ? ''
        : ' Add ETHERSCAN_API_KEY to fetch explorer transaction history reliably.';
      console.warn(`Etherscan history unavailable for ${walletAddress}: ${data.result}.${authHint}`);
      return [];
    }

    if (data.status !== '1') {
      console.warn(`Unexpected Etherscan status for ${walletAddress}: ${data.message}`);
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
