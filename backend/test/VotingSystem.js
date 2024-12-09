const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Voting System", function () {
  let voting, voteToken, Voting;
  let deployer, voter1, voter2, voter3;
  const initialSupply = 1000;
  const voteAmount = ethers.parseEther("50");

  beforeEach(async function () {
    [deployer, voter1, voter2, voter3] = await ethers.getSigners();
    
    const VoteToken = await ethers.getContractFactory("VoteToken");
    voteToken = await VoteToken.deploy(initialSupply);
    await voteToken.waitForDeployment();
    
    Voting = await ethers.getContractFactory("Voting");
    voting = await Voting.deploy(deployer.address, await voteToken.getAddress());
    await voting.waitForDeployment();
  });

  describe("VoteToken", function () {
    it("Should set correct initial supply and token details", async function () {
      expect(await voteToken.totalSupply()).to.equal(ethers.parseEther(initialSupply.toString()));
      expect(await voteToken.name()).to.equal("VoteToken");
      expect(await voteToken.symbol()).to.equal("VOTE");
      expect(await voteToken.decimals()).to.equal(18);
    });

    it("Should handle transfers", async function () {
      const amount = ethers.parseEther("100");
      await voteToken.transfer(voter1.address, amount);
      expect(await voteToken.balanceOf(voter1.address)).to.equal(amount);
      expect(await voteToken.balanceOf(deployer.address)).to.equal(ethers.parseEther("900"));
    });

    it("Should handle approvals and allowances", async function () {
      const amount = ethers.parseEther("100");
      await voteToken.approve(voter1.address, amount);
      expect(await voteToken.allowance(deployer.address, voter1.address)).to.equal(amount);
    });

    it("Should handle transferFrom", async function () {
      const amount = ethers.parseEther("100");
      await voteToken.approve(voter1.address, amount);
      await voteToken.connect(voter1).transferFrom(deployer.address, voter2.address, amount);
      expect(await voteToken.balanceOf(voter2.address)).to.equal(amount);
      expect(await voteToken.allowance(deployer.address, voter1.address)).to.equal(0);
    });

    it("Should prevent transfers with insufficient balance", async function () {
      const amount = ethers.parseEther("2000");
      await expect(
        voteToken.transfer(voter1.address, amount)
      ).to.be.revertedWith("Insufficient balance");
    });

    it("Should prevent transferFrom with insufficient allowance", async function () {
      const amount = ethers.parseEther("100");
      await voteToken.transfer(voter1.address, amount);
      await expect(
        voteToken.connect(voter2).transferFrom(voter1.address, voter3.address, amount)
      ).to.be.revertedWith("Allowance exceeded");
    });
  });

  describe("Voting", function () {
    beforeEach(async function () {
      await voting.addVoter(voter1.address);
      await voting.addVoter(voter2.address);
      await voteToken.transfer(voter1.address, voteAmount * 3n);
      await voteToken.transfer(voter2.address, voteAmount * 2n);
      await voteToken.connect(voter1).approve(await voting.getAddress(), voteAmount * 3n);
      await voteToken.connect(voter2).approve(await voting.getAddress(), voteAmount * 2n);
    });

    it("Should initialize correctly", async function () {
      const tokenAddress = await voteToken.getAddress();
      const newVoting = await Voting.deploy(deployer.address, tokenAddress);
      expect(await newVoting.owner()).to.equal(deployer.address);
      expect(await newVoting.voteToken()).to.equal(tokenAddress);

      await expect(
        Voting.deploy(deployer.address, ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid token address");
    });

    it("Should deploy new VoteToken", async function () {
      const tx = await voting.deployVoteToken(initialSupply);
      const receipt = await tx.wait();
      const event = receipt.logs.find(x => x.fragment.name === "TokenDeployed");
      expect(event).to.not.be.undefined;
      const newToken = await ethers.getContractAt("VoteToken", event.args[0]);
      expect(await newToken.totalSupply()).to.equal(ethers.parseEther(initialSupply.toString()));
    });

    it("Should change owner", async function () {
      await voting.changeOwner(voter1.address);
      expect(await voting.owner()).to.equal(voter1.address);
      await expect(
        voting.addVoter(voter3.address)
      ).to.be.revertedWith("Only owner can call this function");
    });

    it("Should handle voter management", async function () {
      await voting.addVoter(voter3.address);
      expect(await voting.voterList(voter3.address)).to.be.true;
      
      await voting.removeVoter(voter3.address);
      expect(await voting.voterList(voter3.address)).to.be.false;
      await expect(
        voting.connect(voter3).voteForAMMContract(voteAmount)
      ).to.be.revertedWith("Only voter can call this function");
    });

    it("Should emit voteUsed events", async function () {
      const votingAddress = await voting.getAddress();
      
      await expect(voting.connect(voter1).voteForAMMContract(voteAmount))
        .to.emit(voting, "voteUsed")
        .withArgs(voter1.address, votingAddress, voteAmount);

      await expect(voting.connect(voter1).voteForSupplyChainContract(voteAmount))
        .to.emit(voting, "voteUsed")
        .withArgs(voter1.address, votingAddress, voteAmount);

      await expect(voting.connect(voter1).voteForRewardContract(voteAmount))
        .to.emit(voting, "voteUsed")
        .withArgs(voter1.address, votingAddress, voteAmount);
    });

    it("Should track votes correctly", async function () {
      await voting.connect(voter1).voteForAMMContract(voteAmount);
      await voting.connect(voter2).voteForAMMContract(voteAmount);
      expect(await voting.total_Votes_AMM()).to.equal(voteAmount * 2n);
      expect(await voting.voteBalance(voter1.address)).to.equal(voteAmount);
      expect(await voting.voteBalance(voter2.address)).to.equal(voteAmount);
    });

    it("Should check all voting topics correctly", async function () {
      await voting.connect(voter1).voteForAMMContract(voteAmount);
      await voting.connect(voter2).voteForSupplyChainContract(voteAmount);
      await voting.connect(voter1).voteForRewardContract(voteAmount);

      expect(await voting.getTotalVotesForTopic(0)).to.be.true;
      expect(await voting.getTotalVotesForTopic(1)).to.be.true;
      expect(await voting.getTotalVotesForTopic(2)).to.be.true;

      const result = await voting.checkIfTopicPassed(await voting.getAddress(), 0);
      expect(result.topic).to.equal(0);
      expect(result.hasPassed).to.be.true;

      await expect(voting.getTotalVotesForTopic(3)).to.be.revertedWith("Invalid topic");
      await expect(
        voting.checkIfTopicPassed(ethers.ZeroAddress, 0)
      ).to.be.revertedWith("Invalid voting contract address");
    });

    it("Should enforce voting restrictions", async function () {
      await expect(
        voting.connect(voter3).voteForAMMContract(voteAmount)
      ).to.be.revertedWith("Only voter can call this function");

      await expect(
        voting.connect(voter1).voteForAMMContract(0)
      ).to.be.revertedWith("Invalid votes");

      const largeAmount = ethers.parseEther("1000");
      await expect(
        voting.connect(voter1).voteForAMMContract(largeAmount)
      ).to.be.revertedWith("Insufficient balance");
    });

    it("Should handle voters array correctly", async function () {
        await voting.addVoter(voter3.address);
        expect(await voting.voters(0)).to.equal(voter1.address);
        
        await voting.removeVoter(voter2.address);
        expect(await voting.voters(1)).to.equal(voter3.address);
        await expect(voting.voters(2)).to.be.reverted;
    });

    it("Should handle voter removal", async function () {
        const approvalAmount = ethers.parseEther("100");
        const votingAddress = await voting.getAddress();
  
        await voteToken.transfer(voter3.address, approvalAmount);
        await voteToken.connect(voter3).approve(votingAddress, approvalAmount);
        await voting.addVoter(voter3.address);
        
        await voting.removeVoter(voter3.address);
        expect(await voting.voterList(voter3.address)).to.equal(false);
        await expect(
          voting.connect(voter3).voteForAMMContract(approvalAmount)
        ).to.be.revertedWith("Only voter can call this function");
      });
  });
});