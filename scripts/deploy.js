const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  const network = await hre.ethers.provider.getNetwork();

  console.log("====================================");
  console.log("Network:", hre.network.name);
  console.log("Chain ID:", network.chainId.toString());
  console.log("Deployer:", deployer.address);
  console.log("====================================");

  // Deploy AuthorizationManager
  const AuthorizationManager =
    await hre.ethers.getContractFactory("AuthorizationManager");

  const authManager = await AuthorizationManager.deploy(deployer.address);
  await authManager.waitForDeployment();

  const authManagerAddress = await authManager.getAddress();
  console.log("AuthorizationManager deployed at:", authManagerAddress);

  // Deploy SecureVault
  const SecureVault =
    await hre.ethers.getContractFactory("SecureVault");

  const vault = await SecureVault.deploy(authManagerAddress);
  await vault.waitForDeployment();

  const vaultAddress = await vault.getAddress();
  console.log("SecureVault deployed at:", vaultAddress);

  console.log("====================================");
  console.log("Deployment completed successfully");
  console.log("====================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
