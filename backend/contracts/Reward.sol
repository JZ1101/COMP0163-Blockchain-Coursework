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

    constructor(address _rewardToken) {
        rewardToken = IERC20(_rewardToken);
    }
    /**
     * flow chart
     * 1. check if the factory is valid
     * 2. check if the factory is eco-friendly
     * 3. calculate the reward
     * 4. transfer the reward to the factory
    
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

    function claimReward(address _factory, uint256[] memory yearlyUsageData, uint256 rewardClaimCounter) public ecoFriendly(yearlyUsageData,rewardClaimCounter) returns (bool) {
        creditManager = ICreditManager(_factory);
        creditManager.updateRewardClaimCounter();
        uint256 rewardAmount = calculateReward();
        require(rewardToken.transfer(_factory, rewardAmount),"Transfer failed");
        return true;
    }

    function calculateReward() internal pure returns (uint256) {
        // simple method
        return 100 * 10**18; // 100 tokens
    }
}