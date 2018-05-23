pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/token/ERC20/PausableToken.sol";


contract ProxyToken2 is PausableToken {
  string public name;
  string public symbol;
  uint256 public decimals;
  string public something;
  bool public isCool;

  function setupContract(
    string _name,
    string _symbol,
    uint256 _decimals,
    uint256 _totalSupply
  )
    public
  {
    name = _name;
    symbol = _symbol;
    decimals = _decimals;
    totalSupply_ = _totalSupply;
    owner = msg.sender;
  }

  function toggleIsCool()
    public
    returns (bool)
  {
    isCool = !isCool;
    return true;
  }

  function setSomething(string _thing)
    public
    returns (bool)
  {
    something = _thing;
    return true;
  }
}