// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IVoteToken {
    function balanceOf(address account) external view returns (uint256);
    function removeTokens(address wallet,uint256 amount) external;
}