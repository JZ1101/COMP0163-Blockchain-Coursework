const {
    loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const { expect } = require("chai");

describe("CarbonCredit", function () {
    // Fixture to deploy the CarbonCredit contract
    async function deployCarbonCreditFixture() {
        const totalSupply = 1_000_000; // Set total supply for the CarbonCredit token
        const timeFrame = 1000; // Example time frame for the CarbonCredit token

        const [owner, otherAccount] = await ethers.getSigners();

        // Deploy the CarbonCredit contract
        const CarbonCredit = await ethers.getContractFactory("CarbonCredit");
        const carbonCredit = await CarbonCredit.deploy(totalSupply, timeFrame);

        return { carbonCredit, totalSupply, owner, otherAccount };
    }

    describe("balanceOf", function () {
        it("should return the total supply for the owner", async function () {
            const { carbonCredit, totalSupply, owner } = await loadFixture(deployCarbonCreditFixture);
            // Check that the owner's balance is equal to the total supply
            expect(await carbonCredit.balanceOf(owner.address)).to.equal(totalSupply);
        });

        it("should return 0 for otherAccount", async function () {
            const { carbonCredit, otherAccount } = await loadFixture(deployCarbonCreditFixture);
            // Check that the otherAccount's balance is 0
            expect(await carbonCredit.balanceOf(otherAccount.address)).to.equal(0);
        });
    });
});