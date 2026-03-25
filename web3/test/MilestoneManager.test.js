// test/MilestoneManager.test.js
// Run: npx hardhat test test/MilestoneManager.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("MilestoneManager", function () {
  let manager;
  let owner, oracle, creator, backer1, backer2, stranger;

  const CAMPAIGN_ID = 1;
  const ONE_ETH = ethers.utils.parseEther("1");
  const HALF_ETH = ethers.utils.parseEther("0.5");
  const DURATION = 7 * 24 * 60 * 60; // 7 days

  beforeEach(async () => {
    [owner, oracle, creator, backer1, backer2, stranger] = await ethers.getSigners();

    const MilestoneManager = await ethers.getContractFactory("MilestoneManager");
    manager = await MilestoneManager.deploy(oracle.address);
    await manager.deployed();
  });

  // ── Registration ────────────────────────────────────────────────────────

  describe("registerCampaign", () => {
    it("allows a creator to register", async () => {
      await expect(manager.connect(creator).registerCampaign(CAMPAIGN_ID))
        .to.emit(manager, "CampaignRegistered")
        .withArgs(CAMPAIGN_ID, creator.address);
      expect(await manager.campaignCreator(CAMPAIGN_ID)).to.equal(creator.address);
    });

    it("reverts on double registration", async () => {
      await manager.connect(creator).registerCampaign(CAMPAIGN_ID);
      await expect(manager.connect(stranger).registerCampaign(CAMPAIGN_ID))
        .to.be.revertedWith("MilestoneManager: already registered");
    });
  });

  // ── Milestone creation ───────────────────────────────────────────────────

  describe("createMilestone", () => {
    beforeEach(async () => {
      await manager.connect(creator).registerCampaign(CAMPAIGN_ID);
    });

    it("creates a milestone and emits event", async () => {
      await expect(
        manager.connect(creator).createMilestone(CAMPAIGN_ID, "MVP", "Build MVP", ONE_ETH, DURATION)
      ).to.emit(manager, "MilestoneCreated");

      const m = await manager.getMilestone(CAMPAIGN_ID, 1);
      expect(m.title).to.equal("MVP");
      expect(m.targetAmount).to.equal(ONE_ETH);
      expect(m.status).to.equal(0); // Pending
    });

    it("reverts if not creator", async () => {
      await expect(
        manager.connect(stranger).createMilestone(CAMPAIGN_ID, "M", "D", ONE_ETH, DURATION)
      ).to.be.revertedWith("MilestoneManager: not campaign creator");
    });

    it("reverts with empty title", async () => {
      await expect(
        manager.connect(creator).createMilestone(CAMPAIGN_ID, "", "D", ONE_ETH, DURATION)
      ).to.be.revertedWith("MilestoneManager: empty title");
    });
  });

  // ── Contributions ───────────────────────────────────────────────────────

  describe("contributeToMilestone", () => {
    beforeEach(async () => {
      await manager.connect(creator).registerCampaign(CAMPAIGN_ID);
      await manager.connect(creator).createMilestone(CAMPAIGN_ID, "MVP", "Build", ONE_ETH, DURATION);
    });

    it("accepts ETH and updates state", async () => {
      await expect(
        manager.connect(backer1).contributeToMilestone(CAMPAIGN_ID, 1, { value: HALF_ETH })
      ).to.emit(manager, "MilestoneFunded").withArgs(CAMPAIGN_ID, 1, backer1.address, HALF_ETH);

      const m = await manager.getMilestone(CAMPAIGN_ID, 1);
      expect(m.raisedAmount).to.equal(HALF_ETH);
      expect(m.contributorsCount).to.equal(1);
    });

    it("tracks each contributor separately", async () => {
      await manager.connect(backer1).contributeToMilestone(CAMPAIGN_ID, 1, { value: HALF_ETH });
      await manager.connect(backer2).contributeToMilestone(CAMPAIGN_ID, 1, { value: HALF_ETH });
      const m = await manager.getMilestone(CAMPAIGN_ID, 1);
      expect(m.contributorsCount).to.equal(2);
    });

    it("reverts if creator contributes", async () => {
      await expect(
        manager.connect(creator).contributeToMilestone(CAMPAIGN_ID, 1, { value: HALF_ETH })
      ).to.be.revertedWith("MilestoneManager: creator cannot contribute");
    });

    it("reverts after deadline", async () => {
      await time.increase(DURATION + 1);
      await expect(
        manager.connect(backer1).contributeToMilestone(CAMPAIGN_ID, 1, { value: HALF_ETH })
      ).to.be.revertedWith("MilestoneManager: deadline passed");
    });
  });

  // ── Evidence & Oracle ───────────────────────────────────────────────────

  describe("Oracle approval / rejection", () => {
    beforeEach(async () => {
      await manager.connect(creator).registerCampaign(CAMPAIGN_ID);
      await manager.connect(creator).createMilestone(CAMPAIGN_ID, "MVP", "Build", ONE_ETH, DURATION);
      await manager.connect(backer1).contributeToMilestone(CAMPAIGN_ID, 1, { value: ONE_ETH });
    });

    it("creator can submit evidence", async () => {
      await expect(
        manager.connect(creator).submitMilestoneEvidence(CAMPAIGN_ID, 1, "QmABC", "")
      ).to.emit(manager, "MilestoneSubmitted").withArgs(CAMPAIGN_ID, 1, "QmABC", "");
      const m = await manager.getMilestone(CAMPAIGN_ID, 1);
      expect(m.status).to.equal(1); // Submitted
      expect(m.evidenceIpfsHash).to.equal("QmABC");
    });

    it("oracle approves submitted milestone", async () => {
      await manager.connect(creator).submitMilestoneEvidence(CAMPAIGN_ID, 1, "QmABC", "");
      await expect(manager.connect(oracle).approveMilestoneByOracle(CAMPAIGN_ID, 1))
        .to.emit(manager, "MilestoneApproved");
      const m = await manager.getMilestone(CAMPAIGN_ID, 1);
      expect(m.status).to.equal(2); // Approved
    });

    it("oracle rejects submitted milestone", async () => {
      await manager.connect(creator).submitMilestoneEvidence(CAMPAIGN_ID, 1, "QmABC", "");
      await expect(manager.connect(oracle).rejectMilestoneByOracle(CAMPAIGN_ID, 1))
        .to.emit(manager, "MilestoneRejected");
      const m = await manager.getMilestone(CAMPAIGN_ID, 1);
      expect(m.status).to.equal(3); // Rejected
    });

    it("non-oracle cannot approve", async () => {
      await manager.connect(creator).submitMilestoneEvidence(CAMPAIGN_ID, 1, "QmABC", "");
      await expect(manager.connect(stranger).approveMilestoneByOracle(CAMPAIGN_ID, 1))
        .to.be.revertedWith("MilestoneManager: caller is not oracle");
    });
  });

  // ── DAO Voting ──────────────────────────────────────────────────────────

  describe("DAO voting", () => {
    beforeEach(async () => {
      await manager.connect(creator).registerCampaign(CAMPAIGN_ID);
      await manager.connect(creator).createMilestone(CAMPAIGN_ID, "MVP", "Build", ONE_ETH, DURATION);
      // backer1 contributes 0.6 ETH, backer2 0.4 ETH  (quorum = 30% = 0.3 ETH)
      await manager.connect(backer1).contributeToMilestone(
        CAMPAIGN_ID, 1, { value: ethers.utils.parseEther("0.6") }
      );
      await manager.connect(backer2).contributeToMilestone(
        CAMPAIGN_ID, 1, { value: ethers.utils.parseEther("0.4") }
      );
      await manager.connect(creator).submitMilestoneEvidence(CAMPAIGN_ID, 1, "QmABC", "");
    });

    it("vote is recorded with correct weight", async () => {
      await manager.connect(backer1).voteMilestone(CAMPAIGN_ID, 1, true);
      const v = await manager.getVote(CAMPAIGN_ID, 1, backer1.address);
      expect(v.hasVoted).to.be.true;
      expect(v.inFavour).to.be.true;
      expect(v.weight).to.equal(ethers.utils.parseEther("0.6"));
    });

    it("quorum met + majority FOR => auto-Approved", async () => {
      // backer1 votes FOR (0.6 ETH = 60% >= 30% quorum, 60% votes FOR >= 51% threshold)
      await manager.connect(backer1).voteMilestone(CAMPAIGN_ID, 1, true);
      const m = await manager.getMilestone(CAMPAIGN_ID, 1);
      expect(m.status).to.equal(2); // Approved
    });

    it("quorum met + majority AGAINST => auto-Rejected", async () => {
      // Both vote against (total = 1 ETH = 100% quorum; 100% AGAINST)
      await manager.connect(backer1).voteMilestone(CAMPAIGN_ID, 1, false);
      await manager.connect(backer2).voteMilestone(CAMPAIGN_ID, 1, false);
      const m = await manager.getMilestone(CAMPAIGN_ID, 1);
      expect(m.status).to.equal(3); // Rejected
    });

    it("cannot vote twice", async () => {
      await manager.connect(backer1).voteMilestone(CAMPAIGN_ID, 1, true);
      await expect(manager.connect(backer1).voteMilestone(CAMPAIGN_ID, 1, false))
        .to.be.revertedWith("MilestoneManager: already voted");
    });

    it("non-contributor cannot vote", async () => {
      await expect(manager.connect(stranger).voteMilestone(CAMPAIGN_ID, 1, true))
        .to.be.revertedWith("MilestoneManager: no contribution to vote with");
    });
  });

  // ── Fund release ────────────────────────────────────────────────────────

  describe("withdrawMilestoneFunds", () => {
    beforeEach(async () => {
      await manager.connect(creator).registerCampaign(CAMPAIGN_ID);
      await manager.connect(creator).createMilestone(CAMPAIGN_ID, "MVP", "Build", ONE_ETH, DURATION);
      await manager.connect(backer1).contributeToMilestone(CAMPAIGN_ID, 1, { value: ONE_ETH });
      await manager.connect(creator).submitMilestoneEvidence(CAMPAIGN_ID, 1, "QmABC", "");
      await manager.connect(oracle).approveMilestoneByOracle(CAMPAIGN_ID, 1);
    });

    it("creator withdraws approved milestone funds", async () => {
      const before = await ethers.provider.getBalance(creator.address);
      const tx = await manager.connect(creator).withdrawMilestoneFunds(CAMPAIGN_ID, 1);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.mul(tx.gasPrice);
      const after = await ethers.provider.getBalance(creator.address);
      expect(after.add(gasUsed).sub(before)).to.equal(ONE_ETH);
    });

    it("reverts on double withdrawal", async () => {
      await manager.connect(creator).withdrawMilestoneFunds(CAMPAIGN_ID, 1);
      await expect(manager.connect(creator).withdrawMilestoneFunds(CAMPAIGN_ID, 1))
        .to.be.revertedWith("MilestoneManager: already released");
    });
  });

  // ── Refund ──────────────────────────────────────────────────────────────

  describe("claimMilestoneRefund", () => {
    beforeEach(async () => {
      await manager.connect(creator).registerCampaign(CAMPAIGN_ID);
      await manager.connect(creator).createMilestone(CAMPAIGN_ID, "MVP", "Build", ONE_ETH, DURATION);
      await manager.connect(backer1).contributeToMilestone(CAMPAIGN_ID, 1, { value: ONE_ETH });
      await manager.connect(creator).submitMilestoneEvidence(CAMPAIGN_ID, 1, "QmABC", "");
      await manager.connect(oracle).rejectMilestoneByOracle(CAMPAIGN_ID, 1);
    });

    it("backer gets refund after rejection", async () => {
      const before = await ethers.provider.getBalance(backer1.address);
      const tx = await manager.connect(backer1).claimMilestoneRefund(CAMPAIGN_ID, 1);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.mul(tx.gasPrice);
      const after = await ethers.provider.getBalance(backer1.address);
      expect(after.add(gasUsed).sub(before)).to.equal(ONE_ETH);
    });

    it("reverts on double refund", async () => {
      await manager.connect(backer1).claimMilestoneRefund(CAMPAIGN_ID, 1);
      await expect(manager.connect(backer1).claimMilestoneRefund(CAMPAIGN_ID, 1))
        .to.be.revertedWith("MilestoneManager: nothing to refund");
    });
  });

  // ── Oracle address rotation ─────────────────────────────────────────────

  describe("setOracleAddress", () => {
    it("owner rotates oracle", async () => {
      await expect(manager.connect(owner).setOracleAddress(stranger.address))
        .to.emit(manager, "OracleAddressUpdated")
        .withArgs(oracle.address, stranger.address);
      expect(await manager.oracleAddress()).to.equal(stranger.address);
    });

    it("non-owner cannot rotate oracle", async () => {
      await expect(manager.connect(stranger).setOracleAddress(stranger.address))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});
