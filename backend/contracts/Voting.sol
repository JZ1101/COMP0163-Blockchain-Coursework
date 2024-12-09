// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./VoteToken.sol";
import "./IERC20.sol";

contract Voting {
    address public owner;
    address[] public voters;
    uint256 public total_VotesReward;
    uint256 public total_Votes_AMM;
    uint256 public total_Votes_SupplyChain;

    mapping(address => uint256) public voteBalance;
    mapping(address => bool) public voterList;
    IERC20 public voteToken;

    event voteUsed(address indexed voter, address indexed recipient, uint256 vote);
    event TokenDeployed(address indexed tokenAddress);
    event VotingContractDeployed(address indexed votingContractAddress);

    struct VotingResult {
        uint8 topic;
        bool hasPassed;
    }

    constructor(address _owner, address _tokenAddress) {
        owner = _owner == address(0) ? msg.sender : _owner;
        require(_tokenAddress != address(0), "Invalid token address");
        voteToken = IERC20(_tokenAddress);
    }

    modifier isOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier isVoter() {
        require(voterList[msg.sender], "Only voter can call this function");
        _;
    }

    function deployVoteToken(uint256 initialSupply) external returns (address) {
        VoteToken newVoteToken = new VoteToken(initialSupply);
        emit TokenDeployed(address(newVoteToken));
        return address(newVoteToken);
    }

    function changeOwner(address _owner) public isOwner {
        owner = _owner;
    }

    function addVoter(address _voter) public isOwner {
        require(_voter != address(0), "Invalid address");
        voters.push(_voter);
        voterList[_voter] = true;
    }

    function removeVoter(address _voter) public isOwner {
        require(_voter != address(0), "Invalid address");
        // Reset approval that the voter gave to this contract
        VoteToken(address(voteToken)).approve(address(this), 0); 
        for (uint256 i = 0; i < voters.length; i++) {
            if (voters[i] == _voter) {
                voters[i] = voters[voters.length - 1];
                voters.pop();
                break;
            }
        }
        voterList[_voter] = false;
    }

    function voteForAMMContract(uint256 _votes) public isVoter {
        require(_votes > 0, "Invalid votes");
        voteToken.transferFrom(msg.sender, address(this), _votes);
        total_Votes_AMM += _votes;
        voteBalance[msg.sender] += _votes;
        emit voteUsed(msg.sender, address(this), _votes);  // Add this
    }

    function voteForSupplyChainContract(uint256 _votes) public isVoter {
        require(_votes > 0, "Invalid votes");
        voteToken.transferFrom(msg.sender, address(this), _votes);
        total_Votes_SupplyChain += _votes;
        voteBalance[msg.sender] += _votes;
        emit voteUsed(msg.sender, address(this), _votes);  // Add this
    }

    function voteForRewardContract(uint256 _votes) public isVoter {
        require(_votes > 0, "Invalid votes");
        voteToken.transferFrom(msg.sender, address(this), _votes);
        total_VotesReward += _votes;
        voteBalance[msg.sender] += _votes;
        emit voteUsed(msg.sender, address(this), _votes);  // Add this
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
    
    function checkIfTopicPassed(address votingContract, uint8 topic) external view returns (VotingResult memory) {
        require(votingContract != address(0), "Invalid voting contract address");
        require(topic <= 2, "Invalid topic ID");
        Voting voting = Voting(votingContract);
        bool result = voting.getTotalVotesForTopic(topic);
        return VotingResult({ topic: topic, hasPassed: result });
    }
}