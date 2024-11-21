// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.28;
/*
@title CreditManager contract 
This contract is to manage the carbon credit of an organization
*/
contract CreditManager {
    public address owner;
    public uint256 totalCredit;
    public address[] creditHolders;
    public mapping(address => uint256) creditBalance;
    public mapping(address => bool) isHolder;

    event creditUsed(address holder, uint256 credit);

    constructor() {
        owner = msg.sender;
    }

    constructor(address _owner) {
        owner = _owner;
    }

    modifier isOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier isHolder() {
        require(isHolder[msg.sender], "Only credit holder can call this function");
        _;
    }

    function changeOwner(address _owner) public isOwner {
        owner = _owner;
    }

    function addCreditHolder(address _holder) public isOwner {
        require(_holder != address(0), "Invalid address");
        creditHolders.push(_holder);
        isHolder[_holder] = true;
    }
    
    function removeCreditHolder(address _holder) public isOwner {
        require(_holder != address(0), "Invalid address");
        for(uint i=0; i<creditHolders.length; i++) {
            if(creditHolders[i] == _holder) {
                creditHolders[i] = creditHolders[creditHolders.length-1];
                creditHolders.pop();
                break;
            }
        }
        isHolder[_holder] = false;
    }

    /**
    * @dev for owner to add credit to holder, and deduct it from total credit
    */
    function giveCredit(address _holder, uint256 _credit) public isOwner {
        require(_holder != address(0), "Invalid address");
        require(totalCredit-_credit >= 0, "Insufficient credit");
        totalCredit -= _credit;
        creditBalance[_holder] += _credit; 
    }

    /**
     * @dev for owner to reduce credit from holder, and add it back to total credit
     */
    function reduceCredit(address _holder, uint256 _credit) public isOwner {
        require(_holder != address(0), "Invalid address");
        require(creditBalance[_holder]-_credit >= 0, "Insufficient credit, holer's credit is "+creditBalance[_holder]);
        creditBalance[_holder] -= _credit;
        totalCredit += _credit;
    }
    /**
     * @dev for holders to use credit
     */
    function useCredit(address _holder, uint256 _credit) public isHolder {
        require(_holder != address(0), "Invalid address");
        require(creditBalance[_holder]-_credit >= 0, "Insufficient credit, your credit is "+creditBalance[_holder]);
        creditBalance[_holder] -= _credit;
        creditUsed(_holder, _credit);
    }
    
    /**
    * @dev for owner to distribute credit to all holders
    * @param _creditPerHolder: amount of credit to be distributed to each holder
    */
    function distributeCredit(uint256 _creditPerHolder) public isOwner {
        require(_holder != address(0), "Invalid address");
        require(totalCredit-_creditPerHolder*creditHolders.length >= 0, "Insufficient credit");
        for(uint i=0; i<creditHolders.length; i++) {
            creditBalance[creditHolders[i]] += _creditPerHolder;
        }
    }

    function gainCredit(uint256 _credit) public isOwner {
        // not complete, future implementation will be added here, e.g., credit from carbon ERC20 token
        totalCredit += _credit;
    }
    

}