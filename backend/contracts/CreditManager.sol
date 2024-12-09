// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.28;
/*
@title CreditManager contract 
This contract is to manage the carbon credit of an organization
Act as a supply chain
*/
import "./IERC20.sol";
contract CreditManager {
    address public owner;
    uint256 public totalCredit;
    address[] public creditHolders;
    mapping(address => uint256) public creditBalance;
    mapping(address => bool) public holderList;
    IERC20 public cct; // carbon credit token

    event creditUsed(address indexed holder, address indexed recipient, uint256 credit);
    event CreditAllocated(address indexed factory, uint256 amount);
    constructor(address _owner,address _tokenAddress) {
        if (_owner == address(0)) {
            owner = msg.sender;
        } else {
            owner = _owner;
        }
        require(_tokenAddress != address(0), "Invalid token address");
        cct = IERC20(_tokenAddress);
    }

    modifier isOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier isHolder() {
        require(holderList[msg.sender], "Only credit holder can call this function");
        _;
    }

    function changeOwner(address _owner) public isOwner {
        owner = _owner;
    }

    function addCreditHolder(address _holder) public isOwner {
        require(_holder != address(0), "Invalid address");
        creditHolders.push(_holder);
        holderList[_holder] = true;
    }
    
    function removeCreditHolder(address _holder) public isOwner {
        require(_holder != address(0), "Invalid address");
        cct.approve(_holder, 0);
        for(uint i=0; i<creditHolders.length; i++) {
            if(creditHolders[i] == _holder) {
                creditHolders[i] = creditHolders[creditHolders.length-1];
                creditHolders.pop();
                break;
            }
        }
        holderList[_holder] = false;
    }

    /**
    * @dev for owner to add credit to holder, and deduct it from total credit
    */
    function giveCredit(address _holder, uint256 _amount) public isOwner {
        require(_holder != address(0), "Invalid address");
        require(cct.balanceOf(address(this)) >= _amount, "Insufficient contract balance");
        // Approve the factory to spend tokens on behalf of the contract
        cct.approve(_holder, _amount);
    }

    /**
     * @dev for owner to reduce credit from holder, and add it back to total credit
     */
    function reduceCredit(address _holder, uint256 _amount) public isOwner {
        require(_holder != address(0), "Invalid address");
        uint256 currentAllowance = cct.allowance(address(this), _holder);
        require(currentAllowance >= _amount, "Amount exceeds current allowance");

        // Reduce the allowance by setting a new, lower value
        cct.approve(_holder, currentAllowance - _amount);
    }
    /**
     * @dev for holders to use credit
     * virtual function can connect to IOT device to deduct credit
     */
    function useCredit(address _recipient,uint256 _amount) public isHolder {
        require(_recipient != address(0), "Invalid recipient address");
        require(cct.allowance(address(this), msg.sender) >= _amount, "Allowance insufficient");

        // Factory spends tokens on behalf of the contract
        cct.transferFrom(address(this), _recipient, _amount);
        emit creditUsed(msg.sender,_recipient,_amount);
    }
    
    /**
    * @dev for owner to distribute credit to all holders
    * @param _creditPerHolder: amount of credit to be distributed to each holder
    */
    function distributeCredit(uint256 _creditPerHolder) public isOwner {
        require(cct.balanceOf(address(this)) >= _creditPerHolder * creditHolders.length, "Insufficient token balance");
        for (uint i = 0; i < creditHolders.length; i++) {
            cct.approve(creditHolders[i], _creditPerHolder);
        }
    }
    

    function topUp(uint256 _amount) public isOwner {
        cct.transfer(address(this), _amount);
    }

    function getFactoryAllowance(address _factory) external view returns (uint256) {
        return cct.allowance(address(this), _factory);
    }
}