// Hardhat test script for Voting.sol
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Voting Contract", function () {
    let VoteToken, voteToken, Voting, voting;
    let owner, addr1, addr2;

    beforeEach(async function () {
        // Get contract factories
        VoteToken = await ethers.getContractFactory("VoteToken");
        Voting = await ethers.getContractFactory("Voting");

        // Get signers
        [owner, addr1, addr2] = await ethers.getSigners();

        // Deploy VoteToken with initial supply
        voteToken = await VoteToken.deploy(100);
        await voteToken.deployed(); // Ensure the contract is deployed

        // Ensure deployment of VoteToken
        if (!voteToken.address) {
            throw new Error("VoteToken contract not deployed successfully");
        }

        // Deploy Voting contract
        voting = await Voting.deploy(
            owner.address,
            voteToken.address,
            addr1.address, // Mock address for AMM contract
            addr2.address, // Mock address for SupplyChain contract
            owner.address  // Mock address for Reward contract
        );
        await voting.deployed();
        console.log("VoteToken deployed to:", voteToken.address);

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

        // Vote on AMM topic
        await voting.connect(addr1).voteForAMMContract();

        // Check the vote count
        const totalVotesAMM = await voting.total_Votes_AMM();
        expect(totalVotesAMM).to.equal(1);

        // Check the event
        await expect(voting.connect(addr1).voteForAMMContract())
            .to.emit(voting, "voteUsed")
            .withArgs(addr1.address, 0, 1);
    });

    it("Should not allow voting without sufficient tokens", async function () {
        // Attempt to vote without tokens
        await expect(voting.connect(addr1).voteForAMMContract())
            .to.be.revertedWith("Insufficient balance");
    });

    it("Should distribute rewards correctly", async function () {
        // Mint tokens and vote
        await voteToken.mint(addr1.address, ethers.utils.parseEther("10"));
        await voteToken.connect(addr1).approve(voting.address, ethers.utils.parseEther("5"));
        await voting.connect(addr1).voteForAMMContract();

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
