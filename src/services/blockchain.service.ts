import { ethers } from 'ethers';
import { env } from '../config/env';
import { RiskLevel } from '../shared';

// Minimal ABIs for oracle calls
const AML_REGISTRY_ABI = [
  'function verifyUser(address wallet) external',
  'function flagUser(address wallet, uint256 riskScore) external',
  'function unflagUser(address wallet) external',
];

const TX_MONITOR_ABI = [
  'function logTransaction(address wallet, bytes32 txHash, uint256 riskScore, string calldata riskLevel) external',
];

class BlockchainService {
  private provider: ethers.JsonRpcProvider | null = null;
  private oracle: ethers.Wallet | null = null;
  private amlRegistry: ethers.Contract | null = null;
  private txMonitor: ethers.Contract | null = null;
  private initialized = false;

  private init() {
    if (this.initialized) return;

    if (!env.RPC_URL || !env.ORACLE_PRIVATE_KEY) {
      console.warn('Blockchain env vars not configured — oracle calls disabled');
      return;
    }

    try {
      this.provider = new ethers.JsonRpcProvider(env.RPC_URL);
      this.oracle = new ethers.Wallet(env.ORACLE_PRIVATE_KEY, this.provider);

      if (env.CONTRACT_AML_REGISTRY) {
        this.amlRegistry = new ethers.Contract(
          env.CONTRACT_AML_REGISTRY,
          AML_REGISTRY_ABI,
          this.oracle,
        );
      }

      if (env.CONTRACT_TX_MONITOR) {
        this.txMonitor = new ethers.Contract(
          env.CONTRACT_TX_MONITOR,
          TX_MONITOR_ABI,
          this.oracle,
        );
      }

      this.initialized = true;
    } catch (err) {
      console.error('Failed to initialize blockchain service:', err);
    }
  }

  async verifyUser(walletAddress: string): Promise<void> {
    this.init();
    if (!this.amlRegistry) {
      console.warn('AMLRegistry not configured — skipping on-chain verification');
      return;
    }
    const tx = await this.amlRegistry.verifyUser(walletAddress);
    await tx.wait();
    console.log(`On-chain: verifyUser(${walletAddress}) confirmed`);
  }

  async flagUser(walletAddress: string, riskScore: number): Promise<void> {
    this.init();
    if (!this.amlRegistry) return;
    const tx = await this.amlRegistry.flagUser(walletAddress, Math.round(riskScore));
    await tx.wait();
    console.log(`On-chain: flagUser(${walletAddress}, ${riskScore}) confirmed`);
  }

  async logFlaggedTransaction(
    walletAddress: string,
    txId: string,
    riskScore: number,
    riskLevel: RiskLevel,
  ): Promise<void> {
    this.init();
    if (!this.txMonitor) {
      console.warn('TransactionMonitor not configured — skipping on-chain log');
      return;
    }
    const txHashBytes = ethers.encodeBytes32String(txId.slice(0, 31));
    const tx = await this.txMonitor.logTransaction(
      walletAddress,
      txHashBytes,
      Math.round(riskScore),
      riskLevel,
    );
    await tx.wait();
    console.log(`On-chain: logTransaction(${walletAddress}) confirmed`);
  }
}

export const blockchainService = new BlockchainService();
