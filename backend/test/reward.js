const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("Reward Contract with CarbonCredit Token", function () {
    async function deployRewardFixture() {
        const [owner, factory] = await ethers.getSigners();

        // Deploy CarbonCredit token (CCT)
        const CarbonCredit = await ethers.getContractFactory("CarbonCredit");
        const carbonCredit = await CarbonCredit.deploy(
            ethers.parseEther("1000000"), // Total supply
            365 // Time frame
        );
        await carbonCredit.waitForDeployment();

        // Deploy Reward contract
        const Reward = await ethers.getContractFactory("Reward");
        const reward = await Reward.deploy(carbonCredit.target);
        await reward.waitForDeployment();

        // Deploy CreditManager contract
        const CreditManager = await ethers.getContractFactory("CreditManager");
        const creditManager = await CreditManager.deploy(
            owner.address,               // Owner address
            carbonCredit.target,         // Carbon Credit Token (CCT) address
            reward.target                // Reward contract address
        );
        await creditManager.waitForDeployment();

        return { reward, carbonCredit, creditManager, owner, factory };
    }

    describe("Deployment", function () {
        it("should set the reward token correctly", async function () {
            const { reward, carbonCredit } = await loadFixture(deployRewardFixture);
            expect(await reward.rewardToken()).to.equal(carbonCredit.target);
        });
    });

    describe("Reward Claims", function () {
        it("should revert if usage has not decreased", async function () {
            const { reward, carbonCredit, creditManager } = await loadFixture(deployRewardFixture);

            const yearlyUsageData = [800, 1000]; // Usage increased
            const rewardClaimCounter = 0;

            // Transfer CarbonCredit tokens to Reward contract
            await carbonCredit.transfer(reward.target, ethers.parseEther("1000"));

            // Attempt to claim rewards; should revert
            await expect(
                reward.claimReward(creditManager.target, yearlyUsageData, rewardClaimCounter)
            ).to.be.revertedWith("No decrease in usage");
        });

        it("should revert if not enough data is provided", async function () {
            const { reward, carbonCredit, creditManager } = await loadFixture(deployRewardFixture);

            const yearlyUsageData = [1000]; // Insufficient data
            const rewardClaimCounter = 0;

            // Transfer CarbonCredit tokens to Reward contract
            await carbonCredit.transfer(reward.target, ethers.parseEther("1000"));

            // Attempt to claim rewards; should revert
            await expect(
                reward.claimReward(creditManager.target, yearlyUsageData, rewardClaimCounter)
            ).to.be.revertedWith("Not enough data");
        });
    });

    describe("Balances", function () {
        it("should update the reward balance correctly after a claim", async function () {
            const { reward, carbonCredit, creditManager } = await loadFixture(deployRewardFixture);

            const yearlyUsageData = [1000, 800]; // Valid decreasing data
            const rewardClaimCounter = 0;

            // Transfer CarbonCredit tokens to Reward contract
            await carbonCredit.transfer(reward.target, ethers.parseEther("1000"));

            // Claim reward
            await reward.claimReward(creditManager.target, yearlyUsageData, rewardClaimCounter);

            // Verify balances
            const balanceInReward = await carbonCredit.balanceOf(reward.target);
            expect(balanceInReward).to.equal(ethers.parseEther("900")); // Reward contract retains balance

            const balanceInCreditManager = await carbonCredit.balanceOf(creditManager.target);
            expect(balanceInCreditManager).to.equal(ethers.parseEther("100")); // 100 tokens transferred as reward
        });
    });

    describe("Integration with CreditManager", function () {
        it("should allow CreditManager to tryClaimReward", async function () {
            const { reward, carbonCredit, creditManager } = await loadFixture(deployRewardFixture);

            // Step 1: Transfer tokens to Reward contract
            await carbonCredit.transfer(reward.target, ethers.parseEther("1000"));

            // Step 2: Simulate yearly usage data
            const yearlyUsageData = [];
            const rewardClaimCounter = 0;

            // Simulate Year 1 usage
            const oneYear = 365 * 24 * 60 * 60; // Seconds in one year
            await network.provider.send("evm_increaseTime", [oneYear]);
            await network.provider.send("evm_mine");
            yearlyUsageData.push(1000); // Add Year 1 usage

            // Simulate Year 2 usage
            await network.provider.send("evm_increaseTime", [oneYear]);
            await network.provider.send("evm_mine");
            yearlyUsageData.push(800); // Add Year 2 usage

            // Call tryClaimReward with simulated data
            await reward.claimReward(creditManager.target, yearlyUsageData, rewardClaimCounter);

            // Verify balances
            const balanceInReward = await carbonCredit.balanceOf(reward.target);
            const balanceInCreditManager = await carbonCredit.balanceOf(creditManager.target);

            expect(balanceInReward).to.equal(ethers.parseEther("900")); // Remaining balance in Reward
            expect(balanceInCreditManager).to.equal(ethers.parseEther("100")); // Reward transferred to CreditManager
        });
    });
});
