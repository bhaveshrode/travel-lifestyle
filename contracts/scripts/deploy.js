const hre = require("hardhat");

async function main() {
  console.log("Deploying Travel & Lifestyle contracts...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());
  console.log();

  // Deploy DigitalTravelCard
  console.log("Deploying DigitalTravelCard...");
  const DigitalTravelCard = await hre.ethers.getContractFactory("DigitalTravelCard");
  const travelCard = await DigitalTravelCard.deploy();
  await travelCard.waitForDeployment();
  const travelCardAddress = await travelCard.getAddress();
  console.log("✅ DigitalTravelCard deployed to:", travelCardAddress);
  console.log();

  // Deploy ExperienceNFTs
  console.log("Deploying ExperienceNFTs...");
  const ExperienceNFTs = await hre.ethers.getContractFactory("ExperienceNFTs");
  const nfts = await ExperienceNFTs.deploy();
  await nfts.waitForDeployment();
  const nftsAddress = await nfts.getAddress();
  console.log("✅ ExperienceNFTs deployed to:", nftsAddress);
  console.log();

  // Deploy TravelPointsExchange
  console.log("Deploying TravelPointsExchange...");
  const TravelPointsExchange = await hre.ethers.getContractFactory("TravelPointsExchange");
  const pointsExchange = await TravelPointsExchange.deploy();
  await pointsExchange.waitForDeployment();
  const pointsExchangeAddress = await pointsExchange.getAddress();
  console.log("✅ TravelPointsExchange deployed to:", pointsExchangeAddress);
  console.log();

  // Summary
  console.log("========================================");
  console.log("Deployment Summary");
  console.log("========================================");
  console.log("Network:", hre.network.name);
  console.log("Deployer:", deployer.address);
  console.log();
  console.log("Contract Addresses:");
  console.log("-------------------");
  console.log("DigitalTravelCard:     ", travelCardAddress);
  console.log("ExperienceNFTs:        ", nftsAddress);
  console.log("TravelPointsExchange:  ", pointsExchangeAddress);
  console.log("========================================");
  console.log();

  // Save deployment addresses
  const fs = require("fs");
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      DigitalTravelCard: travelCardAddress,
      ExperienceNFTs: nftsAddress,
      TravelPointsExchange: pointsExchangeAddress,
    },
  };

  fs.writeFileSync(
    `deployments-${hre.network.name}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log(`Deployment info saved to deployments-${hre.network.name}.json`);
  console.log();

  // Verification instructions
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("To verify contracts on Etherscan, run:");
    console.log(`npx hardhat verify --network ${hre.network.name} ${travelCardAddress}`);
    console.log(`npx hardhat verify --network ${hre.network.name} ${nftsAddress}`);
    console.log(`npx hardhat verify --network ${hre.network.name} ${pointsExchangeAddress}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
