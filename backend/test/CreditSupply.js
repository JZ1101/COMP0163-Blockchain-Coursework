const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CarbonCredit", function () {
  let CarbonCredit;
  let carbonCredit;
  let owner;
  let user;
  let startTime;
  const initialSupply = ethers.parseEther("1000");
  const timeFrame = 30 * 24 * 60 * 60; // 30 days in seconds

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();
    
    // Deploy the contract
    CarbonCredit = await ethers.getContractFactory("CarbonCredit");
    carbonCredit = await CarbonCredit.deploy(initialSupply, timeFrame);
    await carbonCredit.waitForDeployment();

    // Get the block timestamp after deployment
    const block = await ethers.provider.getBlock('latest');
    startTime = block.timestamp;
  });

  describe("CreditSupply", function () {
    it("Should allow initial supply increase immediately", async function () {
      const additionalSupply = ethers.parseEther("500");
      const initialTotalSupply = await carbonCredit.totalSupply();
      const initialBalance = await carbonCredit.balanceOf(owner.address);

      await carbonCredit.getSupply(additionalSupply);

      const finalTotalSupply = await carbonCredit.totalSupply();
      const finalBalance = await carbonCredit.balanceOf(owner.address);

      expect(finalTotalSupply).to.equal(initialTotalSupply + additionalSupply);
      expect(finalBalance).to.equal(initialBalance + additionalSupply);
    });

    it("Should revert when called before required timeFrame after first increase", async function () {
      const additionalSupply = ethers.parseEther("500");
      
      // First increase should work (period = 0)
      await carbonCredit.getSupply(additionalSupply);
      
      // Second increase should fail because now period = 1
      await expect(
        carbonCredit.getSupply(additionalSupply)
      ).to.be.revertedWith("time frame is not reached, can adust supply after");
    });

    it("Should revert when called by non-supplier", async function () {
      const additionalSupply = ethers.parseEther("500");

      await expect(
        carbonCredit.connect(user).getSupply(additionalSupply)
      ).to.be.revertedWith("only credit supplier can call this function");
    });

    it("Should allow multiple supply increases after waiting required timeFrames", async function () {
      const firstIncrease = ethers.parseEther("500");
      const secondIncrease = ethers.parseEther("300");
      const initialTotalSupply = await carbonCredit.totalSupply();

      // First increase should work immediately (period = 0)
      await carbonCredit.getSupply(firstIncrease);

      // Wait for timeFrame to pass
      await ethers.provider.send("evm_increaseTime", [timeFrame]);
      await ethers.provider.send("evm_mine");

      // Second increase should now work
      await carbonCredit.getSupply(secondIncrease);

      const finalTotalSupply = await carbonCredit.totalSupply();
      expect(finalTotalSupply).to.equal(
        initialTotalSupply + firstIncrease + secondIncrease
      );
    });

    it("Should properly track period increases and enforce timeFrame waits", async function () {
      const additionalSupply = ethers.parseEther("500");
      
      // First increase works immediately (period = 0)
      await carbonCredit.getSupply(additionalSupply);
      
      // Try second increase before timeFrame has passed (should fail)
      await ethers.provider.send("evm_increaseTime", [timeFrame - 1000]);
      await ethers.provider.send("evm_mine");
      
      await expect(
        carbonCredit.getSupply(additionalSupply)
      ).to.be.revertedWith("time frame is not reached, can adust supply after");
      
      // Wait for full timeFrame
      await ethers.provider.send("evm_increaseTime", [1000]); // Complete the timeFrame
      await ethers.provider.send("evm_mine");
      
      // Now should work
      await carbonCredit.getSupply(additionalSupply);
    });
  });
});