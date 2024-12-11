// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./IERC20.sol";
import "./ICreditManager.sol";

/**
 * @title Reward contract
 * @notice 
 * This contract is to reward the Company/Factory (holding credit manager contract) for being eco-friendly
 * flow chart
 * 1. check if the factory is valid
 * 2. check if the factory is eco-friendly
 * 3. calculate the reward
 * 4. transfer the reward to the factory
 */
contract Reward {
    IERC20 public rewardToken;
    ICreditManager public creditManager;

    constructor(address _rewardToken) {
        rewardToken = IERC20(_rewardToken);
    }

    /**
     * @dev Modifier to check if the factory is eco-friendly
     * @param yearlyUsageData The usage data of the factory
     * @param rewardClaimCounter The reward claim counter, incremented by the credit manager after each reward claim, to prevent double claiming
     */
    modifier ecoFriendly(uint256[] memory yearlyUsageData,uint256 rewardClaimCounter) {
        require(yearlyUsageData.length >= 2+rewardClaimCounter, "Not enough data");
        uint256 lastIndex = yearlyUsageData.length - 1;
        require(yearlyUsageData[lastIndex] < yearlyUsageData[lastIndex - 1], "No decrease in usage");
        _;
    }

    /**
     * @dev Function to claim the reward
     * @param _factory The address of the factory
     * @param yearlyUsageData The usage data of the factory
     * @param rewardClaimCounter The reward claim counter, incremented by the credit manager after each reward claim, to prevent double claiming
     */
    function claimReward(address _factory, uint256[] memory yearlyUsageData, uint256 rewardClaimCounter) public ecoFriendly(yearlyUsageData,rewardClaimCounter) returns (bool) {
        creditManager = ICreditManager(_factory); // check if the factory is valid
        creditManager.updateRewardClaimCounter();
        uint256 rewardAmount = calculateReward();
        require(rewardToken.transfer(_factory, rewardAmount),"Transfer failed");
        return true;
    }

    /**
     * @dev Function to calculate the reward
     * currently a simple method, can be updated to a more complex method in the future
     * for example, based on the usage data of the factory and the reward claim counter
     * also decreasing in percentage based on the number of times the reward is claimed
     * @return The reward amount
     */
    function calculateReward() internal pure returns (uint256) {
        // simple method
        return 100 * 10**18; // 100 tokens
    }
}