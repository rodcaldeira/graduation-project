const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const web3 = new Web3(ganache.provider());

const compiled_factory = require('../ethereum/build/NoticeFactory.json');
const compiled_notice = require('../ethereum/build/Notice.json');
const compiled_item = require('../ethereum/build/NoticeItem.json');

let accounts;
let factory;
let notice_address;
let notice;
let notice_item_address;
let notice_item;

beforeEach(async () => {
  this.timeout = 15000000;
  // get a list of all accounts
  accounts = await web3.eth.getAccounts();

  // deploy new version of contract


  factory = await new web3.eth.Contract(JSON.parse(compiled_factory.interface)).deploy({ data: compiled_factory.bytecode }).send({ from: accounts[0], gas: '3000000' });

  // uses the methods to deploy a new contract
//(address _crier, uint publish, uint opening, uint ending, string memory pdf_hash, string memory pdf_link)
  // await factory.methods.addNotice(accounts[0], 0, 0, 0, "pdf_hash", "pdf_link").send({from: accounts[0], gas: '3000000' });
  //
  // // saves in variable the address of notice deployd previously
  // [notice_address] = await factory.methods.getNotices().call();
  //
  // notice = await new web3.eth.Contract(
  //   JSON.parse(compiled_notice.interface),
  //   notice_address
  // );
  // use on of those accounts to deploy
  // the contract
});


describe('Notices', () => {
  it('deploys a factory and a notice', (done) => {
    assert.ok(factory.options.address);
    // assert.ok(notice.options.address);
  });
});
