// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.28;

import "./IERC20.sol";
contract CarbonCredit is IERC20{
  // specific token for carbon credit
  uint256 supply;
  uint256 timeFrame;
  uint256 period;
  uint256 startTime;
  address public creditSupplier;
  // event to be emitted on transfer
  event Transfer(address indexed _from, address indexed _to, uint256 _value);

  // event to be emitted on approval
  event Approval(
    address indexed _owner,
    address indexed _spender,
    uint256 _value
  );

  mapping(address => uint256) balances;
  mapping(address => mapping(address => uint256))allowances;

  modifier isCreditSupplier(){
    require(msg.sender==creditSupplier,"only credit supplier can call this function");
    _;
  }
  modifier checkTime(){
    require(block.timestamp-startTime<=timeFrame*period,"time frame is not reached, can adust supply after");
    _;
  }

  constructor(uint256 _supply,uint256 _timeFrame) {
    supply=_supply;//assign the supply
    timeFrame=_timeFrame;//assign the timeFrame
    balances[msg.sender]=supply;
    period = 0;
    startTime = block.timestamp;
    creditSupplier=msg.sender;
  }

  // to add more supply
  function getSupply(uint256 _supply) public checkTime isCreditSupplier {
    supply+=_supply;
    balances[msg.sender]+=_supply;
    period++;
  }

  function changeCreditSupplier(address _newCreditSupplier) public isCreditSupplier {
    creditSupplier=_newCreditSupplier;
  }

  function totalSupply() public view  returns (uint256) {
    return supply;
  }

  function balanceOf(address _owner) public view returns (uint256) {
    return balances[_owner];
  }

  function transfer(address _to, uint256 _value) public returns (bool) {
    require(balances[msg.sender]>=_value, "you need to have high balance");
    balances[msg.sender]-=_value;
    balances[_to]+=_value;
    emit Transfer(msg.sender,_to, _value);

    return true;

  }

  function transferFrom(
    address _from,
    address _to,
    uint256 _value
  ) public returns (bool) {
    require(balances[_from] >=_value,"not sufficient balance");
    require(allowances[_from][msg.sender] >=_value,"not sufficient balance");
    balances[_from]-=_value;
    balances[_to]+=_value;
    allowances[_from][msg.sender]-=_value;
    emit Transfer (_from,_to,_value);
    return true;

  }

  // standard ERC20 function
  function approve(address _spender, uint256 _value) public returns (bool) {
    allowances[msg.sender][_spender]=_value;
    emit Approval(msg.sender, _spender, _value);

    return true;
  }

  // standard ERC20 function
  function allowance(address _owner, address _spender)
    public
    view
    returns (uint256 remaining)
  {
    return allowances[_owner][_spender];
  }
}
