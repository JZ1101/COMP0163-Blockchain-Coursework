// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./IERC20.sol";

contract Exchange {
    // contract for allowing companies exchange carbon credits in a fixed ratio
    IERC20 public token1;// Carbon credit token
    IERC20 public token2;// Demand token, can be stable coin or any other token
    address public owner;
    // for limit order

    struct LimitOrder {
        address user;
        uint256 amount;
        uint256 price;
        bool isBuy; // True for buy orders, false for sell orders
    }

    constructor(address _token1, address _token2) {
        token1 = IERC20(_token1);
        token2 = IERC20(_token2);
        owner = msg.sender;
    }

    function limitOrder(uint256 _amount, uint256 _price, bool _isBuy) public {
        // create a limit order

    }
    
    function cancelOrder() public {
        // cancel a limit order
    }

    function fillOrder() public {
        // fill a limit order
    }

    function swap(uint256 _amount) public {
        // swap tokens
    }

    function changeOwner(address _owner) public {
        // change owner
    }

    function addLiquidity(uint256 _amount1, uint256 _amount2) public {
        // add liquidity
    }

    function removeLiquidity(uint256 _amount) public {
        // remove liquidity
    }

    function leverage(uint256 _amount) public {
        // leverage
    }







}