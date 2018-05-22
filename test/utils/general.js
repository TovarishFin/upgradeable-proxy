/* eslint-disable no-console */

const assert = require('assert')
const BigNumber = require('bignumber.js')

const testWillThrow = async (fn, args) => {
  try {
    await fn(...args)
    assert(false, 'the contract should throw here')
  } catch (error) {
    assert(
      /invalid opcode|revert/.test(error),
      `the error message should be invalid opcode, the error was ${error}`
    )
  }
}

const testContractDestroyed = async (fn, args) => {
  try {
    await fn(...args)
    assert(false, 'the contract should throw here')
  } catch (error) {
    assert(
      /not a contract address/.test(error),
      `the error message should contain no contract, the error was ${error}`
    )
  }
}

const getEtherBalance = address => {
  return new Promise((resolve, reject) => {
    web3.eth.getBalance(address, (err, res) => {
      if (err) reject(err)

      resolve(res)
    })
  })
}

const getTxInfo = txHash => {
  if (typeof txHash === 'object') {
    return txHash.receipt
  }

  return new Promise((resolve, reject) => {
    web3.eth.getTransactionReceipt(txHash, (err, res) => {
      if (err) {
        reject(err)
      }

      resolve(res)
    })
  })
}

const sendTransaction = args => {
  return new Promise(function(resolve, reject) {
    web3.eth.sendTransaction(args, (err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  })
}

const addressZero = `0x${'0'.repeat(40)}`

const gasPrice = new BigNumber(30e9)

const bigZero = new BigNumber(0)

const getAllSimpleStorage = async addr => {
  let slot = 0
  let zeroCounter = 0
  const simpleStorage = []
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const data = await web3.eth.getStorageAt(addr, slot)
    if (new BigNumber(data).equals(0)) {
      zeroCounter++
    }

    simpleStorage.push({ slot, data })
    slot++

    if (zeroCounter > 10) {
      break
    }
  }

  return simpleStorage
}

const findMappingStorage = async (address, key, startSlot, endSlot) => {
  const bigStart = startSlot.add ? startSlot : new BigNumber(startSlot)
  const bigEnd = endSlot.add ? endSlot : new BigNumber(endSlot)

  for (
    let mappingSlot = bigStart;
    mappingSlot.lt(bigEnd);
    mappingSlot = mappingSlot.add(1)
  ) {
    const mappingValueSlot = getMappingSlot(mappingSlot.toString(), key)
    const mappingValueStorage = await web3.eth.getStorageAt(
      address,
      mappingValueSlot
    )
    if (mappingValueStorage != '0x00') {
      return {
        mappingValueStorage,
        mappingValueSlot,
        mappingSlot
      }
    }
  }

  // no non-empty storage found
  throw new Error('no storage found')
}

const standardizeInput = input => {
  input = input.replace('0x', '')
  return input.length >= 64 ? input : '0'.repeat(64 - input.length) + input
}

const getMappingSlot = (mappingSlot, key) => {
  const mappingSlotPadded = standardizeInput(mappingSlot)
  const keyPadded = standardizeInput(key)
  const slot = web3.sha3(keyPadded.concat(mappingSlotPadded), {
    encoding: 'hex'
  })

  return slot
}

const getMappingStorage = async (address, mappingSlot, key) => {
  const mappingKeySlot = getMappingSlot(mappingSlot.toString(), key)
  const complexStorage = await web3.eth.getStorageAt(address, mappingKeySlot)
  return complexStorage
}

const getNestedMappingStorage = async (address, mappingSlot, key, key2) => {
  const nestedMappingSlot = getMappingSlot(mappingSlot.toString(), key)

  const nestedMappingValueSlot = getMappingSlot(nestedMappingSlot, key2)

  const nestedMappingValueStorage = await web3.eth.getStorageAt(
    address,
    nestedMappingValueSlot
  )

  return {
    nestedMappingSlot,
    nestedMappingValueSlot,
    nestedMappingValueStorage
  }
}

const findNestedMappingStorage = async (
  address,
  key,
  key2,
  slotStart,
  slotEnd
) => {
  const bigStart = new BigNumber(slotStart)
  const bigEnd = new BigNumber(slotEnd)

  for (
    let mappingSlot = bigStart;
    mappingSlot.lt(bigEnd);
    mappingSlot = mappingSlot.add(1)
  ) {
    const nestedMappingSlot = getMappingSlot(mappingSlot.toString(), key)
    const nestedMappingValueSlot = getMappingSlot(nestedMappingSlot, key2)

    const nestedMappingValueStorage = await web3.eth.getStorageAt(
      address,
      nestedMappingValueSlot
    )

    if (nestedMappingValueStorage != '0x00') {
      return {
        nestedMappingValueStorage,
        mappingSlot,
        nestedMappingSlot,
        nestedMappingValueSlot
      }
    }
  }

  throw new Error('couldnt find nested mapping storage')
}

module.exports = {
  testWillThrow,
  testContractDestroyed,
  getEtherBalance,
  getTxInfo,
  addressZero,
  sendTransaction,
  gasPrice,
  bigZero,
  getAllSimpleStorage,
  findMappingStorage,
  getMappingSlot,
  getMappingStorage,
  getNestedMappingStorage,
  findNestedMappingStorage
}
