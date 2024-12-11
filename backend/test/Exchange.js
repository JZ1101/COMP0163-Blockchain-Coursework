const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Exchange", function () {
  let carbonCredit, deaiToken, exchange;
  let owner, user1, user2;
  const INITIAL_SUPPLY = ethers.parseEther("1000000");

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy CarbonCredit
    const CarbonCredit = await ethers.getContractFactory("CarbonCredit");
    carbonCredit = await CarbonCredit.deploy(INITIAL_SUPPLY, 365);
    await carbonCredit.waitForDeployment();

    // Deploy mock DEAI Token
    const DEAIToken = await ethers.getContractFactory("CarbonCredit");
    deaiToken = await DEAIToken.deploy(INITIAL_SUPPLY, 365);
    await deaiToken.waitForDeployment();

    // Deploy Exchange
    const Exchange = await ethers.getContractFactory("Exchange");
    exchange = await Exchange.deploy(
      await carbonCredit.getAddress(),
      await deaiToken.getAddress()
    );
    await exchange.waitForDeployment();
  });

  describe("Initialization", function () {
    it("Should set the correct token addresses", async function () {
      expect(await exchange.carbonCreditToken()).to.equal(await carbonCredit.getAddress());
      expect(await exchange.deaiToken()).to.equal(await deaiToken.getAddress());
    });
  });

  describe("Liquidity", function () {
    const INITIAL_LIQUIDITY_CARBON = ethers.parseEther("1000");
    const INITIAL_LIQUIDITY_DEAI = ethers.parseEther("2000");

    beforeEach(async function () {
      await carbonCredit.approve(await exchange.getAddress(), INITIAL_LIQUIDITY_CARBON);
      await deaiToken.approve(await exchange.getAddress(), INITIAL_LIQUIDITY_DEAI);
    });

    it("Should add initial liquidity correctly", async function () {
      const addLiquidityTx = await exchange.addLiquidity(INITIAL_LIQUIDITY_CARBON, INITIAL_LIQUIDITY_DEAI);
      
      // Get shares from the balanceOf mapping after adding liquidity
      const shares = await exchange.balanceOf(owner.address);

      await expect(addLiquidityTx)
        .to.emit(exchange, "AddLiquidity")
        .withArgs(owner.address, INITIAL_LIQUIDITY_CARBON, INITIAL_LIQUIDITY_DEAI, shares);

      // Verify reserves
      expect(await exchange.reserveCarbonCredit()).to.equal(INITIAL_LIQUIDITY_CARBON);
      expect(await exchange.reserveDEAI()).to.equal(INITIAL_LIQUIDITY_DEAI);
      
      // Verify total supply equals shares
      expect(await exchange.totalSupply()).to.equal(shares);

      // Verify approximate shares value (√(1000 * 2000) * 10^18)
      const expectedSharesApprox = ethers.parseEther("1414.213562");
      const tolerance = expectedSharesApprox / 100n; // 1% tolerance
      const difference = shares > expectedSharesApprox ? 
        shares - expectedSharesApprox : 
        expectedSharesApprox - shares;
      
      expect(difference).to.be.lessThan(tolerance);
    });

    it("Should add subsequent liquidity with correct ratio", async function () {
      // Add initial liquidity
      await exchange.addLiquidity(INITIAL_LIQUIDITY_CARBON, INITIAL_LIQUIDITY_DEAI);
      const initialShares = await exchange.balanceOf(owner.address);

      // Transfer tokens to user1
      await carbonCredit.transfer(user1.address, INITIAL_LIQUIDITY_CARBON);
      await deaiToken.transfer(user1.address, INITIAL_LIQUIDITY_DEAI);

      // User1 adds liquidity
      await carbonCredit.connect(user1).approve(await exchange.getAddress(), INITIAL_LIQUIDITY_CARBON);
      await deaiToken.connect(user1).approve(await exchange.getAddress(), INITIAL_LIQUIDITY_DEAI);

      await expect(exchange.connect(user1).addLiquidity(INITIAL_LIQUIDITY_CARBON, INITIAL_LIQUIDITY_DEAI))
        .to.emit(exchange, "AddLiquidity");

      // Verify doubled reserves
      expect(await exchange.reserveCarbonCredit()).to.equal(INITIAL_LIQUIDITY_CARBON * 2n);
      expect(await exchange.reserveDEAI()).to.equal(INITIAL_LIQUIDITY_DEAI * 2n);

      // Verify user1 got the same number of shares
      expect(await exchange.balanceOf(user1.address)).to.equal(initialShares);
    });

    it("Should remove liquidity correctly", async function () {
        // Add liquidity first
        await exchange.addLiquidity(INITIAL_LIQUIDITY_CARBON, INITIAL_LIQUIDITY_DEAI);
        const shares = await exchange.balanceOf(owner.address);
  
        // Get initial balances
        const initialCarbonBalance = await carbonCredit.balanceOf(owner.address);
        const initialDEAIBalance = await deaiToken.balanceOf(owner.address);
  
        await expect(exchange.removeLiquidity(shares))
          .to.emit(exchange, "RemoveLiquidity")
          .withArgs(owner.address, shares, INITIAL_LIQUIDITY_CARBON, INITIAL_LIQUIDITY_DEAI);
  
        // Verify reserves are zero
        expect(await exchange.reserveCarbonCredit()).to.equal(0);
        expect(await exchange.reserveDEAI()).to.equal(0);
  
        // Verify tokens returned using BigInt arithmetic
        expect(await carbonCredit.balanceOf(owner.address)).to.equal(initialCarbonBalance + INITIAL_LIQUIDITY_CARBON);
        expect(await deaiToken.balanceOf(owner.address)).to.equal(initialDEAIBalance + INITIAL_LIQUIDITY_DEAI);
      });
  });

  describe("Swapping", function () {
    const INITIAL_LIQUIDITY_CARBON = ethers.parseEther("1000");
    const INITIAL_LIQUIDITY_DEAI = ethers.parseEther("2000");
    const SWAP_AMOUNT = ethers.parseEther("10");

    beforeEach(async function () {
      // Add initial liquidity
      await carbonCredit.approve(await exchange.getAddress(), INITIAL_LIQUIDITY_CARBON);
      await deaiToken.approve(await exchange.getAddress(), INITIAL_LIQUIDITY_DEAI);
      await exchange.addLiquidity(INITIAL_LIQUIDITY_CARBON, INITIAL_LIQUIDITY_DEAI);

      // Transfer tokens to user1 for swapping
      await carbonCredit.transfer(user1.address, SWAP_AMOUNT);
      await deaiToken.transfer(user1.address, SWAP_AMOUNT);
    });

    it("Should swap Carbon Credit for DEAI", async function () {
      await carbonCredit.connect(user1).approve(await exchange.getAddress(), SWAP_AMOUNT);
      
      const beforeBalance = await deaiToken.balanceOf(user1.address);
      
      await expect(exchange.connect(user1).swap(await carbonCredit.getAddress(), SWAP_AMOUNT))
        .to.emit(exchange, "Swap");

      const afterBalance = await deaiToken.balanceOf(user1.address);
      expect(afterBalance).to.be.gt(beforeBalance);
    });

    it("Should swap DEAI for Carbon Credit", async function () {
      await deaiToken.connect(user1).approve(await exchange.getAddress(), SWAP_AMOUNT);
      
      const beforeBalance = await carbonCredit.balanceOf(user1.address);
      
      await expect(exchange.connect(user1).swap(await deaiToken.getAddress(), SWAP_AMOUNT))
        .to.emit(exchange, "Swap");

      const afterBalance = await carbonCredit.balanceOf(user1.address);
      expect(afterBalance).to.be.gt(beforeBalance);
    });

    it("Should fail when swapping with insufficient balance", async function () {
      const largeAmount = ethers.parseEther("10000");
      await carbonCredit.connect(user1).approve(await exchange.getAddress(), largeAmount);
      
      await expect(
        exchange.connect(user1).swap(await carbonCredit.getAddress(), largeAmount)
      ).to.be.reverted;
    });

    it("Should fail when swapping with invalid token", async function () {
      await expect(
        exchange.connect(user1).swap(ethers.ZeroAddress, SWAP_AMOUNT)
      ).to.be.revertedWith("Invalid token");
    });

    it("Should update reserves after swap", async function () {
      await carbonCredit.connect(user1).approve(await exchange.getAddress(), SWAP_AMOUNT);
      
      const beforeCarbonReserve = await exchange.reserveCarbonCredit();
      const beforeDEAIReserve = await exchange.reserveDEAI();

      await exchange.connect(user1).swap(await carbonCredit.getAddress(), SWAP_AMOUNT);

      expect(await exchange.reserveCarbonCredit()).to.not.equal(beforeCarbonReserve);
      expect(await exchange.reserveDEAI()).to.not.equal(beforeDEAIReserve);
    });

    it("Should apply correct fees during swap", async function () {
      await carbonCredit.connect(user1).approve(await exchange.getAddress(), SWAP_AMOUNT);
      
      const beforeDEAIBalance = await deaiToken.balanceOf(user1.address);
      await exchange.connect(user1).swap(await carbonCredit.getAddress(), SWAP_AMOUNT);
      const afterDEAIBalance = await deaiToken.balanceOf(user1.address);
      
      // Calculate expected output with 0.1% fee
      const amountInWithFee = (SWAP_AMOUNT * 999n) / 1000n;
      const expectedOutput = (INITIAL_LIQUIDITY_DEAI * amountInWithFee) / (INITIAL_LIQUIDITY_CARBON + amountInWithFee);
      
      expect(afterDEAIBalance - beforeDEAIBalance).to.equal(expectedOutput);
    });
  });

  describe("Math Functions", function () {
    it("Should handle zero liquidity case correctly", async function () {
      const smallAmount = ethers.parseEther("1");
      await carbonCredit.approve(await exchange.getAddress(), smallAmount);
      await deaiToken.approve(await exchange.getAddress(), smallAmount);
      
      await expect(exchange.addLiquidity(smallAmount, smallAmount))
        .to.emit(exchange, "AddLiquidity");

      expect(await exchange.totalSupply()).to.equal(smallAmount);
    });

    it("Should prevent adding liquidity with incorrect ratio", async function () {
      // Add initial liquidity
      const initialCarbon = ethers.parseEther("1000");
      const initialDEAI = ethers.parseEther("2000");
      
      await carbonCredit.approve(await exchange.getAddress(), initialCarbon);
      await deaiToken.approve(await exchange.getAddress(), initialDEAI);
      await exchange.addLiquidity(initialCarbon, initialDEAI);

      // Try to add liquidity with wrong ratio
      const wrongRatioCarbon = ethers.parseEther("100");
      const wrongRatioDEAI = ethers.parseEther("100");
      
      await carbonCredit.approve(await exchange.getAddress(), wrongRatioCarbon);
      await deaiToken.approve(await exchange.getAddress(), wrongRatioDEAI);
      
      await expect(
        exchange.addLiquidity(wrongRatioCarbon, wrongRatioDEAI)
      ).to.be.revertedWith("Invalid ratio");
    });
  });
});