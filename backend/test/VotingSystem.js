// Hardhat test script for Voting.sol
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Voting Contract", function () {
    let VoteToken, voteToken, Voting, voting;
    let owner, addr1, addr2;
    let ammContract, supplyChainContract, rewardContract;

    beforeEach(async function () {
        // Get contract factories
        VoteToken = await ethers.getContractFactory("VoteToken");
        Voting = await ethers.getContractFactory("Voting");

        // Get signers
        [owner, addr1, addr2] = await ethers.getSigners();

        // Mock system contract addresses
        ammContract = addr1;
        supplyChainContract = addr2;
        rewardContract = owner; // Using owner as a mock address for testing

        // Deploy VoteToken and Voting contracts
        voteToken = await VoteToken.deploy();
        await voteToken.deployed();

        voting = await Voting.deploy(
            owner.address,
            voteToken.address,
            ammContract.address,
            supplyChainContract.address,
            rewardContract.address
        );
        await voting.deployed();

        // Set the voting contract in VoteToken
        await voteToken.setVotingContract(voting.address);
    });

    it("Should initialize contracts correctly", async function () {
        expect(await voteToken.name()).to.equal("VoteToken");
        expect(await voteToken.symbol()).to.equal("VOTE");
        expect(await voting.owner()).to.equal(owner.address);
    });

    it("Should allow users to vote on topics", async function () {
        // Mint tokens to addr1 and approve the voting contract
        await voteToken.mint(addr1.address, ethers.utils.parseEther("10"));
        await voteToken.connect(addr1).approve(voting.address, ethers.utils.parseEther("5"));

        // Vote on a topic
        await voting.connect(addr1).vote(0, ethers.utils.parseEther("5"));

        // Check the vote count
        const totalVotesAMM = await voting.total_Votes_AMM();
        expect(totalVotesAMM).to.equal(ethers.utils.parseEther("5"));

        // Check the event
        await expect(voting.connect(addr1).vote(0, ethers.utils.parseEther("5")))
            .to.emit(voting, "voteUsed")
            .withArgs(addr1.address, 0, ethers.utils.parseEther("5"));
    });

    it("Should allow users to vote for AMM contract", async function () {
        await voteToken.mint(addr1.address, ethers.utils.parseEther("10"));
        await voteToken.connect(addr1).approve(voting.address, ethers.utils.parseEther("1"));
        await voting.connect(addr1).voteForAMMContract();
        const totalVotesAMM = await voting.total_Votes_AMM();
        expect(totalVotesAMM).to.equal(1);
    });

    it("Should allow users to vote for Supply Chain contract", async function () {
        await voteToken.mint(addr1.address, ethers.utils.parseEther("10"));
        await voteToken.connect(addr1).approve(voting.address, ethers.utils.parseEther("1"));
        await voting.connect(addr1).voteForSupplyChainContract();
        const totalVotesSupplyChain = await voting.total_Votes_SupplyChain();
        expect(totalVotesSupplyChain).to.equal(1);
    });

    it("Should allow users to vote for Reward contract", async function () {
        await voteToken.mint(addr1.address, ethers.utils.parseEther("10"));
        await voteToken.connect(addr1).approve(voting.address, ethers.utils.parseEther("1"));
        await voting.connect(addr1).voteForRewardContract();
        const totalVotesReward = await voting.total_VotesReward();
        expect(totalVotesReward).to.equal(1);
    });

    it("Should update system contracts", async function () {
        await voting.updateSystemContracts(0, addr2.address);
        const updatedContract = await voting.systemContracts(0);
        expect(updatedContract).to.equal(addr2.address);
    });

    it("Should change owner", async function () {
        await voting.changeOwner(addr1.address);
        const newOwner = await voting.owner();
        expect(newOwner).to.equal(addr1.address);
    });

    it("Should not allow non-owner to update system contracts", async function () {
        await expect(voting.connect(addr1).updateSystemContracts(0, addr2.address))
            .to.be.revertedWith("Only owner can call this function");
    });

    it("Should not allow non-owner to change owner", async function () {
        await expect(voting.connect(addr1).changeOwner(addr2.address))
            .to.be.revertedWith("Only owner can call this function");
    });

    it("Should not allow voting without sufficient tokens", async function () {
        // Attempt to vote without tokens
        await expect(voting.connect(addr1).vote(0, ethers.utils.parseEther("5")))
            .to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("Should distribute rewards correctly", async function () {
        // Mint tokens and vote
        await voteToken.mint(addr1.address, ethers.utils.parseEther("10"));
        await voteToken.connect(addr1).approve(voting.address, ethers.utils.parseEther("5"));
        await voting.connect(addr1).vote(0, ethers.utils.parseEther("5"));

        // Distribute rewards
        await voting.distributeRewards([addr1.address], ethers.utils.parseEther("2"));

        // Check balances
        const balance = await voteToken.balanceOf(addr1.address);
        expect(balance).to.equal(ethers.utils.parseEther("7"));

        // Check the event
        await expect(voting.distributeRewards([addr1.address], ethers.utils.parseEther("2")))
            .to.emit(voting, "TokenRewarded")
            .withArgs(addr1.address, ethers.utils.parseEther("2"));
    });

    it("Should not allow non-owner to distribute rewards", async function () {
        // Attempt to distribute rewards as a non-owner
        await expect(voting.connect(addr1).distributeRewards([addr1.address], ethers.utils.parseEther("2")))
            .to.be.revertedWith("Ownable: caller is not the owner");
    });
});
