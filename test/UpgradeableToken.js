/* eslint-disable no-console */

const assert = require('assert')
const Proxy = artifacts.require('./Proxy.sol')
const ProxyToken = artifacts.require('./ProxyToken')
const ProxyToken2 = artifacts.require('./ProxyToken2')

const BigNumber = require('bignumber.js')
const arrayToTable = require('array-to-table')
const chalk = require('chalk')
const {
  getAllSimpleStorage,
  findMappingStorage,
  // getNestedMappingStorage,
  getMappingStorage,
  findNestedMappingStorage
} = require('./utils/general')

describe('when deploying ProxyToken', () => {
  contract('UpgradeableToken', accounts => {
    const defaultName = 'ExampleCoin'
    const defaultSymbol = 'EXL'
    const defaultDecimals = new BigNumber(18)
    const defaultTotalSupply = new BigNumber(100e18)
    const sender = accounts[0]
    const receiver = accounts[1]
    const spender = accounts[2]
    const owner = accounts[3]

    // contracts
    let ptm
    let ptm2
    let pxy
    let ptn

    // storage pointers

    before('setup contracts', async () => {
      // ProxyToken master
      ptm = await ProxyToken.new()
      ptm2 = await ProxyToken2.new()
      // deployment of new proxy
      pxy = await Proxy.new(ptm.address, { from: owner })
      // setup to call as ProxyToken implementation
      ptn = ProxyToken.at(pxy.address)
    })

    it('should have owner and master set in hashed storage location', async () => {
      const proxyOwner = await pxy.proxyOwner()
      const proxyMasterContract = await pxy.proxyMasterContract()

      assert.equal(proxyOwner, owner, 'proxyOwner should be set to owner')
      assert.equal(
        proxyMasterContract,
        ptm.address,
        'proxyMastercontract should be set to ptm.address'
      )
    })

    it('should have no storage in first 10 slots', async () => {
      const storage = await getAllSimpleStorage(ptn.address)
      console.log(chalk.magenta(arrayToTable(storage)))

      for (const item of storage) {
        assert.equal(
          item.data,
          '0x00',
          'all storage at least in range of 0-10 should be 0x00'
        )
      }
    })

    it('proxy-only storage should be stored at a hashed storage location', async () => {
      const proxyOwnerSlot = await pxy.proxyOwnerSlot()
      const masterContractSlot = await pxy.masterContractSlot()

      const proxyOwner = await web3.eth.getStorageAt(
        pxy.address,
        proxyOwnerSlot
      )
      const proxyMasterContract = await web3.eth.getStorageAt(
        pxy.address,
        masterContractSlot
      )

      assert.equal(
        proxyMasterContract,
        ptm.address,
        'first storage should be ptm address'
      )
      assert.equal(proxyOwner, owner, 'second storage should be owner address')
    })

    it('should setupContract with correct values', async () => {
      await ptn.setupContract(
        defaultName,
        defaultSymbol,
        defaultDecimals,
        defaultTotalSupply
      )

      const name = await ptn.name()
      const symbol = await ptn.symbol()
      const decimals = await ptn.decimals()
      const totalSupply = await ptn.totalSupply()

      assert.equal(
        defaultName,
        name,
        'name should match name given in constructor'
      )
      assert.equal(
        defaultSymbol,
        symbol,
        'symbol should match symbol given in constructor'
      )
      assert.equal(
        defaultDecimals.toString(),
        decimals.toString(),
        'decimals should match decimals given in constructor'
      )
      assert.equal(
        defaultTotalSupply.toString(),
        totalSupply.toString(),
        'totalSupply should match totalSupply given in constructor'
      )
    })

    it('should have additional storage from previous setup stage', async () => {
      const storage = await getAllSimpleStorage(ptn.address)
      console.log(chalk.magenta(arrayToTable(storage)))
      // all stored in order of usage in contract: use truffle-flattener to see clearly...
      assert.equal(
        storage[0].data,
        '0x00',
        'slot 0 should be empty used for balances mapping'
      )
      assert.equal(
        new BigNumber(storage[1].data).toString(),
        defaultTotalSupply.toString(),
        'slot 1 should contain newly set totalSupply'
      )
      //
      assert.equal(
        storage[2].data,
        '0x00',
        'slot 2 should be empty used for allowances nested mapping'
      )
      // stored as hex value with length at end of slot since less than 32bytes
      assert.equal(
        web3.toAscii(storage[3].data.slice(0, 24)),
        defaultName,
        'slot 3 should contain token name'
      )
      // stored as hex value with length at end of slot since less than 32bytes
      assert.equal(
        web3.toAscii(storage[4].data.slice(0, 8)).trim(),
        defaultSymbol,
        'slot 4 should contain token symbol'
      )
      // stored last since assigned last
      assert.equal(
        new BigNumber(storage[5].data).toString(),
        defaultDecimals.toString(),
        'slot 5 should contain token decimal'
      )
    })

    it('should run gimme to give sender totalSupply', async () => {
      await ptn.gimme({ from: sender })

      await ptn.transfer(receiver, 1e18, {
        from: sender
      })

      const senderBalance = await ptn.balanceOf(sender)
      const receiverBalance = await ptn.balanceOf(receiver)
      assert.equal(
        defaultTotalSupply.sub(1e18).toString(),
        senderBalance.toString(),
        'sender balance should be equal to total supply after running gimme'
      )
      assert.equal(
        new BigNumber(1e18).toString(),
        receiverBalance.toString(),
        'sender balance should be equal to total supply after running gimme'
      )
    })

    it('should have even more storage after runninng gimme', async () => {
      const simpleStorage = await getAllSimpleStorage(ptn.address)
      console.log(chalk.magenta(arrayToTable(simpleStorage)))

      // looks for mapping storage from a certain index to a certain index
      // useful if you don't know which index is storing desired mapping
      const {
        mappingValueStorage,
        mappingValueSlot,
        mappingSlot
      } = await findMappingStorage(
        ptn.address,
        sender,
        new BigNumber(0),
        new BigNumber(20)
      )
      console.log(
        chalk.cyan(
          `found mapping value at ${mappingValueSlot} using slot ${mappingSlot}`
        )
      )
      console.log(chalk.magenta(mappingValueStorage))

      const {
        mappingValueStorage: mappingValueStorage2,
        mappingValueSlot: mappingValueSlot2,
        mappingSlot: mappingSlot2
      } = await findMappingStorage(
        ptn.address,
        receiver,
        new BigNumber(0),
        new BigNumber(20)
      )
      console.log(
        chalk.cyan(
          `found mapping value at ${mappingValueSlot2} using slot ${mappingSlot2}`
        )
      )
      console.log(chalk.magenta(mappingValueStorage2))
    })

    it('should set approvals', async () => {
      await ptn.approve(spender, 2e18, {
        from: sender
      })

      const allowance = await ptn.allowance(sender, spender)
      assert.equal(
        new BigNumber(2e18).toString(),
        allowance.toString(),
        'allowance should now be 2e18'
      )
    })

    it('should have additional storage due to allowance being set', async () => {
      const simpleStorage = await getAllSimpleStorage(ptn.address)
      console.log(chalk.magenta(arrayToTable(simpleStorage)))

      const {
        mappingValueStorage,
        mappingValueSlot,
        mappingSlot
      } = await findMappingStorage(
        ptn.address,
        sender,
        new BigNumber(0),
        new BigNumber(20)
      )
      console.log(
        chalk.cyan(
          `found mapping value at ${mappingValueSlot} using slot ${mappingSlot}`
        )
      )
      console.log(chalk.magenta(mappingValueStorage))

      const info = await findNestedMappingStorage(
        ptn.address,
        sender,
        spender,
        new BigNumber(0),
        new BigNumber(20)
      )
      console.log(
        chalk.cyan(`found nested mapping value using slot ${info.mappingSlot}`)
      )
      console.log(chalk.magenta(info.nestedMappingValueStorage))
    })

    it('should upgrade using ProxyToken2 as the new master', async () => {
      const preMasterContract = await pxy.proxyMasterContract()

      await pxy.changeProxyMaster(ptm2.address, {
        from: owner
      })

      const postMasterContract = await pxy.proxyMasterContract()

      assert.equal(
        preMasterContract,
        ptm.address,
        'master address should be ptm.address'
      )
      assert.equal(
        postMasterContract,
        ptm2.address,
        'master address should be ptm2.address'
      )
    })

    it('should perform all previous functions normally with new upgrade', async () => {
      const transferAmount = 3e17
      const approveAmount = 5e17

      // clear out approval for testing...
      await ptn.approve(spender, 0, { from: sender })
      const preSenderBalance = await ptn.balanceOf(sender)
      const preReceiverBalance = await ptn.balanceOf(receiver)
      const preSpenderAllowance = await ptn.allowance(sender, spender)

      // access in new upgraded way with new def
      ptn = await ProxyToken2.at(pxy.address)
      await ptn.transfer(receiver, transferAmount, { from: sender })
      await ptn.approve(spender, approveAmount, { from: sender })

      const postSenderBalance = await ptn.balanceOf(sender)
      const postReceiverBalance = await ptn.balanceOf(receiver)
      const postSpenderAllowance = await ptn.allowance(sender, spender)

      assert.equal(
        preSenderBalance.sub(postSenderBalance).toString(),
        transferAmount.toString(),
        'sender balance should be decremented by transferAmount'
      )
      assert.equal(
        postReceiverBalance.sub(preReceiverBalance).toString(),
        transferAmount.toString(),
        'receiver balance should be incremented by transferAmount'
      )
      assert.equal(
        postSpenderAllowance.sub(preSpenderAllowance).toString(),
        approveAmount.toString(),
        'spender allowance should be incremented by approveAmount'
      )
    })

    it('should NOT affect already existing storage slots', async () => {
      const storage = await getAllSimpleStorage(ptn.address)
      console.log(chalk.magenta(arrayToTable(storage)))

      const mappingStuff = await getMappingStorage(
        ptn.address,
        new BigNumber(0),
        sender
      )
      console.log(mappingStuff)
    })

    it('should toggleIsCool', async () => {
      await ptn.toggleIsCool()
      await ptn.setSomething('whatever dood')
    })

    it('should have new storage for isCool', async () => {
      const storage = await getAllSimpleStorage(ptn.address)
      console.log(chalk.magenta(arrayToTable(storage)))
    })
  })
})
