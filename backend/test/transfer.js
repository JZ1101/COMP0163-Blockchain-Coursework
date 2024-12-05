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

    describe("transfer", function () {
        it("should revert if sender has insufficient balance", async function () {
            const { carbonCredit, otherAccount } = await loadFixture(deployCarbonCreditFixture);
            // Attempt to transfer 1 token from an account with 0 balance
            await expect(
                carbonCredit.connect(otherAccount).transfer(otherAccount.address, 1)
            ).to.be.revertedWith("you need to have high balance");
        });

        describe("on success", function () {
            it("should transfer tokens", async function () {
                const { carbonCredit, owner, otherAccount } = await loadFixture(deployCarbonCreditFixture);
                const amount = 1;

                // Transfer tokens from the owner to otherAccount
                await carbonCredit.connect(owner).transfer(otherAccount.address, amount);

                // Verify the balances after transfer
                expect(await carbonCredit.balanceOf(owner.address)).to.equal(999_999);
                expect(await carbonCredit.balanceOf(otherAccount.address)).to.equal(amount);
            });

            it("should emit Transfer event", async function () {
                const { carbonCredit, owner, otherAccount } = await loadFixture(deployCarbonCreditFixture);
                const amount = 1;

                // Expect the Transfer event to be emitted with the correct arguments
                await expect(
                    carbonCredit.connect(owner).transfer(otherAccount.address, amount)
                )
                    .to.emit(carbonCredit, "Transfer")
                    .withArgs(owner.address, otherAccount.address, amount);
            });
        });
    });
});