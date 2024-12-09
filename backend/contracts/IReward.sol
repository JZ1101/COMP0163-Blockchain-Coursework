// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IReward {
    function claimReward(address _factory,uint256[] memory yearlyUsageData,uint256 rewardClaimCounter) external;
}