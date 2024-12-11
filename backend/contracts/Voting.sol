// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./IVoteToken.sol";
/**
 * @title Voting contract
 * @notice 
 * This contract is to vote for the system contracts AMM, SupplyChain, Reward
 * Owner can initialize the contract and reset the votes
 * Voters can vote for the system contracts
 * Voting continues until 50 votes are reached for each contract
 */

contract Voting {
    address public owner;
    uint256 public total_VotesReward;
    uint256 public total_Votes_AMM;
    uint256 public total_Votes_SupplyChain;
    address[] public systemContracts;
    bool public initialized;

    IVoteToken public voteToken;

    event VotingInitialized(address indexed tokenAddress);
    event VoteUsed(address indexed voter, uint256 topic, uint256 vote);
    event ContractUpdated(uint256 topic, address indexed contractAddress);
    
    /* VotingResult struct to return the result of the voting */
    struct VotingResult {
        uint8 topic;
        bool hasPassed;
    }
    /** 
     * @dev Constructor to initialize the Voting contract
     * @param _owner The owner of the contract
     * @param _tokenAddress The address of the VoteToken contract
     * @param _ammContract The address of the AMM contract
     * @param _supplyChainContract The address of the SupplyChain contract
     * @param _rewardContract The address of the Reward contract
     */
    constructor(
        address _owner,
        address _tokenAddress,
        address _ammContract,
        address _supplyChainContract,
        address _rewardContract
    ) {
        owner = _owner == address(0) ? msg.sender : _owner;
        require(_tokenAddress != address(0), "Invalid token address");
        voteToken = IVoteToken(_tokenAddress);
        systemContracts.push(_ammContract);
        systemContracts.push(_supplyChainContract);
        systemContracts.push(_rewardContract);
    }

    /**
     * @dev Modifier to check if the caller is the owner
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    /**
     * @dev Modifier to check if the caller is a voter
     */
    modifier isVoter() {
        require(voteToken.balanceOf(msg.sender) > 0, "Only voter can call this function");
        _;
    }
    /**
     * @dev Function to initialize the Voting contract
     * for test purpose
     */
    function initialize() external onlyOwner {
        require(!initialized, "Already initialized");
        initialized = true;
        emit VotingInitialized(address(voteToken));
    }

    /**
     * @dev Function to vote for the AMM contract
     */
    function voteForAMMContract() public isVoter {
        voteToken.removeTokens(msg.sender, 1);
        total_Votes_AMM++;
        emit VoteUsed(msg.sender, 0, 1);
    }

    /**
     * @dev Function to vote for the SupplyChain contract
     */
    function voteForSupplyChainContract() public isVoter {
        voteToken.removeTokens(msg.sender, 1);
        total_Votes_SupplyChain++;  // Fixed: was incrementing AMM
        emit VoteUsed(msg.sender, 1, 1);
    }

    /**
     * @dev Function to vote for the Reward contract
     */
    function voteForRewardContract() public isVoter {
        voteToken.removeTokens(msg.sender, 1);
        total_VotesReward++;  // Fixed: was incrementing AMM
        emit VoteUsed(msg.sender, 2, 1);
    }

    /**
     * @dev Function to update the system contracts
     * @param index The index of the contract to update
     * @param _contract The address of the new contract
     */
    function updateSystemContracts(uint8 index, address _contract) public onlyOwner {
        require(index <= 2, "Invalid index");
        systemContracts[index] = _contract;
        emit ContractUpdated(index, _contract);
    }

    /**
     * @dev Function to get the system contracts, AMM, SupplyChain, Reward
     */
    function getTotalVotesForTopic(uint8 topic) public view returns (bool) {
        if (topic == 0) {
            return total_Votes_AMM >= 50;
        } else if (topic == 1) {
            return total_Votes_SupplyChain >= 50;
        } else if (topic == 2) {
            return total_VotesReward >= 50;
        } else {
            revert("Invalid topic");
        }
    }
    
    /**
     * @dev Function to check if all topics have passed
     * @return VotingResult The result of the voting
     */
    function checkIfALLTopicPassed() external view returns (VotingResult memory) {
        require(getTotalVotesForTopic(0), "Failed for topic 0 AMM, update a new contract address");
        require(getTotalVotesForTopic(1), "Failed for topic 1 Supply Chain, update a new contract address");
        require(getTotalVotesForTopic(2), "Failed for topic 2 Reward, update a new contract address");
        return VotingResult({topic: 3, hasPassed: true});
    }

    /**
     * @dev Function to reset the votes
     */
    function resetVotes() external onlyOwner {
        total_Votes_AMM = 0;
        total_Votes_SupplyChain = 0;
        total_VotesReward = 0;
    }
}