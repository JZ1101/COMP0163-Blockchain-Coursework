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

    //reward claim
    uint256 public rewardClaimCounter = 0;

    struct OnTimeUsage {
        uint256 usage;
        uint256 time;
    }

    event creditUsed(address indexed holder, address indexed recipient, uint256 credit);
    event CreditAllocated(address indexed factory, uint256 amount);
    event CreditDeallocated(address indexed factory, uint256 amount);// credit has been deallocated to x amount
    event TopUpCredit(address indexed this_contract, uint256 amount);// balance += amount
    event UpdateYearlyUsageData(uint256 totalUsage);
    event UpdateRCCounter(uint256 rewardClaimCounter);
    
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
    }

    function addCreditHolder(address _holder) public isOwner {
        require(_holder != address(0), "Invalid address");
        creditHolders.push(_holder);
        holderList[_holder] = true;
    }
    
    /**
     * 
     * @param _holder address of the holder to be removed
     * @dev for owner to remove credit holder
     */
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
        emit CreditAllocated(_holder, _amount);
    }

    /**
     * @dev for owner to reduce credit from holder
     * @param _holder address of the holder to reduce credit from
     * @param _amount amount of credit to reduce to, e.g., 5 means credit = 5
     */
    function reduceCredit(address _holder, uint256 _amount) public isOwner {
        require(_holder != address(0), "Invalid address");
        uint256 currentAllowance = cct.allowance(address(this), _holder);
        require(currentAllowance >= _amount, "Amount exceeds current allowance");

        // Reduce the allowance by setting a new, lower value
        cct.approve(_holder, currentAllowance - _amount);
        emit CreditDeallocated(_holder, _amount);
    }
    /**
     * @dev for holders to use credit
     * virtual function can connect to IOT device to deduct credit
     */
    function useCredit(address _recipient, uint256 _amount) public isHolder {
        require(_recipient != address(0), "Invalid recipient address");

        // Data encoding for transferFrom
        bytes memory data = abi.encodeWithSignature(
            "transferFrom(address,address,uint256)",
            address(this),    // From: contract
            _recipient,       // To: recipient
            _amount           // Amount
        );

        // Delegate the call to the ERC-20 contract
        (bool success, ) = address(cct).delegatecall(data);

        require(success, "Token transfer failed");

        // Log the usage
        usageData.push(OnTimeUsage(_amount, block.timestamp));
        emit creditUsed(msg.sender, _recipient, _amount);
    }

    // function useCredit(address _recipient, uint256 _amount) public isHolder {
    //     require(_recipient != address(0), "Invalid recipient address");
    //     require(cct.allowance(address(this), msg.sender) >= _amount, "Allowance insufficient");

    //     // Factory spends tokens on behalf of the contract
    //     (bool success, ) = address(cct).call(
    //     abi.encodeWithSignature("transferFrom(address(this), _recipient, _amount)", _recipient, _amount)
    // );
    //     require(success, "Token transfer failed");
    //     // cct.transferFrom(address(this), _recipient, _amount);
    //     usageData.push(OnTimeUsage(_amount, block.timestamp));
    //     emit creditUsed(msg.sender, _recipient, _amount);
    // }
    
    /**
    * @dev for owner to distribute credit to all holders
    * @param _creditPerHolder: amount of credit to be distributed to each holder
    */
    function distributeCredit(uint256 _creditPerHolder) public isOwner {
        require(cct.balanceOf(address(this)) >= _creditPerHolder * creditHolders.length, "Insufficient token balance");
        for (uint i = 0; i < creditHolders.length; i++) {
            cct.approve(creditHolders[i], _creditPerHolder);
            emit CreditAllocated(creditHolders[i], _creditPerHolder);
        }
    }
    

    function topUp(uint256 _amount) public isOwner {
        require(cct.transfer(address(this), _amount),"Top up failed");
        emit TopUpCredit(address(this), _amount);
    }

    function getFactoryAllowance(address _factory) external view returns (uint256) {
        return cct.allowance(address(this), _factory);
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