// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./IERC20.sol";
import "./ICreditManager.sol";
/*
@title Reward contract
This contract is to reward the factory for being eco-friendly
*/
contract Reward {
    IERC20 public rewardToken;
    ICreditManager public creditManager;

    // set time for evaluate period
    uint256 public evaluatePeriod = 365 days;
    uint256 public startTime = block.timestamp;
    uint256 public evaluateCounter = 0;
    
    mapping(address => uint256) public balances;
    
    mapping(address => uint256) public YearUsage;

    constructor(address _rewardToken) {
        rewardToken = IERC20(_rewardToken);
    }
    /**
     * flow chart
     * 1. record usage
     * 2. calculate yearly usage
     * 3. Check if the factory is eco-friendly
     * 4. Check if the reward can be claimed
     * 5. update claim time, and traking index
     * 6. calculate reward
     * 7. transfer reward
    
     */
    modifier isValidFactory(address _factory) {
        // check if the factory is valid
        // holding a specific token and has a valid credit manager
        _;
    }
    modifier ecoFriendly(uint256[] memory yearlyUsageData,uint256 rewardClaimCounter) {
        require(yearlyUsageData.length >= 2+rewardClaimCounter, "Not enough data");
        uint256 lastIndex = yearlyUsageData.length - 1;
        require(yearlyUsageData[lastIndex] < yearlyUsageData[lastIndex - 1], "No decrease in usage");
        _;
    }

    function claimReward(address _factory, uint256[] memory yearlyUsageData, uint256 rewardClaimCounter) public ecoFriendly(yearlyUsageData,rewardClaimCounter) {
        creditManager = ICreditManager(_factory);
        creditManager.updateRewardClaimCounter();
        uint256 rewardAmount = calculateReward(_factory);
        balances[_factory] += rewardAmount;
        rewardToken.transfer(_factory, rewardAmount);

    }

    function calculateReward(address _factory) internal view returns (uint256) {
        // simple method
        return 100 * 10**18; // 100 tokens
    }
}