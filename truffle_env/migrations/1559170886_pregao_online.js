var NoticeFactory = artifacts.require('./NoticeFactory');

module.exports = function (deployer) {
  // Use deployer to state migration tasks.
  deployer.deploy(NoticeFactory);
};