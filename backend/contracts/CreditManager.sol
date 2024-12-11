// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.28;

import "./IReward.sol";
import "./IERC20.sol";

contract CreditManager {
    address public owner;
    uint256 public totalCredit;
    address[] public creditHolders;
    mapping(address => uint256) public creditBalance;
    mapping(address => bool) public holderList;
    IERC20 public cct; // carbon credit token
    IReward public rewardReg; // reward token


    uint256 public startTime;
    OnTimeUsage[] usageData; // ALL usage data to track usage of credit and its time
    uint256 public periodCount = 0; // to track the period
    uint256[] yearlyUsageData; // usage data for each year
    uint256 calculationFlag = 0; // to aviod double calculation of the reward
    mapping(address => uint256) cBalances; // credit balance 

    mapping(address => mapping(address => uint256)) cAllowances;  // credit allowances   
    //reward claim
    uint256 public rewardClaimCounter = 0;

    struct OnTimeUsage {
        uint256 usage;
        uint256 time;
    }

    event creditUsed(address indexed holder, address indexed recipient, uint256 credit);
    event CreditAllocated(address indexed factory, uint256 amount);
    event CreditDeallocated(address indexed factory, uint256 amount);// credit has been reduced x amount, credit -= x
    event TopUpCredit(address indexed this_contract, uint256 amount);// balance += amount
    event UpdateYearlyUsageData(uint256 totalUsage);
    event UpdateRCCounter(uint256 rewardClaimCounter);
    event Approval(address indexed _owner, address indexed _spender, uint256 _value);
    event TransferOnBehalf(address indexed _from, address indexed _to, uint256 _value);
    event Transfer(address indexed _to, uint256 _value);
    event SetCredit(address indexed _holder, uint256 _value);
    event AddCreditHolder(address indexed _holder);
    event RemoveCreditHolder(address indexed _holder);
    event ChangeOwner(address indexed _owner);
    
    constructor(address _owner, address _tokenAddress, address _rewardToken) {
        if (_owner == address(0)) {
            owner = msg.sender;
        } else {
            owner = _owner;
        }
        require(_tokenAddress != address(0), "Invalid token address");
        cct = IERC20(_tokenAddress);
        rewardReg = IReward(_rewardToken);
        startTime = block.timestamp;
    }

    modifier isOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier isHolder() {
        require(holderList[msg.sender], "Only credit holder can call this function");
        _;
    }

    modifier isRewardContract() {
        require(msg.sender == address(rewardReg), "Only reward contract can call this function");
        _;
    }

    function changeOwner(address _owner) public isOwner {
        owner = _owner;
        emit ChangeOwner(owner);
    }

    function addCreditHolder(address _holder) public isOwner {
        require(_holder != address(0), "Invalid address");
        creditHolders.push(_holder);
        holderList[_holder] = true;
        emit AddCreditHolder(_holder);
    }
    
    /**
     * 
     * @param _holder address of the holder to be removed
     * @dev for owner to remove credit holder
     */
    function removeCreditHolder(address _holder) public isOwner {
        require(_holder != address(0), "Invalid address");
        cApprove(_holder, 0);
        for(uint i=0; i<creditHolders.length; i++) {
            if(creditHolders[i] == _holder) {
                creditHolders[i] = creditHolders[creditHolders.length-1];
                creditHolders.pop();
                break;
            }
        }
        holderList[_holder] = false;
        emit RemoveCreditHolder(_holder);
    }

    /**
    * @dev for owner to add credit to holder
    */
    function giveCredit(address _holder, uint256 _amount) public isOwner {
        require(_holder != address(0), "Invalid address");
        require(cct.balanceOf(address(this)) >= _amount, "Insufficient contract balance");
        // Approve the factory to spend tokens on behalf of the contract
        cApprove(_holder, _amount);// in scope of this supply chain
        emit CreditAllocated(_holder, _amount);
    }

    /**
     * @dev for owner to reduce credit from holder
     * @param _holder address of the holder to reduce credit from
     * @param _amount amount of credit to reduce to, e.g., 5 means credit = 5
     */
    function reduceCredit(address _holder, uint256 _amount) public isOwner {
        require(_holder != address(0), "Invalid address");
        uint256 currentAllowance = allowanceOf(address(this), _holder);
        require(currentAllowance >= _amount, "Amount exceeds current allowance");

        // Reduce the allowance by setting a new, lower value
        cApprove(_holder, currentAllowance - _amount);
        emit CreditDeallocated(_holder, _amount);
    }
    /**
     * @dev for owner to set credit to holder
     * @param _holder address of the holder to set credit to
     * @param _amount amount of credit to set to, e.g., 5 means credit = 5
     */
    function setCredit(address _holder, uint256 _amount) public isOwner {
        require(_holder != address(0), "Invalid address");

        // Reduce the allowance by setting a new, lower value
        cApprove(_holder,  _amount);
        emit SetCredit(_holder, _amount);
    }
    /**
     * @dev for contract manager to transfer credit on behalf of factory
     */
    function transferOnBehalf(
        address _from,
        address _to,
        uint256 _value
    ) public returns (bool) {
        require(cct.balanceOf(address(this)) >=_value,"not sufficient balance");
        require(cAllowances[_from][msg.sender] >=_value,"not sufficient balance");
        cct.transfer(_to,_value);
        emit TransferOnBehalf(_from,_to,_value);
        emit Transfer (_to,_value);
        return true;

    }
    /**
     * @dev for contract manager to approve credit to factory
     */
    function cApprove(address _spender, uint256 _value) public returns (bool) {
        cAllowances[msg.sender][_spender]=_value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }
    /**
     * @dev for holders to check their credit balance
     */
    function allowanceOf(address _owner, address _spender)
        public
        view
        returns (uint256 remaining)
    {
        return cAllowances[_owner][_spender];
    }   

    /**
     * @dev for holders to use credit
     * virtual function can connect to IOT device to deduct credit
     */

    function useCredit(address _recipient, uint256 _amount) public isHolder {
        require(_recipient != address(0), "Invalid recipient address");
        require(cAllowances[address(this)][msg.sender] >= _amount, "Allowance insufficient");

        // Factory spends tokens on behalf of the contract
        transferOnBehalf(address(this), _recipient, _amount);
        // cct.transferFrom(address(this), _recipient, _amount);
        usageData.push(OnTimeUsage(_amount, block.timestamp));
        emit creditUsed(msg.sender, _recipient, _amount);
    }
    
    /**
    * @dev for owner to distribute credit to all holders
    * @param _creditPerHolder: amount of credit to be distributed to each holder
    */
    function distributeCredit(uint256 _creditPerHolder) public isOwner {
        require(cct.balanceOf(address(this)) >= _creditPerHolder * creditHolders.length, "Insufficient token balance");
        for (uint i = 0; i < creditHolders.length; i++) {
            cApprove(creditHolders[i], _creditPerHolder);
            emit CreditAllocated(creditHolders[i], _creditPerHolder);
        }
    }
    

    function topUp(uint256 _amount) public isOwner {
        require(cct.transfer(address(this), _amount),"Top up failed");
        emit TopUpCredit(address(this), _amount);
    }

    function getFactoryAllowance(address _factory) external view returns (uint256) {
        return allowanceOf(address(this), _factory);
    }
    


    modifier PeriodPassed() {
        require(block.timestamp > startTime*periodCount + 365 days, "Period not passed");
        _;
    }

    function getYearlyUsage() public returns (uint256) {
        uint256 totalUsage = 0;
        uint256 periodStartTime = periodCount*365 days;
        uint256 endTime = (periodCount+1)*365 days;
        OnTimeUsage[] storage usages = usageData;
        for (uint256 i = calculationFlag; i < usages.length; i++) {
            if (usages[i].time >= periodStartTime && usages[i].time <= endTime) {
                totalUsage += usages[i].usage;
            }
            if (usages[i].time > endTime) {
                calculationFlag = i;
            }
        }
        
        return totalUsage;
    }
    function updateYearlyUsage() public PeriodPassed {
        uint256 totalUsage = getYearlyUsage();
        yearlyUsageData.push(totalUsage);
        periodCount++;
        emit UpdateYearlyUsageData(totalUsage);
    }
    function updateRewardClaimCounter() public isRewardContract {
        rewardClaimCounter+=2;
        emit UpdateRCCounter(rewardClaimCounter);
    }

    function tryClaimReward() public {
        bool success =rewardReg.claimReward(address(this),yearlyUsageData,rewardClaimCounter);
        require(success,"Reward claim failed");

    }


}