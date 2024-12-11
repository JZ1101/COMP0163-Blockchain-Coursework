const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CreditManager", function () {
  let CarbonCredit;
  let carbonCredit;
  let CreditManager;
  let creditManager;
  let Reward;
  let reward;
  let owner;
  let holder1;
  let holder2;
  let recipient;
  const INITIAL_SUPPLY = ethers.parseEther("1000000");
  const TIME_FRAME = 365; // 1 year in days

  beforeEach(async function () {
    [owner, holder1, holder2, recipient] = await ethers.getSigners();

    // Deploy CarbonCredit token
    CarbonCredit = await ethers.getContractFactory("CarbonCredit");
    carbonCredit = await CarbonCredit.deploy(INITIAL_SUPPLY, TIME_FRAME);

    // Deploy Reward token (using CarbonCredit as a simple ERC20 for testing)
    const RewardToken = await ethers.getContractFactory("CarbonCredit");
    const rewardToken = await RewardToken.deploy(INITIAL_SUPPLY, TIME_FRAME);

    // Deploy Reward contract
    Reward = await ethers.getContractFactory("Reward");
    reward = await Reward.deploy(await rewardToken.getAddress());

    // Deploy CreditManager
    CreditManager = await ethers.getContractFactory("CreditManager");
    creditManager = await CreditManager.deploy(
      await owner.getAddress(),
      await carbonCredit.getAddress(),
      await reward.getAddress()
    );

    // Transfer initial tokens to creditManager
    const managerAmount = ethers.parseEther("500000");
    await carbonCredit.transfer(await creditManager.getAddress(), managerAmount);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await creditManager.owner()).to.equal(await owner.getAddress());
    });

    it("Should have correct initial balance", async function () {
      const balance = await carbonCredit.balanceOf(await creditManager.getAddress());
      expect(balance).to.equal(ethers.parseEther("500000"));
    });
  });

  describe("Holder Management", function () {
    it("Should add a credit holder successfully", async function () {
      await creditManager.addCreditHolder(await holder1.getAddress());
      expect(await creditManager.holderList(await holder1.getAddress())).to.be.true;
    });

    it("Should remove a credit holder successfully", async function () {
      await creditManager.addCreditHolder(await holder1.getAddress());
      await creditManager.removeCreditHolder(await holder1.getAddress());
      expect(await creditManager.holderList(await holder1.getAddress())).to.be.false;
    });

    it("Should fail to add zero address as holder", async function () {
      await expect(creditManager.addCreditHolder(ethers.ZeroAddress))
        .to.be.revertedWith("Invalid address");
    });

    it("Should fail when non-owner tries to add holder", async function () {
      await expect(creditManager.connect(holder1).addCreditHolder(await holder2.getAddress()))
        .to.be.revertedWith("Only owner can call this function");
    });
  });

  describe("Credit Operations", function () {
    beforeEach(async function () {
      await creditManager.addCreditHolder(await holder1.getAddress());
    });

    it("Should give credit to holder successfully", async function () {
      const creditAmount = ethers.parseEther("1000");
      await creditManager.giveCredit(await holder1.getAddress(), creditAmount);
      
      const allowance = await carbonCredit.allowance(
        await creditManager.getAddress(),
        await holder1.getAddress()
      );
      expect(allowance).to.equal(creditAmount);
    });

    it("Should allow holder to use credit", async function () {
      const creditAmount = ethers.parseEther("1000");
      const useAmount = ethers.parseEther("500");

      // Give credit
      await creditManager.giveCredit(await holder1.getAddress(), creditAmount);

      // Transfer tokens to holder and approve manager
      await carbonCredit.transfer(await holder1.getAddress(), creditAmount);
      await carbonCredit.connect(holder1).approve(await creditManager.getAddress(), creditAmount);

      // Use credit
      await creditManager.connect(holder1).useCredit(
        await recipient.getAddress(),
        useAmount
      );

      // Check recipient's balance
      const recipientBalance = await carbonCredit.balanceOf(await recipient.getAddress());
      expect(recipientBalance).to.equal(useAmount);
    });

    it("Should fail when non-holder tries to use credit", async function () {
      const creditAmount = ethers.parseEther("1000");
      await expect(
        creditManager.connect(holder2).useCredit(
          await recipient.getAddress(),
          creditAmount
        )
      ).to.be.revertedWith("Only credit holder can call this function");
    });

    it("Should track credit usage correctly", async function () {
      const creditAmount = ethers.parseEther("1000");
      const useAmount = ethers.parseEther("500");

      await creditManager.giveCredit(await holder1.getAddress(), creditAmount);
      await carbonCredit.transfer(await holder1.getAddress(), creditAmount);
      await carbonCredit.connect(holder1).approve(await creditManager.getAddress(), creditAmount);

      await creditManager.connect(holder1).useCredit(await recipient.getAddress(), useAmount);

      const yearlyUsage = await creditManager.getYearlyUsage();
      expect(yearlyUsage).to.equal(useAmount);
    });
  });

  describe("Credit Distribution", function () {
    beforeEach(async function () {
      await creditManager.addCreditHolder(await holder1.getAddress());
      await creditManager.addCreditHolder(await holder2.getAddress());
    });

    it("Should distribute credit to all holders", async function () {
      const creditPerHolder = ethers.parseEther("1000");
      await creditManager.distributeCredit(creditPerHolder);

      const holder1Allowance = await carbonCredit.allowance(
        await creditManager.getAddress(),
        await holder1.getAddress()
      );
      const holder2Allowance = await carbonCredit.allowance(
        await creditManager.getAddress(),
        await holder2.getAddress()
      );

      expect(holder1Allowance).to.equal(creditPerHolder);
      expect(holder2Allowance).to.equal(creditPerHolder);
    });

    it("Should fail distribution if insufficient balance", async function () {
      const tooMuchCredit = ethers.parseEther("1000000"); // More than contract's balance
      await expect(
        creditManager.distributeCredit(tooMuchCredit)
      ).to.be.revertedWith("Insufficient token balance");
    });
  });

  describe("Usage Tracking", function () {
    beforeEach(async function () {
      const creditAmount = ethers.parseEther("10000");
      await creditManager.addCreditHolder(await holder1.getAddress());
      await creditManager.giveCredit(await holder1.getAddress(), creditAmount);
      await carbonCredit.transfer(await holder1.getAddress(), creditAmount);
      await carbonCredit.connect(holder1).approve(await creditManager.getAddress(), creditAmount);
    });

    it("Should update yearly usage data correctly", async function () {
      const useAmount = ethers.parseEther("500");
      await creditManager.connect(holder1).useCredit(await recipient.getAddress(), useAmount);

      // Simulate time passing
      await ethers.provider.send("evm_increaseTime", [366 * 24 * 60 * 60]); // 366 days
      await ethers.provider.send("evm_mine");

      await creditManager.updateYearlyUsage();
      const usageData = await creditManager.yearlyUsageData(0);
      expect(usageData).to.equal(useAmount);
    });
  });

  describe("Reward System", function () {
    beforeEach(async function () {
      const creditAmount = ethers.parseEther("10000");
      await creditManager.addCreditHolder(await holder1.getAddress());
      await creditManager.giveCredit(await holder1.getAddress(), creditAmount);
      await carbonCredit.transfer(await holder1.getAddress(), creditAmount);
      await carbonCredit.connect(holder1).approve(await creditManager.getAddress(), creditAmount);
    });

    it("Should prepare data for reward claim", async function () {
      // First year usage
      await creditManager.connect(holder1).useCredit(
        await recipient.getAddress(),
        ethers.parseEther("1000")
      );

      await ethers.provider.send("evm_increaseTime", [366 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");
      await creditManager.updateYearlyUsage();

      // Second year with less usage
      await creditManager.connect(holder1).useCredit(
        await recipient.getAddress(),
        ethers.parseEther("500")
      );

      await ethers.provider.send("evm_increaseTime", [366 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");
      await creditManager.updateYearlyUsage();

      // Get yearly usage data
      const firstYearUsage = await creditManager.yearlyUsageData(0);
      const secondYearUsage = await creditManager.yearlyUsageData(1);
      expect(secondYearUsage).to.be.lt(firstYearUsage);
    });
  });

  describe("Owner Operations", function () {
    it("Should allow owner to change owner", async function () {
      await creditManager.changeOwner(await holder1.getAddress());
      expect(await creditManager.owner()).to.equal(await holder1.getAddress());
    });

    it("Should allow owner to top up credit", async function () {
      const topUpAmount = ethers.parseEther("1000");
      await carbonCredit.approve(await creditManager.getAddress(), topUpAmount);
      await expect(creditManager.topUp(topUpAmount))
        .to.emit(creditManager, "TopUpCredit")
        .withArgs(await creditManager.getAddress(), topUpAmount);
    });
  });
});