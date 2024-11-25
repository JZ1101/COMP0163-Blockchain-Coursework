// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./IERC20.sol";

contract Exchange {
    // contract for allowing companies exchange carbon credits in a fixed ratio
    IERC20 public token1;// Carbon credit token
    IERC20 public token2;// Demand token, can be stable coin or any other token

}