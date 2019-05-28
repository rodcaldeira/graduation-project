require('events').EventEmitter.defaultMaxListeners = 1000;
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
  // get a list of all accounts
  accounts = await web3.eth.getAccounts();
  // console.log(web3.eth);

  // deploy new version of contract
  factory = await new web3.eth.Contract(JSON.parse(compiled_factory.interface)).deploy({ data: compiled_factory.bytecode }).send({ from: accounts[0], gas: '6000000' });

  // console.log(factory.options.address);
  // uses the methods to deploy a new contract
//(address _crier, uint publish, uint opening, uint ending, string memory pdf_hash, string memory pdf_link)
  await factory.methods.addNotice(accounts[0], 0, 0, 0, "pdf_hash", "pdf_link").send({from: accounts[0], gas: '6000000' });

  // saves in variable the address of notice deployd previously
  [notice_address] = await factory.methods.getNotices().call();

  notice = await new web3.eth.Contract(
    JSON.parse(compiled_notice.interface),
    notice_address
  );
  // add item to the notice
  await notice.methods.addItem(1000, 1).send({from: accounts[0], gas: '1000000'});
  // update the notice pdf
  await notice.methods.addNoticePDF("new_hash", "new_link", 0, 0, 0).send({
    from: accounts[0],
    gas: '1000000'
  });

  [notice_item_address] = await notice.methods.getNoticeItems().call();

  notice_item = await new web3.eth.Contract(
    JSON.parse(compiled_item.interface),
    notice_item_address
  );
});

// tests done with the Notice Factory
describe('Notice Factory', () => {
  it('Deploys a full functioning contract', async () => {
    assert.ok(factory.options.address);
    assert.ok(notice.options.address);
    assert.ok(notice_item.options.address);
  });

  it('Anyone can request list of notice', async() => {
    try {
      let notices = await factory.methods.getNotices().call();
      assert(notices.length == 1);
    } catch (err) { assert(err); }
  });
});

