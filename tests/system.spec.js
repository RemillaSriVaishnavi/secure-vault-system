const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SecureVault System", function () {
  let authManager, vault;
  let deployer, recipient;

  beforeEach(async function () {
    [deployer, recipient] = await ethers.getSigners();

    const AuthorizationManager = await ethers.getContractFactory(
      "AuthorizationManager"
    );
    authManager = await AuthorizationManager.deploy(deployer.address);
    await authManager.waitForDeployment();

    const SecureVault = await ethers.getContractFactory("SecureVault");
    vault = await SecureVault.deploy(await authManager.getAddress());
    await vault.waitForDeployment();
  });

  it("allows withdrawal with valid authorization", async function () {
    // Deposit ETH
    await deployer.sendTransaction({
      to: await vault.getAddress(),
      value: ethers.parseEther("1"),
    });

    const amount = ethers.parseEther("0.5");
    const nonce = 1;

    // Create authorization hash
    const messageHash = ethers.solidityPackedKeccak256(
      ["address", "uint256", "address", "uint256", "uint256"],
      [
        await vault.getAddress(),
        (await ethers.provider.getNetwork()).chainId,
        recipient.address,
        amount,
        nonce,
      ]
    );

    const signature = await deployer.signMessage(
      ethers.getBytes(messageHash)
    );

    // Withdraw
    await expect(
      vault.withdraw(recipient.address, amount, nonce, signature)
    ).to.changeEtherBalances(
      [vault, recipient],
      [-amount, amount]
    );
  });

  it("prevents authorization replay", async function () {
    await deployer.sendTransaction({
      to: await vault.getAddress(),
      value: ethers.parseEther("1"),
    });

    const amount = ethers.parseEther("0.5");
    const nonce = 1;

    const messageHash = ethers.solidityPackedKeccak256(
      ["address", "uint256", "address", "uint256", "uint256"],
      [
        await vault.getAddress(),
        (await ethers.provider.getNetwork()).chainId,
        recipient.address,
        amount,
        nonce,
      ]
    );

    const signature = await deployer.signMessage(
      ethers.getBytes(messageHash)
    );

    await vault.withdraw(recipient.address, amount, nonce, signature);

    // Replay attempt
    await expect(
      vault.withdraw(recipient.address, amount, nonce, signature)
    ).to.be.revertedWith("Authorization already used");
  });
});
