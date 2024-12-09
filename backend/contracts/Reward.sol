pragma solidity ^0.8.28;

import "./IERC20.sol";
/*
@title Reward contract
This contract is to reward the factory for being eco-friendly
*/
contract Reward{
    modifier ecoFriendly(address _factory){
        // if usage shows a decrease in carbon emission
        _;
    }
    giveReward(address _factory) public ecoFriendly(_factory){
        // give reward to factory
    }
}