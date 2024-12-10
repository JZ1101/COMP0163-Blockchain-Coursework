const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Voting System", function () {
  let voteToken;
  let voting;
  let owner;
  let voter1;
  let voter2;
  let ammContract;
  let supplyChainContract;
  let rewardContract;

  describe("Initial VoteToken Deployment", function() {
    beforeEach(async function () {
      [owner, voter1, voter2, ammContract, supplyChainContract, rewardContract] = await ethers.getSigners();

      const VoteToken = await ethers.getContractFactory("VoteToken");
      voteToken = await VoteToken.connect(owner).deploy(1000);
      await voteToken.waitForDeployment();
    });

    it("Should assign total supply to owner", async function () {
      const totalSupply = await voteToken.totalSupply();
      const ownerBalance = await voteToken.balanceOf(owner.address);
      expect(ownerBalance.toString()).to.equal(totalSupply.toString());
    });
  });

  describe("Main System Tests", function() {
    beforeEach(async function () {
      [owner, voter1, voter2, ammContract, supplyChainContract, rewardContract] = await ethers.getSigners();

      // Deploy VoteToken
      const VoteToken = await ethers.getContractFactory("VoteToken");
      voteToken = await VoteToken.connect(owner).deploy(1000);
      await voteToken.waitForDeployment();

      // Deploy Voting contract
      const Voting = await ethers.getContractFactory("Voting");
      voting = await Voting.connect(owner).deploy(
        owner.address,
        await voteToken.getAddress(),
        ammContract.address,
        supplyChainContract.address,
        rewardContract.address
      );
      await voting.waitForDeployment();

      // Set up the contracts
      await voteToken.connect(owner).setVotingContract(await voting.getAddress());
      await voting.connect(owner).initialize();

      // Transfer initial tokens to voters
      await voteToken.connect(owner).transfer(voter1.address, 10);
      await voteToken.connect(owner).transfer(voter2.address, 10);
    });

    describe("VoteToken Contract", function () {
      describe("Deployment", function () {
        it("Should set correct initial values", async function () {
          expect(await voteToken.owner()).to.equal(owner.address);
          expect(await voteToken.name()).to.equal("VoteToken");
          expect(await voteToken.symbol()).to.equal("VOTE");
          expect(await voteToken.decimals()).to.equal(18);
          expect(await voteToken.votingContract()).to.equal(await voting.getAddress());
        });

        it("Should have correct owner balance after transfers", async function () {
          const totalSupply = await voteToken.totalSupply();
          const ownerBalance = await voteToken.balanceOf(owner.address);
          expect(ownerBalance.toString()).to.equal((totalSupply - BigInt(20)).toString());
        });
      });

      describe("Token Operations", function () {
        it("Should transfer tokens between accounts", async function () {
          await voteToken.connect(owner).transfer(voter1.address, 50);
          const voter1Balance = await voteToken.balanceOf(voter1.address);
          expect(voter1Balance).to.equal(BigInt(60)); // 50 + 10 initial
        });

        it("Should fail if sender doesn't have enough tokens", async function () {
          const initialBalance = await voteToken.balanceOf(voter1.address);
          await expect(
            voteToken.connect(voter1).transfer(voter2.address, initialBalance + BigInt(1))
          ).to.be.revertedWith("Insufficient balance");
        });

        it("Should emit Transfer event", async function () {
          await expect(voteToken.connect(owner).transfer(voter1.address, 50))
            .to.emit(voteToken, "Transfer")
            .withArgs(owner.address, voter1.address, 50);
        });
      });

      describe("Access Control", function () {
        it("Should not allow setting voting contract twice", async function () {
          await expect(
            voteToken.connect(owner).setVotingContract(await voting.getAddress())
          ).to.be.revertedWith("Voting contract already set");
        });

        it("Should not allow non-owner to set voting contract", async function () {
          const newVoteToken = await (await ethers.getContractFactory("VoteToken")).deploy(1000);
          await expect(
            newVoteToken.connect(voter1).setVotingContract(await voting.getAddress())
          ).to.be.revertedWith("Only owner can call this function");
        });
      });
    });

    describe("Voting Contract", function () {
      describe("Deployment and Initialization", function () {
        it("Should set the correct owner", async function () {
          expect(await voting.owner()).to.equal(owner.address);
        });

        it("Should set correct system contracts", async function () {
          expect(await voting.systemContracts(0)).to.equal(ammContract.address);
          expect(await voting.systemContracts(1)).to.equal(supplyChainContract.address);
          expect(await voting.systemContracts(2)).to.equal(rewardContract.address);
        });

        it("Should prevent double initialization", async function () {
          await expect(voting.initialize())
            .to.be.revertedWith("Already initialized");
        });

        it("Should prevent non-owner initialization", async function () {
          const newVoting = await (await ethers.getContractFactory("Voting")).deploy(
            owner.address,
            await voteToken.getAddress(),
            ammContract.address,
            supplyChainContract.address,
            rewardContract.address
          );
          await expect(
            newVoting.connect(voter1).initialize()
          ).to.be.revertedWith("Only owner can call this function");
        });
      });

      describe("Voting Operations", function () {
        it("Should allow voting for AMM contract", async function () {
          await voting.connect(voter1).voteForAMMContract();
          expect(await voting.total_Votes_AMM()).to.equal(1);
          expect(await voteToken.balanceOf(voter1.address)).to.equal(9);
        });

        it("Should allow voting for Supply Chain contract", async function () {
          await voting.connect(voter1).voteForSupplyChainContract();
          expect(await voting.total_Votes_SupplyChain()).to.equal(1);
          expect(await voteToken.balanceOf(voter1.address)).to.equal(9);
        });

        it("Should allow voting for Reward contract", async function () {
          await voting.connect(voter1).voteForRewardContract();
          expect(await voting.total_VotesReward()).to.equal(1);
          expect(await voteToken.balanceOf(voter1.address)).to.equal(9);
        });

        it("Should prevent voting without tokens", async function () {
          const [, , , , , , nonVoter] = await ethers.getSigners();
          await expect(
            voting.connect(nonVoter).voteForAMMContract()
          ).to.be.revertedWith("Only voter can call this function");
        });

        it("Should emit VoteUsed event", async function () {
          await expect(voting.connect(voter1).voteForAMMContract())
            .to.emit(voting, "VoteUsed")
            .withArgs(voter1.address, 0, 1);
        });

        it("Should handle multiple votes until tokens are depleted", async function () {
          // Initial balance is 10 tokens
          // Should be able to vote exactly 10 times
          for (let i = 0; i < 10; i++) {
            await voting.connect(voter1).voteForAMMContract();
          }
          
          // After using all tokens, should fail with voter check
          await expect(
            voting.connect(voter1).voteForAMMContract()
          ).to.be.revertedWith("Only voter can call this function");
          
          // Verify final balance is 0
          expect(await voteToken.balanceOf(voter1.address)).to.equal(0);
          // Verify vote count is 10
          expect(await voting.total_Votes_AMM()).to.equal(10);
        });
      });

      describe("System Contract Management", function () {
        it("Should allow owner to update system contracts", async function () {
          const newAddress = await voter1.getAddress();
          await voting.connect(owner).updateSystemContracts(0, newAddress);
          expect(await voting.systemContracts(0)).to.equal(newAddress);
        });

        it("Should prevent non-owner from updating system contracts", async function () {
          await expect(
            voting.connect(voter1).updateSystemContracts(0, voter2.address)
          ).to.be.revertedWith("Only owner can call this function");
        });

        it("Should prevent updating invalid index", async function () {
          await expect(
            voting.connect(owner).updateSystemContracts(3, voter1.address)
          ).to.be.revertedWith("Invalid index");
        });

        it("Should emit ContractUpdated event", async function () {
          const newAddress = await voter1.getAddress();
          await expect(voting.connect(owner).updateSystemContracts(0, newAddress))
            .to.emit(voting, "ContractUpdated")
            .withArgs(0, newAddress);
        });
      });

      describe("Vote Thresholds and Results", function () {
        it("Should correctly determine if topic has passed threshold", async function () {
          // Give voter1 enough tokens to make 50 votes
          await voteToken.connect(owner).transfer(voter1.address, 50);
          
          // Vote 50 times
          for(let i = 0; i < 50; i++) {
            await voting.connect(voter1).voteForAMMContract();
          }
          
          expect(await voting.getTotalVotesForTopic(0)).to.equal(true);
        });

        it("Should fail checkIfALLTopicPassed if not all topics passed", async function () {
          await expect(
            voting.checkIfALLTopicPassed()
          ).to.be.revertedWith("Failed for topic 0 AMM, update a new contract address");
        });

        it("Should revert on invalid topic query", async function () {
          await expect(
            voting.getTotalVotesForTopic(5)
          ).to.be.revertedWith("Invalid topic");
        });
      });
    });
  });
});