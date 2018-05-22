const Proxy = artifacts.require('./Proxy.sol')
const ConceptToken = artifacts.require('./ProxyToken.sol')
const BigNumber = require('bignumber.js')

module.exports = deployer => {
  deployer
    .then(async () => {
      const ptm = await ConceptToken.new()
      await Proxy.new(ptm.address)

      return true
    })
    .catch(err => {
      // eslint-disable-next-line no-console
      console.log(err)
    })
}
