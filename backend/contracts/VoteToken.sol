// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.28;

contract VoteToken {
    address public owner;
    address public votingContract;
    string public name = "VoteToken";
    string public symbol = "VOTE";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    event Transfer(address indexed _from, address indexed _to, uint256 _value);
    event RemoveTokens(address indexed wallet, uint256 amount);
    event VotingContractSet(address indexed votingContract);
    
    mapping(address => uint256) private balances;
    mapping(address => mapping(address => uint256)) private allowances;

    constructor(uint256 _initialSupply) {
        owner = msg.sender;
        totalSupply = _initialSupply * (10**decimals);
        balances[msg.sender] = totalSupply;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier onlyAuthorized() {
        require(msg.sender == owner || msg.sender == votingContract, "Only authorized can call this function");
        _;
    }

    function balanceOf(address account) public view returns (uint256) {
        return balances[account];
    }

    // Changed to use onlyOwner instead of isOwner
    function setVotingContract(address _votingContract) public onlyOwner {
        require(_votingContract != address(0), "Invalid voting contract address");
        require(votingContract == address(0), "Voting contract already set");
        votingContract = _votingContract;
        emit VotingContractSet(_votingContract);
    }

    // Regular token transfers don't need authorization
    function transfer(address recipient, uint256 amount) public returns (bool) {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        balances[recipient] += amount;
        emit Transfer(msg.sender, recipient, amount);
        return true;
    }

    function removeTokens(address wallet, uint256 amount) public onlyAuthorized {
        require(balances[wallet] >= amount, "Insufficient balance");
        unchecked {
            balances[wallet] -= amount;
            balances[owner] += amount;
        }
        emit RemoveTokens(wallet, amount);
    }
}