const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CreditManager", function () {
  let CarbonCredit;
  let carbonCredit;
  let CreditManager;
  let creditManager;
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

    // Deploy CreditManager
    CreditManager = await ethers.getContractFactory("CreditManager");
    creditManager = await CreditManager.deploy(
      await owner.getAddress(),
      await carbonCredit.getAddress(),
      ethers.ZeroAddress // Using zero address since we're not testing reward functionality
    );

    // Transfer tokens to CreditManager and holders for testing
    const managerAmount = ethers.parseEther("500000");
    await carbonCredit.transfer(await creditManager.getAddress(), managerAmount);
    await carbonCredit.transfer(await holder1.getAddress(), ethers.parseEther("10000"));
    await carbonCredit.transfer(await holder2.getAddress(), ethers.parseEther("10000"));
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
      await expect(creditManager.addCreditHolder(await holder1.getAddress()))
        .to.emit(creditManager, "AddCreditHolder")
        .withArgs(await holder1.getAddress());
      expect(await creditManager.holderList(await holder1.getAddress())).to.be.true;
    });

    it("Should remove a credit holder successfully", async function () {
      await creditManager.addCreditHolder(await holder1.getAddress());
      await expect(creditManager.removeCreditHolder(await holder1.getAddress()))
        .to.emit(creditManager, "RemoveCreditHolder")
        .withArgs(await holder1.getAddress());
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

  describe("Credit Allocation", function () {
    beforeEach(async function () {
      await creditManager.addCreditHolder(await holder1.getAddress());
    });

    it("Should give credit to holder successfully", async function () {
      const creditAmount = ethers.parseEther("1000");
      
      // CreditManager needs to approve itself to manage its allowances
      await expect(creditManager.connect(owner).giveCredit(await holder1.getAddress(), creditAmount))
        .to.emit(creditManager, "CreditAllocated")
        .withArgs(await holder1.getAddress(), creditAmount);

      const allowance = await creditManager.getFactoryAllowance(await holder1.getAddress());
      expect(allowance).to.equal(creditAmount);
    });

    it("Should set credit amount successfully", async function () {
      const creditAmount = ethers.parseEther("1000");
      
      await expect(creditManager.setCredit(await holder1.getAddress(), creditAmount))
        .to.emit(creditManager, "SetCredit")
        .withArgs(await holder1.getAddress(), creditAmount);
      
      const allowance = await creditManager.getFactoryAllowance(await holder1.getAddress());
      expect(allowance).to.equal(creditAmount);
    });

    it("Should reduce credit successfully", async function () {
      const initialCredit = ethers.parseEther("1000");
      const reduceAmount = ethers.parseEther("500");
      
      // First give credit
      await creditManager.giveCredit(await holder1.getAddress(), initialCredit);
      
      // Then reduce it
      await expect(creditManager.reduceCredit(await holder1.getAddress(), reduceAmount))
        .to.emit(creditManager, "CreditDeallocated")
        .withArgs(await holder1.getAddress(), reduceAmount);
      
      const allowance = await creditManager.getFactoryAllowance(await holder1.getAddress());
      expect(allowance).to.equal(reduceAmount);
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

      const holder1Allowance = await creditManager.getFactoryAllowance(await holder1.getAddress());
      const holder2Allowance = await creditManager.getFactoryAllowance(await holder2.getAddress());

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

  describe("Credit Usage", function () {
    const creditAmount = ethers.parseEther("1000");
    const useAmount = ethers.parseEther("500");

    beforeEach(async function () {
      // Setup holder
      await creditManager.addCreditHolder(await holder1.getAddress());
      await creditManager.giveCredit(await holder1.getAddress(), creditAmount);
      
      // Approve creditManager to spend holder's tokens
      await carbonCredit.connect(holder1).approve(await creditManager.getAddress(), creditAmount);
    });

    it("Should allow holder to use credit", async function () {
      await expect(creditManager.connect(holder1).useCredit(await recipient.getAddress(), useAmount))
        .to.emit(creditManager, "creditUsed")
        .withArgs(await holder1.getAddress(), await recipient.getAddress(), useAmount);
        
      const recipientBalance = await carbonCredit.balanceOf(await recipient.getAddress());
      expect(recipientBalance).to.equal(useAmount);
    });

    it("Should fail when non-holder tries to use credit", async function () {
      await expect(
        creditManager.connect(holder2).useCredit(await recipient.getAddress(), useAmount)
      ).to.be.revertedWith("Only credit holder can call this function");
    });

    it("Should fail when trying to use more credit than allowed", async function () {
      const tooMuchCredit = ethers.parseEther("2000");
      await expect(
        creditManager.connect(holder1).useCredit(await recipient.getAddress(), tooMuchCredit)
      ).to.be.revertedWith("Allowance insufficient");
    });
  });

  describe("Owner Operations", function () {
    it("Should allow owner to change owner", async function () {
      await expect(creditManager.changeOwner(await holder1.getAddress()))
        .to.emit(creditManager, "ChangeOwner")
        .withArgs(await holder1.getAddress());
      expect(await creditManager.owner()).to.equal(await holder1.getAddress());
    });

    it("Should not allow non-owner to change owner", async function () {
      await expect(
        creditManager.connect(holder1).changeOwner(await holder2.getAddress())
      ).to.be.revertedWith("Only owner can call this function");
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