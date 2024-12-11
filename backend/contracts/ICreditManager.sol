// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

//Interface for the CreditManager contract
interface ICreditManager {
    function rewardClaimTime() external view returns (uint256);
    function updateRewardClaimCounter() external;
    function yearlyUsageData(address _factory) external view returns (uint256);   
}