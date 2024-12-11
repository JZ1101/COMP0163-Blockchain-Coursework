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

    // Transfer tokens to CreditManager
    await carbonCredit.transfer(
      await creditManager.getAddress(),
      ethers.parseEther("500000")
    );
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
  });

  describe("Credit Operations", function () {
    beforeEach(async function () {
      // Add holder1 as a credit holder
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

      // First transfer tokens to holder
      await carbonCredit.connect(owner).transfer(await holder1.getAddress(), creditAmount);
      
      // Holder approves CreditManager to spend their tokens
      await carbonCredit.connect(holder1).approve(await creditManager.getAddress(), useAmount);

      // Give credit allowance
      await creditManager.giveCredit(await holder1.getAddress(), creditAmount);

      // Use credit
      await creditManager.connect(holder1).useCredit(await recipient.getAddress(), useAmount);

      // Check recipient's balance
      const recipientBalance = await carbonCredit.balanceOf(await recipient.getAddress());
      expect(recipientBalance).to.equal(useAmount);
    });

    it("Should fail when non-holder tries to use credit", async function () {
      const creditAmount = ethers.parseEther("1000");
      
      // Even with tokens and approval, should fail without being a holder
      await carbonCredit.connect(owner).transfer(await holder2.getAddress(), creditAmount);
      await carbonCredit.connect(holder2).approve(await creditManager.getAddress(), creditAmount);
      
      await expect(
        creditManager.connect(holder2).useCredit(
          await recipient.getAddress(),
          creditAmount
        )
      ).to.be.revertedWith("Only credit holder can call this function");
    });

    it("Should distribute credit to all holders", async function () {
      // Add multiple holders
      await creditManager.addCreditHolder(await holder1.getAddress());
      await creditManager.addCreditHolder(await holder2.getAddress());

      // Transfer tokens to holders first
      const creditPerHolder = ethers.parseEther("1000");
      await carbonCredit.transfer(await holder1.getAddress(), creditPerHolder);
      await carbonCredit.transfer(await holder2.getAddress(), creditPerHolder);

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
  });

  describe("Credit Usage Tracking", function () {
    beforeEach(async function () {
      const creditAmount = ethers.parseEther("10000");
      
      // Transfer tokens to holder
      await carbonCredit.transfer(await holder1.getAddress(), creditAmount);
      
      // Add holder and give credit
      await creditManager.addCreditHolder(await holder1.getAddress());
      await creditManager.giveCredit(await holder1.getAddress(), creditAmount);
      
      // Holder approves CreditManager
      await carbonCredit.connect(holder1).approve(
        await creditManager.getAddress(),
        creditAmount
      );
    });

    it("Should track credit usage correctly", async function () {
      const useAmount = ethers.parseEther("500");
      await creditManager.connect(holder1).useCredit(await recipient.getAddress(), useAmount);

      const yearlyUsage = await creditManager.getYearlyUsage();
      expect(yearlyUsage).to.equal(useAmount);
    });
  });
});