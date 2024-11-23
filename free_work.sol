// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.28;

contract FreelanceJobMarket {
    address public owner;
    uint256 public totalContractFee;
    address[] public bidders;
    mapping(address => uint256) public bidPrices;
    mapping(address => uint256) public scores;
    mapping(address => uint) public negotiationCount;

    uint256 constant MAX_BIDDERS = 3;
    uint256 constant MAX_NEGOTIATIONS = 3;

    enum Phase { Bidding, Phase1, Phase2, Phase3, Complete }
    Phase public currentPhase;

    constructor(uint256 _fee) {
        owner = msg.sender;
        totalContractFee = _fee;
        currentPhase = Phase.Bidding;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function.");
        _;
    }

    // Bid for the contract
    function bidForContract() public {
        require(currentPhase == Phase.Bidding, "Not in bidding phase.");
        require(bidders.length < MAX_BIDDERS, "Max bidders reached.");
        bidders.push(msg.sender);
        bidPrices[msg.sender] = totalContractFee; // Initial bid is the total contract fee
    }

    // Negotiate the price
    function negotiatePrice(uint256 newPrice) public {
        require(currentPhase == Phase.Bidding, "Not in bidding phase.");
        require(negotiationCount[msg.sender] < MAX_NEGOTIATIONS, "Max negotiations reached.");
        bidPrices[msg.sender] = newPrice;
        negotiationCount[msg.sender]++;
    }

    // Accept the final prices and move to Phase 1
    function finalizeBidding() public onlyOwner {
        require(bidders.length == MAX_BIDDERS, "Not enough bidders.");
        currentPhase = Phase.Phase1;
    }

    // Owner scores the bidders after Phase 1
    function scorePhase1(address bidder, uint256 score) public onlyOwner {
        require(currentPhase == Phase.Phase1, "Not in Phase 1.");
        scores[bidder] = score;
    }

    // Move to Phase 2, distribute rewards for Phase 1
    function finalizePhase1() public onlyOwner {
        require(currentPhase == Phase.Phase1, "Not in Phase 1.");
        distributeRewards(20, 70, 20, 10); // 20% of total fee distributed
        currentPhase = Phase.Phase2;
    }

    // Owner scores the bidders after Phase 2
    function scorePhase2(address bidder, uint256 score) public onlyOwner {
        require(currentPhase == Phase.Phase2, "Not in Phase 2.");
        scores[bidder] = score;
    }

    // Finalize Phase 2, distribute rewards
    function finalizePhase2() public onlyOwner {
        require(currentPhase == Phase.Phase2, "Not in Phase 2.");
        distributeRewards(30, 80, 20, 0); // 30% of total fee distributed
        currentPhase = Phase.Phase3;
    }

    // Finalize the project and distribute the remaining 50%
    function finalizeProject() public onlyOwner {
        require(currentPhase == Phase.Phase3, "Not in Phase 3.");
        distributeRewards(50, 100, 0, 0); // 50% of total fee to the winner
        currentPhase = Phase.Complete;
    }

    // Helper function to distribute rewards based on phase completion
    function distributeRewards(uint256 percentage, uint256 firstPlace, uint256 secondPlace, uint256 thirdPlace) internal {
        uint256 totalPhaseFee = totalContractFee * percentage / 100;
        payable(bidders[0]).transfer(totalPhaseFee * firstPlace / 100); // First place
        payable(bidders[1]).transfer(totalPhaseFee * secondPlace / 100); // Second place
        if (thirdPlace > 0) {
            payable(bidders[2]).transfer(totalPhaseFee * thirdPlace / 100); // Third place
        }
    }
}
