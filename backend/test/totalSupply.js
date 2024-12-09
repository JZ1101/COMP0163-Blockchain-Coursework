const {
    loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const { expect } = require("chai");

describe("CarbonCredit", function () {
    // Fixture to deploy the CarbonCredit contract
    async function deployCarbonCreditFixture() {
        const totalSupply = 1_000_000; // Set total supply for CarbonCredit
        const timeFrame = 1000; // Example time frame for the CarbonCredit contract

        const [owner, otherAccount] = await ethers.getSigners();

        // Deploy the CarbonCredit contract
        const CarbonCredit = await ethers.getContractFactory("CarbonCredit");
        const carbonCredit = await CarbonCredit.deploy(totalSupply, timeFrame);

        return { carbonCredit, totalSupply, owner, otherAccount };
    }

    describe("totalSupply", function () {
        it("should return 1 million", async function () {
            const { carbonCredit, totalSupply } = await loadFixture(deployCarbonCreditFixture);
            // Check that the totalSupply function returns the correct value
            expect(await carbonCredit.totalSupply()).to.equal(totalSupply);
        });
    });
});