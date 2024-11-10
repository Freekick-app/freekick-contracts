const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("FundsManager", function () {
  async function deployDepositContract() {
      const [owner, acc1, acc2, acc3] = await ethers.getSigners();
      
      // Deploy using upgrades
      const DepositContract = await ethers.getContractFactory("FundsManager", owner);  // Explicitly use owner
      const contract = await upgrades.deployProxy(
          DepositContract,
          [],  // No constructor args
          { 
              initializer: 'initialize',
              kind: 'uups'  // Specify UUPS upgrade pattern
          }
      );
      await contract.waitForDeployment();

      // Initial deposits
      await acc1.sendTransaction({
          to: await contract.getAddress(),
          value: ethers.parseEther("10.0"),
      });

      await acc2.sendTransaction({
          to: await contract.getAddress(),
          value: ethers.parseEther("20.0"),
      });

      // Verify owner has ownership
      const contractOwner = await contract.owner();
      console.log("Contract owner:", contractOwner);
      console.log("Owner address:", owner.address);

      return { contract, owner, acc1, acc2, acc3 };
  }


  it("Should Deploy & Sync Balances", async function () {
    const { contract, owner, acc1, acc2, acc3 } = await loadFixture(deployDepositContract);
    console.log(await contract.getAddress()); // Updated to getAddress()
    
    expect(
      await contract.balances(acc1.address)
    ).to.equal(ethers.parseEther("10.0")); // Updated syntax

    expect(
      await contract.balances(acc2.address)
    ).to.equal(ethers.parseEther("20.0")); // Updated syntax

    expect(
      await contract.balances(acc3.address)
    ).to.equal(ethers.parseEther("0")); // Updated syntax
  });

  it("Should verify right signature", async function() {
    const { contract, owner, acc1, acc2, acc3 } = await loadFixture(deployDepositContract);
    const signer = acc1;
    const amount = ethers.parseEther("1");
    const newBalance = ethers.parseEther("9"); // 10 - 1
    const message = "Hello";
    const nonce = 123;

    // Create message hash directly using the parameters
    const messageHash = ethers.solidityPackedKeccak256(
        ["address", "uint256", "uint256", "string", "uint256"],
        [signer.address, amount, newBalance, message, nonce]
    );

    // Sign the hash
    const signature = await signer.signMessage(ethers.getBytes(messageHash));

    // Verify signature
    expect(
        await contract.verify(signer.address, amount, newBalance, message, nonce, signature)
    ).to.equal(true);

    // Wrong amount should fail
    expect(
        await contract.verify(signer.address, amount + 1n, newBalance, message, nonce, signature)
    ).to.equal(false);
});

it("Should verify Withdrawal on signature", async function() {
  const { contract, owner, acc1, acc2, acc3 } = await loadFixture(deployDepositContract);
  const signer = acc1;
  const amount = ethers.parseEther("2");
  const newBalance = ethers.parseEther("8"); // 10 - 2
  const message = "Hello";
  const nonce = 123;

  // Create message hash
  const messageHash = ethers.solidityPackedKeccak256(
      ["address", "uint256", "uint256", "string", "uint256"],
      [signer.address, amount, newBalance, message, nonce]
  );

  // Sign the hash
  const signature = await signer.signMessage(ethers.getBytes(messageHash));

  // Verify signature first
  expect(
      await contract.verify(signer.address, amount, newBalance, message, nonce, signature)
  ).to.equal(true);

  // Make sure we use the owner to make the withdrawal
  const withdrawalTx = await contract.connect(owner).withdraw(
      signer.address, 
      amount, 
      newBalance, 
      message, 
      nonce, 
      signature
  );

  // Verify event
  await expect(withdrawalTx)
      .to.emit(contract, 'Withdraw')
      .withArgs(signer.address, amount, newBalance);

  // Verify final balance
  expect(await contract.balances(signer.address)).to.equal(newBalance);

  // Following calls should fail from non-owner
  await expect(
      contract.connect(acc1).withdraw(acc2.address, amount, newBalance, message, nonce, signature)
  ).to.be.revertedWith("Ownable: caller is not the owner");

  // Following calls should fail with invalid signature (but using owner account)
  await expect(
      contract.connect(owner).withdraw(acc2.address, amount, newBalance, message, nonce, signature)
  ).to.be.revertedWith("Invalid Signature");

  await expect(
      contract.connect(owner).withdraw(signer.address, amount + 1n, newBalance, message, nonce, signature)
  ).to.be.revertedWith("Invalid Signature");

  await expect(
      contract.connect(owner).withdraw(signer.address, amount, newBalance, message + " new thing", nonce, signature)
  ).to.be.revertedWith("Invalid Signature");

  await expect(
      contract.connect(owner).withdraw(signer.address, amount, newBalance, message, nonce + 1, signature)
  ).to.be.revertedWith("Invalid Signature");

  await expect(
      contract.connect(owner).withdraw(signer.address, amount, ethers.parseEther("1"), message, nonce, signature)
  ).to.be.revertedWith("Invalid Signature");
});

  it("Funding Player Wallet Works", async function() {
    const { contract, owner, acc1, acc2, acc3 } = await loadFixture(deployDepositContract);
    
    const fundAcc1 = await contract.connect(acc2).fundPlayer(acc1.address, {
      value: ethers.parseEther("5") // Updated syntax
    });

    await expect(fundAcc1)
      .to.emit(contract, 'FundedPlayer')
      .withArgs(acc2.address, acc1.address, ethers.parseEther("5"));
    
    const transaction = await contract.funding(acc2.address, acc1.address);
    expect(transaction).to.equal(ethers.parseEther("5"));
  });
});