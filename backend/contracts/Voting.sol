// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./IVoteToken.sol"; 
import "./IERC20.sol";

contract Voting {
    address public owner;
    // topic 0 AMM
    // topic 1 SupplyChain
    // topic 2 Reward
    uint256 public total_VotesReward;
    uint256 public total_Votes_AMM;
    uint256 public total_Votes_SupplyChain;
    address [] public systemContracts;

    IVoteToken public voteToken;

    event voteUsed(address indexed voter, uint256 topic, uint256 vote);
    event TokenDeployed(address indexed tokenAddress);
    event ContractUpdated(uint256 topic, address indexed contractAddress);
    struct VotingResult {
        uint8 topic;
        bool hasPassed;
    }

    constructor(address _owner, address _tokenAddress, address _ammContract, address _supplyChainContract, address _rewardContract) {
        owner = _owner == address(0) ? msg.sender : _owner;
        require(_tokenAddress != address(0), "Invalid token address");
        voteToken = IVoteToken(_tokenAddress);
        systemContracts.push(_ammContract);
        systemContracts.push(_supplyChainContract);
        systemContracts.push(_rewardContract);
    }

    modifier isOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier isVoter() {
        require(voteToken.balanceOf(msg.sender)>0, "Only voter can call this function");
        _;
    }


    function changeOwner(address _owner) public isOwner {
        owner = _owner;
    }

    function updateSystemContracts(uint8 index, address _contract) public isOwner {
        require(index <= 2, "Invalid index");
        systemContracts[index] = _contract;
        emit ContractUpdated(index, _contract);
    }


    function voteForAMMContract() public isVoter {
        voteToken.removeTokens(msg.sender, 1);
        total_Votes_AMM++;
        emit voteUsed(msg.sender, 0, 1);
    }

    function voteForSupplyChainContract() public isVoter {
        voteToken.removeTokens(msg.sender, 1);
        total_Votes_AMM++;
        emit voteUsed(msg.sender, 1, 1); 
    }
    function voteForRewardContract() public isVoter {
        voteToken.removeTokens(msg.sender, 1);
        total_Votes_AMM++;
        emit voteUsed(msg.sender, 2, 1);  // Add this
    }

    function getTotalVotesForTopic(uint8 topic) public view returns (bool) {
        if (topic==0) {
            return total_Votes_AMM>=50;
        } else if (topic==1) {
            return total_Votes_SupplyChain>=50;
        } else if (topic==2) {
            return total_VotesReward>=50;
        } else {
            revert("Invalid topic");
        }
    }
    
    function checkIfALLTopicPassed() external view returns (VotingResult memory) {
        require(getTotalVotesForTopic(0), "Failed for topic o AMM, update a new contract address");
        require(getTotalVotesForTopic(1), "Failed for topic o AMM, update a new contract address");
        require(getTotalVotesForTopic(2), "Failed for topic o AMM, update a new contract address");
        return VotingResult({topic: 3, hasPassed: true});
    }
}