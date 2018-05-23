pragma solidity 0.4.23;


contract Proxy {
  bytes32 public constant proxyOwnerSlot = keccak256("proxyOwner");
  bytes32 public constant masterContractSlot = keccak256("masterAddress");

  constructor(address _master) 
    public
  {
    require(_master != address(0));
    changeProxyOwner(msg.sender);
    changeProxyMaster(_master);
  }

  //
  // proxy state getters
  //

  function proxyOwner()
    public
    view
    returns (address _owner)
  {
    bytes32 _ownerSlot = proxyOwnerSlot;
    assembly {
      _owner := sload(_ownerSlot)
    }
  }

  function proxyMasterContract()
    public
    view
    returns (address _masterContract)
  {
    bytes32 _masterContractSlot = masterContractSlot;
    assembly {
      _masterContract := sload(_masterContractSlot)
    }
  }

  //
  // proxy state setters
  //

  function changeProxyMaster(address _master)
    public
    returns (bool)
  {
    require(msg.sender == proxyOwner());
    require(_master != address(0));
    require(proxyMasterContract() != _master);
    bytes32 _masterContractSlot = masterContractSlot;
    assembly {
      sstore(_masterContractSlot, _master)
    }

    return true;
  }

  function changeProxyOwner(address _owner)
    public
    returns (bool)
  {
    bytes32 _proxyOwnerSlot = proxyOwnerSlot;
    assembly {
      sstore(_proxyOwnerSlot, _owner)
    }

    return true;
  }

  //
  // fallback for all proxy functions
  //

  function()
    external
    payable
  {
    bytes32 _masterContractSlot = masterContractSlot;
    assembly {
      // load address from first storage pointer
      let _master := sload(_masterContractSlot)

      // calldatacopy(t, f, s)
      calldatacopy(
        0x0, // t = mem position to
        0x0, // f = mem position from
        calldatasize // s = size bytes
      )

      // delegatecall(g, a, in, insize, out, outsize) => 0 on error 1 on success
      let success := delegatecall(
        gas, // g = gas 
        _master, // a = address
        0x0, // in = mem in  mem[in..(in+insize)
        calldatasize, // insize = mem insize  mem[in..(in+insize)
        0x0, // out = mem out  mem[out..(out+outsize)
        0 // outsize = mem outsize  mem[out..(out+outsize)
      )

      // returndatacopy(t, f, s)
      returndatacopy(
        0x0, // t = mem position to
        0x0,  // f = mem position from
        returndatasize // s = size bytes
      )

      // check if call was a success and return if no errors & revert if errors
      if iszero(success) {
        revert(
          0x0, 
          returndatasize
        )
      }
        return(
          0x0, 
          returndatasize
        )
    }
  }
}
