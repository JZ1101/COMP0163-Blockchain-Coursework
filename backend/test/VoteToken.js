const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VoteToken", function () {
  let voteToken;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  beforeEach(async function () {
    // Get test accounts
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // Deploy VoteToken
    const VoteToken = await ethers.getContractFactory("VoteToken");
    voteToken = await VoteToken.connect(owner).deploy(1000);
    await voteToken.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await voteToken.owner()).to.equal(owner.address);
    });

    it("Should assign the total supply to owner", async function () {
      const totalSupply = await voteToken.totalSupply();
      const ownerBalance = await voteToken.balanceOf(owner.address);
      expect(ownerBalance.toString()).to.equal(totalSupply.toString());
    });

    it("Should set the correct initial values", async function () {
      expect(await voteToken.name()).to.equal("VoteToken");
      expect(await voteToken.symbol()).to.equal("VOTE");
      expect(await voteToken.decimals()).to.equal(18);
      expect(await voteToken.votingContract()).to.equal(ethers.ZeroAddress);
    });

    it("Should set correct total supply with decimals", async function () {
      const expectedSupply = BigInt(1000) * BigInt(10 ** 18); // 1000 tokens with 18 decimals
      expect(await voteToken.totalSupply()).to.equal(expectedSupply);
    });
  });

  describe("Token Transfers", function () {
    it("Should transfer tokens between accounts", async function () {
      // Transfer 50 tokens from owner to addr1
      await voteToken.transfer(addr1.address, 50);
      expect(await voteToken.balanceOf(addr1.address)).to.equal(50);

      // Transfer 30 tokens from addr1 to addr2
      await voteToken.connect(addr1).transfer(addr2.address, 30);
      expect(await voteToken.balanceOf(addr2.address)).to.equal(30);
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const initialBalance = await voteToken.balanceOf(owner.address);
      await expect(
        voteToken.transfer(addr1.address, initialBalance + BigInt(1))
      ).to.be.revertedWith("Insufficient balance");
    });

    it("Should update balances after transfers", async function () {
      const initialOwnerBalance = await voteToken.balanceOf(owner.address);

      // Transfer 100 tokens from owner to addr1
      await voteToken.transfer(addr1.address, 100);

      // Transfer 50 tokens from addr1 to addr2
      await voteToken.connect(addr1).transfer(addr2.address, 50);

      // Check balances
      const finalOwnerBalance = await voteToken.balanceOf(owner.address);
      const addr1Balance = await voteToken.balanceOf(addr1.address);
      const addr2Balance = await voteToken.balanceOf(addr2.address);

      expect(finalOwnerBalance).to.equal(initialOwnerBalance - BigInt(100));
      expect(addr1Balance).to.equal(BigInt(50));
      expect(addr2Balance).to.equal(BigInt(50));
    });
  });

  describe("Voting Contract Management", function () {
    it("Should allow owner to set voting contract", async function () {
      await voteToken.connect(owner).setVotingContract(addr1.address);
      expect(await voteToken.votingContract()).to.equal(addr1.address);
    });

    it("Should emit VotingContractSet event", async function () {
      await expect(voteToken.setVotingContract(addr1.address))
        .to.emit(voteToken, "VotingContractSet")
        .withArgs(addr1.address);
    });

    it("Should prevent setting voting contract to zero address", async function () {
      await expect(
        voteToken.setVotingContract(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid voting contract address");
    });

    it("Should prevent non-owner from setting voting contract", async function () {
      await expect(
        voteToken.connect(addr1).setVotingContract(addr2.address)
      ).to.be.revertedWith("Only owner can call this function");
    });

    it("Should prevent setting voting contract twice", async function () {
      await voteToken.setVotingContract(addr1.address);
      await expect(
        voteToken.setVotingContract(addr2.address)
      ).to.be.revertedWith("Voting contract already set");
    });
  });

  describe("Token Removal", function () {
    beforeEach(async function () {
      // Setup: Set voting contract and transfer some tokens to addr1
      await voteToken.setVotingContract(addr1.address);
      await voteToken.transfer(addr2.address, 100);
    });

    it("Should allow voting contract to remove tokens", async function () {
      await voteToken.connect(addr1).removeTokens(addr2.address, 50);
      expect(await voteToken.balanceOf(addr2.address)).to.equal(50);
      expect(await voteToken.balanceOf(owner.address)).to.equal(
        (await voteToken.totalSupply()) - BigInt(50)
      );
    });

    it("Should emit RemoveTokens event", async function () {
      await expect(voteToken.connect(addr1).removeTokens(addr2.address, 50))
        .to.emit(voteToken, "RemoveTokens")
        .withArgs(addr2.address, 50);
    });

    it("Should prevent non-authorized addresses from removing tokens", async function () {
      await expect(
        voteToken.connect(addr2).removeTokens(addr2.address, 50)
      ).to.be.revertedWith("Only authorized can call this function");
    });

    it("Should fail if trying to remove more tokens than available", async function () {
      await expect(
        voteToken.connect(addr1).removeTokens(addr2.address, 150)
      ).to.be.revertedWith("Insufficient balance");
    });

    it("Should allow owner to remove tokens", async function () {
      await voteToken.connect(owner).removeTokens(addr2.address, 50);
      expect(await voteToken.balanceOf(addr2.address)).to.equal(50);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero token transfers", async function () {
      await voteToken.transfer(addr1.address, 0);
      expect(await voteToken.balanceOf(addr1.address)).to.equal(0);
    });

    it("Should handle multiple consecutive transfers", async function () {
      await voteToken.transfer(addr1.address, 100);
      await voteToken.transfer(addr2.address, 50);
      await voteToken.connect(addr1).transfer(addr2.address, 30);
      
      expect(await voteToken.balanceOf(addr1.address)).to.equal(70);
      expect(await voteToken.balanceOf(addr2.address)).to.equal(80);
    });

    it("Should prevent removing tokens from zero balance account", async function () {
      await voteToken.setVotingContract(addr1.address);
      await expect(
        voteToken.connect(addr1).removeTokens(addr2.address, 1)
      ).to.be.revertedWith("Insufficient balance");
    });

    it("Should maintain total supply after token movements", async function () {
      const initialSupply = await voteToken.totalSupply();
      
      await voteToken.transfer(addr1.address, 100);
      await voteToken.setVotingContract(addr2.address);
      await voteToken.connect(addr2).removeTokens(addr1.address, 50);
      
      expect(await voteToken.totalSupply()).to.equal(initialSupply);
    });
  });
});