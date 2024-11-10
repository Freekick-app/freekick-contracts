# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a Hardhat Ignition module that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.ts
```

# Deposit_Withdrawal_SmartContract


## Setting up the project
  - Install the package.json and all the required modules will be installed.
  - Install `npm install -g remixd ` --> This will help run the localhost on the remix website.

## Important commands
  - `npx hardhat compile`    --> This command is used to compile the smart contracts that you have written
  - `npx hardhat node`       --> This command is used to run a virtual EVM on your terminal, you can send, read, write transactions using this node.
  - `npx hardhat run scripts/deploy.js --network localhost` --> This command is used to deploy the smart contract on your localhost node.
  - `remixd`                 --> This command is used to connect your localhost with remix ethereum website.
  - `npx hardhat verify --network <network> <Contract Address>` --> Verify and upload code to network

## How to run, deploy, transact?
  - Compile your smart contracts and run your own node.
  - Once the node is running deploy the smart contract on your node.
  - Switch your metamask/wallet to localhost for testing purposes. The configuration of the localhost network can be found in hardhat.config.js
  - Import the virtual accounts created by node to your metamask/wallet. Use import wallet and private key in your terminal.

## How to run it on remix?
The testing of smart contracts can also be done on the remix panel

  - Compile your smart contracts and run your own node.
  - Once the node is running deploy the smart contract on your node.
  - Go to Remix and connect your localhost.
  - Once done go to deploy section and deploy the required smart contract.
