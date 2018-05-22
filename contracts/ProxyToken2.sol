pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol";


contract ProxyToken2 is StandardToken {
  string public name;
  string public symbol;
  uint256 public decimals;
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
  }

  function toggleIsCool()
    public
    returns (bool)
  {
    isCool = !isCool;
  }
}