// scripts/deploy-all.ts
import { ethers, upgrades } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy FundsManager
  console.log("\nDeploying FundsManager...");
  const FundsManager = await ethers.getContractFactory("FundsManager");
  const fundManager = await upgrades.deployProxy(
    FundsManager,
    [
      process.env.FEE_COLLECTOR_ADDRESS || deployer.address,
      1000 // 10% fee
    ],
    { initializer: 'initialize' }
  );
  await fundManager.waitForDeployment();
  const fundManagerAddress = await fundManager.getAddress();

  // Deploy QuizVerifier
  console.log("\nDeploying QuizVerifier...");
  const QuizVerifier = await ethers.getContractFactory("QuizVerifier");
  const quizVerifier = await upgrades.deployProxy(
    QuizVerifier,
    [process.env.OPERATOR_ADDRESS || deployer.address],
    { initializer: 'initialize' }
  );
  await quizVerifier.waitForDeployment();
  const quizVerifierAddress = await quizVerifier.getAddress();

  console.log("\nDeployment Summary:");
  console.log("--------------------");
  console.log("FundsManager:    ", fundManagerAddress);
  console.log("QuizVerifier:   ", quizVerifierAddress);
  console.log("Deployer:       ", deployer.address);
  console.log("Fee Collector:  ", process.env.FEE_COLLECTOR_ADDRESS || deployer.address);
  console.log("Operator:       ", process.env.OPERATOR_ADDRESS || deployer.address);

  // Verify contracts if not on localhost
  if (network.name !== "localhost" && network.name !== "hardhat") {
    console.log("\nVerifying contracts...");
    
    for (const [name, address] of [
      ["FundsManager", fundManagerAddress],
      ["QuizVerifier", quizVerifierAddress]
    ]) {
      try {
        await run("verify:verify", {
          address: address,
          constructorArguments: []
        });
        console.log(`${name} verified successfully`);
      } catch (error: any) {
        if (error.message.toLowerCase().includes("already verified")) {
          console.log(`${name} is already verified`);
        } else {
          console.error(`Error verifying ${name}:`, error);
        }
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});