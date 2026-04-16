import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('AMLRegistry', function () {
  async function deploy() {
    const [owner, oracle, user] = await ethers.getSigners();
    const AMLRegistry = await ethers.getContractFactory('AMLRegistry');
    const registry = await AMLRegistry.deploy(oracle.address);
    return { registry, owner, oracle, user };
  }

  it('deploys with correct owner and oracle', async function () {
    const { registry, owner, oracle } = await deploy();
    expect(await registry.owner()).to.equal(owner.address);
    expect(await registry.oracle()).to.equal(oracle.address);
  });

  it('oracle can verify a user', async function () {
    const { registry, oracle, user } = await deploy();
    await registry.connect(oracle).verifyUser(user.address);
    expect(await registry.isVerified(user.address)).to.equal(true);
  });

  it('non-oracle cannot verify a user', async function () {
    const { registry, user } = await deploy();
    await expect(registry.connect(user).verifyUser(user.address)).to.be.revertedWith('Not oracle');
  });

  it('oracle can flag and unflag a user', async function () {
    const { registry, oracle, user } = await deploy();
    await registry.connect(oracle).flagUser(user.address, 850);
    expect(await registry.isFlagged(user.address)).to.equal(true);
    await registry.connect(oracle).unflagUser(user.address);
    expect(await registry.isFlagged(user.address)).to.equal(false);
  });

  it('owner can update oracle', async function () {
    const { registry, owner, user } = await deploy();
    await registry.connect(owner).setOracle(user.address);
    expect(await registry.oracle()).to.equal(user.address);
  });
});
