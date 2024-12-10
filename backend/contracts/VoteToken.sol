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
    mapping(address => uint256) private balances;
    mapping(address => mapping(address => uint256)) private allowances;

    constructor(uint256 _initialSupply) {
        owner = msg.sender;  // Add this line
        totalSupply = _initialSupply * (10**decimals);
        balances[msg.sender] = totalSupply; // Assign all tokens to the deployer
    }

    modifier isOwner() {
        require(msg.sender == owner || msg.sender == votingContract, "Only owner can call this function");
        _;
    }

    function balanceOf(address account) public view returns (uint256) {
        return balances[account];
    }

    function transfer(address recipient, uint256 amount) public isOwner returns (bool) {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        balances[recipient] += amount;
        emit Transfer(msg.sender, recipient, amount);
        return true;
    }
    function addContractOwner() public isOwner {
        votingContract = msg.sender;
    }

    function removeTokens(address wallet,uint256 amount) public isOwner{
        require(balances[wallet] >= amount, "Insufficient balance");
        unchecked { // Use unchecked block to avoid overflow checks
            balances[wallet] -= amount;
            balances[owner] += amount;
        }
        emit RemoveTokens(wallet, amount);
    }


}