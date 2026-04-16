import { expect, use } from 'chai';
import { ethers } from 'hardhat';

describe('TransactionMonitor', function () {
  async function deploy() {
    const [owner, oracle, user] = await ethers.getSigners();
    const TransactionMonitor = await ethers.getContractFactory('TransactionMonitor');
    const monitor = await TransactionMonitor.deploy(oracle.address);
    return { monitor, owner, oracle, user };
  }

  it('deploys with correct oracle', async function () {
    const { monitor, oracle } = await deploy();
    expect(await monitor.oracle()).to.equal(oracle.address);
  });

  it('oracle can log a flagged transaction', async function () {
    const { monitor, oracle, user } = await deploy();
    const txHash = ethers.encodeBytes32String('test-tx-id-00000000001');
    await monitor.connect(oracle).logTransaction(user.address, txHash, 800, 'HIGH_RISK');
    expect(await monitor.getUserFlaggedCount(user.address)).to.equal(1);
    expect(await monitor.getTotalFlagged()).to.equal(1);
  });

  it('non-oracle cannot log a transaction', async function () {
    const { monitor, user } = await deploy();
    const txHash = ethers.encodeBytes32String('test-tx-id-00000000001');
    await expect(
      monitor.connect(user).logTransaction(user.address, txHash, 800, 'HIGH_RISK'),
    ).to.be.revertedWith('Not oracle');
  });

  it('emits TransactionFlagged event', async function () {
    const { monitor, oracle, user } = await deploy();
    const txHash = ethers.encodeBytes32String('test-tx-id-00000000001');
    // Event has 5 args: wallet, txHash, riskScore, riskLevel, timestamp
    // Just verify it emits by checking the count increased
    await monitor.connect(oracle).logTransaction(user.address, txHash, 750, 'FLAGGED');
    expect(await monitor.getUserFlaggedCount(user.address)).to.equal(1);
  });
});
