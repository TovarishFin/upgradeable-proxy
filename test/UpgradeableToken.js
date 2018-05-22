/* eslint-disable no-console */

const assert = require('assert')
const Proxy = artifacts.require('./Proxy.sol')
const ProxyToken = artifacts.require('./ProxyToken')
//const ProxyToken2 = artifacts.require('./ProxyToken2')

const BigNumber = require('bignumber.js')
const arrayToTable = require('array-to-table')
const chalk = require('chalk')
const {
  getAllSimpleStorage,
  findMappingStorage,
  getNestedMappingStorage,
  getMappingStorage,
  findNestedMappingStorage
} = require('./utils/general')

describe('when deploying ProxyToken', () => {
  contract('Example', accounts => {
    const defaultName = 'ExampleCoin'
    const defaultSymbol = 'EXL'
    const defaultDecimals = new BigNumber(18)
    const defaultTotalSupply = new BigNumber(100e18)
    const sender = accounts[0]
    const receiver = accounts[1]
    const spender = accounts[2]

    let ptm
    let ptn
    //let ptn2

    before('setup contracts', async () => {
      // ProxyToken master
      ptm = await ProxyToken.new()
      // deployment of new proxy
      const pxy = await Proxy.new(ptm.address)
      // setup to call as ProxyToken implementation
      ptn = ProxyToken.at(pxy.address)
    })

    it('should have ProxyToken master as first storage', async () => {
      const storage = await getAllSimpleStorage(ptn.address)
      console.log(chalk.magenta(arrayToTable(storage)))

      assert.equal(
        storage[0].data,
        ptm.address,
        'first and only storage should be ptm address'
      )
      for (const item of storage.slice(1)) {
        assert.equal(
          item.data,
          '0x00',
          'all storage receiver than first should be 0x00'
        )
      }
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
      // stored first because assigned first in proxy constructor
      assert.equal(
        storage[0].data,
        ptm.address,
        'slot 0 should still be master address'
      )
      // stored as hex value 2nd because first assigned due to inheritance
      assert.equal(
        new BigNumber(storage[1].data).toString(),
        defaultTotalSupply.toString(),
        'slot 1 should contain newly set totalSupply'
      )
      assert.equal(
        storage[2].data,
        '0x00',
        'slot 2 should be zero for some reason?'
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

      const senderBalance = await getMappingStorage(
        ptn.address,
        new BigNumber(0),
        sender
      )
      console.log(senderBalance)

      const stuff = await getNestedMappingStorage(
        ptn.address,
        new BigNumber(2),
        sender,
        spender
      )
      console.log(stuff)

      const info = await findNestedMappingStorage(
        ptn.address,
        sender,
        spender,
        new BigNumber(0),
        new BigNumber(20)
      )
      console.log(info)
    })
  })
})
