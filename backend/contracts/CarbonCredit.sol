// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.28;

contract CarbonCredit{
  // specific token for carbon credit
  uint256 supply;
  uint256 timeFrame;
  uint256 period;
  uint256 startTime;
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
  modifier checkTime(){
    require(block.timestamp-startTime<=timeFrame*period,"time frame is not reached, can adust supply after",timeFrame*period-block.timestamp+startTime);
    _;
  }

  constructor(uint256 _supply,time timeFrame) {
    supply=_supply;//assign the supply
    timeFrame=_timeFrame;//assign the timeFrame
    balances[msg.sender]=supply;
    period = 0;
    startTime = block.timestamp;
  }
  function ajustSupply(uint256 _supply) public checkTime {
    supply=_supply;
    period++;
  }


  function totalSupply() public pure returns (uint256) {
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
    // TODO: transfer `_value` tokens from `_from` to `_to`
    // NOTE: `_from` needs to have enough tokens and to have allowed sender to spend on his behalf
    require(balances[_from] >=_value,"not sufficient balance");
    require(allowances[_from][msg.sender] >=_value,"not sufficient balance");
    balances[_from]-=_value;
    balances[_to]+=_value;
    allowances[_from][msg.sender]-=_value;
    emit Transfer (_from,_to,_value);
    return true;

  }

  function approve(address _spender, uint256 _value) public returns (bool) {
    allowances[msg.sender][_spender]=_value;
    emit Approval(msg.sender, _spender, _value);

    return true;
    // TODO: allow `_spender` to spend `_value` on sender's behalf
    // NOTE: if an allowance already exists, it should be overwritten

  }

  function allowance(address _owner, address _spender)
    public
    view
    returns (uint256 remaining)
  {
    // TODO: return how much `_spender` is allowed to spend on behalf of `_owner`
    return allowances[_owner][_spender];
  }
}
