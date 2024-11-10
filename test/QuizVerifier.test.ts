// test/QuizVerifier.test.ts
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { QuizVerifier } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("QuizVerifier", function() {
  // Fixture to deploy contract and set up initial state
  async function deployQuizVerifierFixture() {
    const [owner, operator, user1, user2] = await ethers.getSigners();
    
    const QuizVerifier = await ethers.getContractFactory("QuizVerifier");
    const verifier = await upgrades.deployProxy(QuizVerifier, [operator.address]) as QuizVerifier;
    
    const OPERATOR_ROLE = await verifier.OPERATOR_ROLE();
    
    return { verifier, owner, operator, user1, user2, OPERATOR_ROLE };
  }

  describe("Initialization", function() {
    it("Should set the right operator", async function() {
      const { verifier, operator, OPERATOR_ROLE } = await loadFixture(deployQuizVerifierFixture);
      expect(await verifier.hasRole(OPERATOR_ROLE, operator.address)).to.be.true;
    });
  });

  describe("Pool Management", function() {
    it("Should set pool end time correctly", async function() {
      const { verifier, operator } = await loadFixture(deployQuizVerifierFixture);
      
      const currentTime = Math.floor(Date.now() / 1000);
      const endTime = currentTime + 3600; // 1 hour from now
      
      await verifier.connect(operator).setPoolEndTime(1, endTime);
      expect(await verifier.getPoolEndTime(1)).to.equal(endTime);
    });

    it("Should not allow setting end time in the past", async function() {
      const { verifier, operator } = await loadFixture(deployQuizVerifierFixture);
      
      const pastTime = Math.floor(Date.now() / 1000) - 3600;
      
      await expect(
        verifier.connect(operator).setPoolEndTime(1, pastTime)
      ).to.be.revertedWith("End time must be in future");
    });
  });

  describe("Answer Submission", function() {
    async function setupPoolFixture() {
      const base = await deployQuizVerifierFixture();
      const endTime = Math.floor(Date.now() / 1000) + 3600;
      await base.verifier.connect(base.operator).setPoolEndTime(1, endTime);
      return base;
    }

    it("Should allow submitting answer hash", async function() {
      const { verifier, operator, user1 } = await loadFixture(setupPoolFixture);
      
      const answerHash = ethers.keccak256(ethers.toUtf8Bytes("test answer"));
      
      await expect(
        verifier.connect(operator).submitAnswerHash(1, user1.address, answerHash)
      ).to.emit(verifier, "AnswerSubmitted")
        .withArgs(1, user1.address, answerHash);
        
      expect(await verifier.getAnswerHash(1, user1.address)).to.equal(answerHash);
    });

    it("Should not allow submitting answer twice", async function() {
      const { verifier, operator, user1 } = await loadFixture(setupPoolFixture);
      
      const answerHash = ethers.keccak256(ethers.toUtf8Bytes("test answer"));
      
      await verifier.connect(operator).submitAnswerHash(1, user1.address, answerHash);
      
      await expect(
        verifier.connect(operator).submitAnswerHash(1, user1.address, answerHash)
      ).to.be.revertedWith("Answer already submitted");
    });

    it("Should handle batch submissions correctly", async function() {
      const { verifier, operator, user1, user2 } = await loadFixture(setupPoolFixture);
      
      const hash1 = ethers.keccak256(ethers.toUtf8Bytes("answer 1"));
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes("answer 2"));
      
      await expect(
        verifier.connect(operator).submitAnswerHashBatch(
          1,
          [user1.address, user2.address],
          [hash1, hash2]
        )
      ).to.emit(verifier, "AnswersBatchSubmitted")
        .withArgs(1, 2);
        
      expect(await verifier.getAnswerHash(1, user1.address)).to.equal(hash1);
      expect(await verifier.getAnswerHash(1, user2.address)).to.equal(hash2);
    });
  });

  describe("Answer Verification", function() {
    async function submitAnswerFixture() {
      const base = await deployQuizVerifierFixture();
      const endTime = Math.floor(Date.now() / 1000) + 3600;
      await base.verifier.connect(base.operator).setPoolEndTime(1, endTime);
      
      const answerHash = ethers.keccak256(ethers.toUtf8Bytes("test answer"));
      await base.verifier.connect(base.operator).submitAnswerHash(
        1, 
        base.user1.address, 
        answerHash
      );
      
      return { ...base, answerHash };
    }

    it("Should verify correct answer hash", async function() {
      const { verifier, user1, answerHash } = await loadFixture(submitAnswerFixture);
      
      // Fast forward time to after pool ends
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine", []);
      
      expect(await verifier.verifyAnswerHash(1, user1.address, answerHash)).to.be.true;
    });

    it("Should reject incorrect answer hash", async function() {
      const { verifier, user1 } = await loadFixture(submitAnswerFixture);
      
      // Fast forward time to after pool ends
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine", []);
      
      const wrongHash = ethers.keccak256(ethers.toUtf8Bytes("wrong answer"));
      expect(await verifier.verifyAnswerHash(1, user1.address, wrongHash)).to.be.false;
    });
  });
});