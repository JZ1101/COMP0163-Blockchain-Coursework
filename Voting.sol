// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.28;

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
        voteToken.approve(_voter, 0);
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
    }

    function voteForSupplyChainContract(uint256 _votes) public isVoter {
        require(_votes > 0, "Invalid votes");
        voteToken.transferFrom(msg.sender, address(this), _votes);
        total_Votes_SupplyChain += _votes;
        voteBalance[msg.sender] += _votes;
    }

    function voteForRewardContract(uint256 _votes) public isVoter {
        require(_votes > 0, "Invalid votes");
        voteToken.transferFrom(msg.sender, address(this), _votes);
        total_VotesReward += _votes;
        voteBalance[msg.sender] += _votes;
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
}