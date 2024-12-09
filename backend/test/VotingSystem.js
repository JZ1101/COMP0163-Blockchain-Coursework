const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Voting System", function () {
  let votingDeployer, voteToken, voting;
  let deployer, voter1, voter2, voter3;
  const initialSupply = 1000;
  const voteAmount = 50;

  beforeEach(async function () {
    [deployer, voter1, voter2, voter3] = await ethers.getSigners();
    
    // Deploy VoteToken directly first to ensure proper initialization
    const VoteToken = await ethers.getContractFactory("VoteToken");
    voteToken = await VoteToken.deploy(initialSupply);
    await voteToken.waitForDeployment();
    
    // Deploy VotingDeployer
    const VotingDeployer = await ethers.getContractFactory("VotingDeployer");
    votingDeployer = await VotingDeployer.deploy();
    await votingDeployer.waitForDeployment();
    
    // Deploy Voting contract
    const votingTx = await votingDeployer.deployVotingContract(await voteToken.getAddress());
    const votingReceipt = await votingTx.wait();
    const votingEvent = votingReceipt.logs.find(x => x.fragment.name === "VotingContractDeployed");
    voting = await ethers.getContractAt("Voting", votingEvent.args[0]);
  });

  describe("VotingDeployer", function () {
    it("Should deploy VoteToken with correct initial supply", async function () {
      const tokenTx = await votingDeployer.deployVoteToken(initialSupply);
      const receipt = await tokenTx.wait();
      const event = receipt.logs.find(x => x.fragment.name === "TokenDeployed");
      const newToken = await ethers.getContractAt("VoteToken", event.args[0]);
      
      expect(await newToken.totalSupply()).to.equal(ethers.parseEther(initialSupply.toString()));
    });

    it("Should deploy Voting contract linked to token", async function () {
      const votingTx = await votingDeployer.deployVotingContract(await voteToken.getAddress());
      const votingReceipt = await votingTx.wait();
      const votingAddress = votingReceipt.logs.find(x => x.fragment.name === "VotingContractDeployed").args[0];
      
      const newVoting = await ethers.getContractAt("Voting", votingAddress);
      expect(await newVoting.owner()).to.equal(deployer.address);
    });

    it("Should prevent deploying Voting contract with zero token address", async function () {
      await expect(
        votingDeployer.deployVotingContract(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid token address");
    });

    it("Should check if topics passed threshold correctly", async function () {
      await voting.addVoter(voter1.address);
      await voteToken.connect(deployer).transfer(voter1.address, voteAmount);
      await voteToken.connect(voter1).approve(await voting.getAddress(), voteAmount);
      await voting.connect(voter1).voteForAMMContract(voteAmount);

      const votingAddress = await voting.getAddress();
      
      const ammResult = await votingDeployer.checkIfTopicPassed(votingAddress, 0);
      expect(ammResult.topic).to.equal(0);
      expect(ammResult.hasPassed).to.be.true;

      const supplyResult = await votingDeployer.checkIfTopicPassed(votingAddress, 1);
      expect(supplyResult.topic).to.equal(1);
      expect(supplyResult.hasPassed).to.be.false;

      await expect(
        votingDeployer.checkIfTopicPassed(votingAddress, 3)
      ).to.be.revertedWith("Invalid topic ID");
    });
  });

  describe("VoteToken", function () {
    it("Should set the correct initial supply", async function () {
      const totalSupply = await voteToken.totalSupply();
      const deployerBalance = await voteToken.balanceOf(deployer.address);
      expect(totalSupply).to.equal(ethers.parseEther(initialSupply.toString()));
      expect(deployerBalance).to.equal(totalSupply);
    });

    it("Should allow token transfers", async function () {
      const transferAmount = ethers.parseEther("100");
      await voteToken.connect(deployer).transfer(voter1.address, transferAmount);
      expect(await voteToken.balanceOf(voter1.address)).to.equal(transferAmount);
    });

    it("Should handle approvals correctly", async function () {
      const approvalAmount = ethers.parseEther("100");
      await voteToken.connect(deployer).approve(voter1.address, approvalAmount);
      expect(await voteToken.allowance(deployer.address, voter1.address)).to.equal(approvalAmount);
    });

    it("Should allow transferFrom with sufficient allowance", async function () {
      const transferAmount = ethers.parseEther("100");
      await voteToken.connect(deployer).approve(voter1.address, transferAmount);
      await voteToken.connect(voter1).transferFrom(deployer.address, voter2.address, transferAmount);
      expect(await voteToken.balanceOf(voter2.address)).to.equal(transferAmount);
    });

    it("Should prevent transferFrom with insufficient allowance", async function () {
      const transferAmount = ethers.parseEther("100");
      await expect(
        voteToken.connect(voter1).transferFrom(deployer.address, voter2.address, transferAmount)
      ).to.be.revertedWith("Allowance exceeded");
    });
  });

  describe("Voting", function () {
    beforeEach(async function () {
      await voting.connect(deployer).addVoter(voter1.address);
      await voting.connect(deployer).addVoter(voter2.address);
      await voteToken.connect(deployer).transfer(voter1.address, voteAmount);
      await voteToken.connect(deployer).transfer(voter2.address, voteAmount);
      await voteToken.connect(voter1).approve(await voting.getAddress(), voteAmount);
      await voteToken.connect(voter2).approve(await voting.getAddress(), voteAmount);
    });

    it("Should allow owner to change owner", async function () {
      await voting.changeOwner(voter1.address);
      expect(await voting.owner()).to.equal(voter1.address);
    });

    it("Should prevent non-owner from changing owner", async function () {
      await expect(
        voting.connect(voter1).changeOwner(voter2.address)
      ).to.be.revertedWith("Only owner can call this function");
    });

    it("Should allow adding and removing voters", async function () {
      await voting.addVoter(voter3.address);
      expect(await voting.voterList(voter3.address)).to.be.true;
      
      await voting.removeVoter(voter3.address);
      expect(await voting.voterList(voter3.address)).to.be.false;
    });

    it("Should prevent adding invalid voter address", async function () {
      await expect(
        voting.addVoter(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid address");
    });

    it("Should allow voting for AMM contract", async function () {
      await voting.connect(voter1).voteForAMMContract(voteAmount);
      expect(await voting.total_Votes_AMM()).to.equal(voteAmount);
      expect(await voting.voteBalance(voter1.address)).to.equal(voteAmount);
    });

    it("Should allow voting for Supply Chain contract", async function () {
      await voting.connect(voter1).voteForSupplyChainContract(voteAmount);
      expect(await voting.total_Votes_SupplyChain()).to.equal(voteAmount);
      expect(await voting.voteBalance(voter1.address)).to.equal(voteAmount);
    });

    it("Should allow voting for Reward contract", async function () {
      await voting.connect(voter1).voteForRewardContract(voteAmount);
      expect(await voting.total_VotesReward()).to.equal(voteAmount);
      expect(await voting.voteBalance(voter1.address)).to.equal(voteAmount);
    });

    it("Should prevent voting with zero votes", async function () {
      await expect(
        voting.connect(voter1).voteForAMMContract(0)
      ).to.be.revertedWith("Invalid votes");
    });

    it("Should prevent non-voters from voting", async function () {
      await voteToken.transfer(voter3.address, voteAmount);
      await voteToken.connect(voter3).approve(await voting.getAddress(), voteAmount);
      
      await expect(
        voting.connect(voter3).voteForAMMContract(voteAmount)
      ).to.be.revertedWith("Only voter can call this function");
    });

    it("Should prevent voting with insufficient balance", async function () {
      const largeAmount = ethers.parseEther("1000");
      await expect(
        voting.connect(voter1).voteForAMMContract(largeAmount)
      ).to.be.revertedWith("Insufficient balance");
    });

    it("Should track individual voter balances correctly", async function () {
      await voting.connect(voter1).voteForAMMContract(voteAmount);
      await voting.connect(voter2).voteForSupplyChainContract(voteAmount);

      expect(await voting.voteBalance(voter1.address)).to.equal(voteAmount);
      expect(await voting.voteBalance(voter2.address)).to.equal(voteAmount);
      expect(await voting.total_Votes_AMM()).to.equal(voteAmount);
      expect(await voting.total_Votes_SupplyChain()).to.equal(voteAmount);
    });
  });
});