// tests done with the Notice itself
describe('Notice usage', () => {
  it('Owner can\'t enter the Notice', async () => {
    try {
      await notice.methods.enterNotice().send({ from: accounts[0] });
      assert(false);
    } catch (err) { assert(err); }
  });

  it('Owner can update the state of notice', async() => {
    await notice.methods.updateStatus(4).send({ from: accounts[0], gas: '1000000'});
    let new_status = await notice.methods.notice_status().call();
    assert.equal("4", new_status);
  });

  it('Only owner can update the notice status', async() => {
    try {
      await notice.methods.updateStatus(4).send({ from: accounts[9], gas: '1000000'});
      new_status = await notice.methods.notice_status().call();
      assert.equal("4", new_status, "Outsider can update status");
      await notice.methods.enterNotice().send({ from: accounts[1], gas: '1000000'});
      await notice.methods.updateStatus(5).send({ from: accounts[1], gas: '1000000'});
      assert.equal("5", new_status, "Bidder can update status");
      assert(false);
    } catch (err) {
      assert(err);
    }
  });

  it('Others can enter the Notice only in summon notice status', async () => {
    await notice.methods.updateStatus(1).send({ from: accounts[0], gas: '1000000' });
    await notice.methods.enterNotice().send({ from: accounts[1], gas: '1000000' });
    let is_bidder = await notice.methods.bidders_mapping(accounts[1]).call();
    assert(is_bidder);
  });

  it('No one can join the notice if not in summon state', async () => {
    try {
      await notice.methods.updateStatus(2).send({ from: accounts[0], gas: '1000000' });
      await notice.methods.enterNotice().send({ from: accounts[1], gas: '1000000' });
      assert(false);
    } catch (err) {
      // console.log(err.results[err.hashes[0]].reason);
      assert(err);
    }
  });

  it('Bidder only leaves the notice at summon state', async() => {
    try {
      await notice.methods.enterNotice().send({ from: accounts[1], gas: '1000000'});
      let is_bidder = await notice.methods.bidders_mapping(accounts[1]).call();
      assert(is_bidder);
      await notice.methods.exitNotice().send({ from: accounts[1], gas: '1000000'});
      is_bidder = await notice.methods.bidders_mapping(accounts[1]).call();
      assert(!is_bidder);
      assert(false);
    } catch (err) {
      await notice.methods.updateStatus(1).send({from: accounts[0], gas: '1000000'});
      await notice.methods.enterNotice().send({ from: accounts[1], gas: '1000000'});
      let is_bidder = await notice.methods.bidders_mapping(accounts[1]).call();
      assert(is_bidder);
      await notice.methods.exitNotice().send({ from: accounts[1], gas: '1000000'});
      is_bidder = await notice.methods.bidders_mapping(accounts[1]).call();
      assert(!is_bidder);
      assert(err);
    }
  });

  it('Only bidders can bid', async () => {
    try {
      await notice.methods.makeBid(notice_item_address, 900).send({
        from: accounts[9], gas: '1000000'
      });
      assert(false);
    } catch (err) {
      //console.log(err.results[err.hashes[0]].reason);
      assert(err);
    }
  });

  it('If not the manager can\'t add item in notice.', async () => {
    try {
      await notice.methods.addItem(200).send({ from: accounts[9], gas: '1000000' })
      assert(false);
    } catch (err) {
      // console.log(err.results[err.hashes[0]].reason);
      assert(err);
    }
  });

  it('Owner can add one and only one item each call of addItem.', async () => {
    try {
      let before_items = await notice.methods.getNoticeItems().call();
      await notice.methods.addItem(200).send({ from: accounts[0], gas: '1000000' });
      let after_item_add_try = await notice.methods.getNoticeItems().call();

      assert (before_items.length == after_item_add_try.length-1);
    } catch (err) {
      assert(err);
    }
  });

  it('Strange can\'t update public notice info pdf and hash', async () => {
    try {
      await notice.methods.addNoticePDF("new_hash", "new_link", 0, 0, 0).send({
        from: accounts[9],
        gas: '1000000'
      });
      assert(false);
    } catch (err) {
      assert (err);
    }
  });

  it('Owner can update public notice info pdf and hash', async () => {
    try {
      await notice.methods.addNoticePDF("new_hash_2", "new_link_2", 0, 0, 0).send({
        from: accounts[1],
        gas: '1000000'
      });
      assert(true);
    } catch (err) {
      assert (err);
    }
  });

  it('Returns last notice infos (pdf link and hash)', async () => {
    let res = await notice.methods.getLastNoticeInfo().call();
    assert(res);
  });

  it('Returns notice info history by index - only in bound', async () => {
    try {
      await notice.methods.getNoticeHistoryByIndex(10).call();
      assert(false);
    } catch(err) {
      let res = await notice.methods.getNoticeHistoryByIndex(0).call();
      assert(res);
      assert(err);
    }
  });

  it('Return all bidders', async () => {
    await notice.methods.updateStatus("1").send({ from: accounts[0], gas: '1000000' });
    await notice.methods.enterNotice().send({ from: accounts[1], gas: '1000000' });
    await notice.methods.updateStatus("6").send({ from: accounts[0], gas: '1000000' });
    let res = await notice.methods.getBidders().call();
    // console.log(res);
    assert(res);
  });

  it('Return all notice items address', async () => {
    let res = await notice.methods.getNoticeItems().call();
    // console.log(res);
    assert(res);
  });

  it('Bidder can make an offer to an item, but outsiders can\'t', async () => {
    //notice_item_address
    //await notice.methods.makeBid(notice_item_address, )
    await notice.methods.updateStatus("1").send({from: accounts[0], gas: '1000000'});
    await notice.methods.enterNotice().send({from: accounts[1], gas: '1000000'});
    await notice.methods.updateStatus("2").send({from: accounts[0], gas: '1000000'});
    await notice.methods.makeBid(notice_item_address, 120, 1).send({from: accounts[1], gas:'1000000'});
    await notice.methods.makeBid(notice_item_address, 100, 1).send({from: accounts[1], gas:'1000000'});
    await notice.methods.updateStatus("6").send({from: accounts[0], gas: '1000000'});
    let res = await notice.methods.getBids(accounts[1]).call();
    // console.log(res);
    assert(res);
  });

  it('Return best bidder', async() => {
    await notice.methods.updateStatus("1").send({from: accounts[0], gas: '1000000'});
    await notice.methods.enterNotice().send({from: accounts[1], gas: '1000000'});
    await notice.methods.updateStatus("2").send({from: accounts[0], gas: '1000000'});
    await notice.methods.makeBid(notice_item_address, 120, 1).send({from: accounts[1], gas:'1000000'});
    await notice.methods.makeBid(notice_item_address, 100, 1).send({from: accounts[1], gas:'1000000'});
    await notice.methods.updateStatus("6").send({from: accounts[0], gas: '1000000'});
    let res = await notice.methods.getBestBidderItemByAddress(notice_item_address).call();
    // console.log(res);

    assert(res);
  })

  it('Don\'t return bidder address while in summon phase or public session', async() => {
    try {
      await notice.methods.updateStatus("1").send({from: accounts[0], gas: '1000000'});
      await notice.methods.enterNotice().send({from: accounts[1], gas: '1000000'});
      await notice.methods.updateStatus("2").send({from: accounts[0], gas: '1000000'});
      await notice.methods.makeBid(notice_item_address, 120, 1).send({from: accounts[1], gas:'1000000'});
      await notice.methods.getBestBidderItemByAddress(notice_item_address).call();

      assert(false);
    } catch(err) {
      console.log(err.results[err.hashes[0]].reason);
      assert(err);
    }
  })

  it('Return best value of given item address', async() => {
    await notice.methods.updateStatus("1").send({from: accounts[0], gas: '1000000'});
    await notice.methods.enterNotice().send({from: accounts[1], gas: '1000000'});
    await notice.methods.updateStatus("2").send({from: accounts[0], gas: '1000000'});
    await notice.methods.makeBid(notice_item_address, 120, 1).send({from: accounts[1], gas:'1000000'});
    await notice.methods.makeBid(notice_item_address, 100, 1).send({from: accounts[1], gas:'1000000'});
    await notice.methods.updateStatus("6").send({from: accounts[0], gas: '1000000'});
    let res = await notice.methods.getBestOfferByItemAddress(notice_item_address).call();
    // console.log(res);

    assert(res);
  });

  it('Return reference value of given item address', async() => {
    let res = await notice.methods.getRefValueByAddress(notice_item_address).call();
    // console.log(res);

    assert(res);
  });
});
