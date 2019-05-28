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
let i_blocknumber;

//beforeEach(async () => {
before(async () => {
  // get a list of all accounts
  accounts = await web3.eth.getAccounts();

  // deploy new version of contract
  factory = await new web3.eth.Contract(JSON.parse(compiled_factory.interface)).deploy({ data: compiled_factory.bytecode }).send({ from: accounts[0], gas: '6500000' });
  // let res = await factory.methods.getBlockNumber().call();
  // console.log(res);
  // console.log(factory.options.address);
  // uses the methods to deploy a new contract
  await factory.methods.addNotice(accounts[0]).send({from: accounts[0], gas: '6000000' });
  // res = await factory.methods.getBlockNumber().call();
  // console.log(res);
  // saves in variable the address of notice deployd previously
  [notice_address] = await factory.methods.getNotices().call();

  notice = await new web3.eth.Contract(
    JSON.parse(compiled_notice.interface),
    notice_address
  );

  // update the notice pdf
  await notice.methods.addNoticePDF("new_hash", "new_link").send({
    from: accounts[0],
    gas: '6000000'
  });

  // res = await factory.methods.getBlockNumber().call();
  // console.log(res);
  // add item to the notice
  await notice.methods.addItem(1000, 1).send({from: accounts[0], gas: '6000000'});
  // res = await factory.methods.getBlockNumber().call();
  // console.log(res);

  i_blocknumber = await factory.methods.getBlockNumber().call();
  console.log("\nbeforeEach loop: " + i_blocknumber + "\n");
  // config blocks intervals
  await notice.methods.configBlocksIntervals(160, 12, 10, 5, 5).send({
    from: accounts[0],
    gas: '6000000'
  });

  // start notice
  await notice.methods.startNotice().send({
    from: accounts[0],
    gas: '6000000'
  });

  [notice_item_address] = await notice.methods.getNoticeItems().call();

  notice_item = await new web3.eth.Contract(
    JSON.parse(compiled_item.interface),
    notice_item_address
  );
  // account 1 already enter the notice
  //await notice.methods.enterNotice().send({ from: accounts[1], gas: '6000000'});
});

// tests done with the Notice Factory
describe('Notice Factory', () => {
  it('Deploys a full functioning contract', async () => {
    assert.ok(factory.options.address);
    assert.ok(notice.options.address);
    assert.ok(notice_item.options.address);
    let publish_bn = await notice.methods.i_publish_bn().call();
    let open_session = await notice.methods.i_open_session_bn().call();
    let start_eminent = await notice.methods.i_start_eminent_bn().call();
    let end_notice = await notice.methods.i_end_notice().call();
    console.log("publish notice at bn " + publish_bn);
    console.log("public session open at bn " + open_session);
    console.log("start eminent closure at bn " + start_eminent);
    console.log("end notice at bn " + end_notice);
  });

  it('Anyone can request list of notice', async() => {
    try {
      let notices = await factory.methods.getNotices().call();
      assert(notices.length == 1);
    } catch (err) { assert(err); }
    // i_blocknumber = await factory.methods.getBlockNumber().call();
    // console.log(i_blocknumber);
  });
});

// test all notice roles

describe('Notice usage before publish blocknumber by seller (bidder)', () => {
  it('', async() => {
  	try {
  		await notice.addNoticePDF("i_s_pdf", "i_s_link").send({from: accounts[1], gas: '6000000'});
  		assert(false);
  	} catch(err) { assert(err); }
  });

  it('', async() => {
  	try {
  		await notice.configBlocksIntervals(0, 1, 1, 1, 1).send({from: accounts[1], gas: '6000000'});
  		assert(false);
  	} catch(err) { assert(err); }
  });

  it('', async() => {
  	try {
  		await notice.addItem(2, 1000).send({from: accounts[1], gas: '6000000'});
  		assert(false);
  	} catch(err) { assert(err); }
  });

  it('', async() => {
  	try {
  		await notice.setBlockExtension(10).send({from: accounts[1], gas: '6000000'});
  		assert(false);
  	} catch(err) { assert(err); }
  });

  it('', async() => {
  	try {
  		await notice.startNotice().send({from: accounts[1], gas: '6000000'});
  		assert(false);
  	} catch(err) { assert(err); }
  });

  it('', async() => {
  	try {
  		await notice.suspendNotice().send({from: accounts[1], gas: '6000000'});
  		assert(false);
  	} catch(err) { assert(err); }
  });

  it('', async() => {
  	try {
  		await notice.returnNotice().send({from: accounts[1], gas: '6000000'});
  		assert(false);
  	} catch(err) { assert(err); }
  });

  it('', async() => {
  	try {
  		await notice.enterNotice().send({from: accounts[1], gas: '6000000'});
  		assert(false);
  	} catch(err) { assert(err); }
  });

  it('', async() => {
  	try {
  		await notice.exitNotice().send({from: accounts[1], gas: '6000000'});
  		assert(false);
  	} catch(err) { assert(err); }
  });

  it('', async() => {
  	try {
  		await notice.makeBid(notice_item_addres, 100).send({from: accounts[1], gas: '6000000'});
  		assert(false);
  	} catch(err) { assert(err); }
  });

  it('', async() => {
  	try {
  		await notice.getLastNoticeInfo().send({from: accounts[1], gas: '6000000'});
  		assert(false);
  	} catch(err) { assert(err); }
  });

  it('', async() => {
  	try {
  		await notice.getNoticeHistoryByIndex(0).send({from: accounts[1], gas: '6000000'});
  		assert(false);
  	} catch(err) { assert(err); }
  });

  it('', async() => {
  	try {
  		await notice.getNoticePDFHistoryLength().send({from: accounts[1], gas: '6000000'});
  		assert(false);
  	} catch(err) { assert(err); }
  });

  it('', async() => {
  	try {
  		await notice.getBidders().send({from: accounts[1], gas: '6000000'});
  		assert(false);
  	} catch(err) { assert(err); }
  });

  it('', async() => {
  	try {
  		await notice.getNoticeItems().send({from: accounts[1], gas: '6000000'});
  		assert(false);
  	} catch(err) { assert(err); }
  });

  it('', async() => {
  	try {
  		await notice.returnEminentStatus().send({from: accounts[1], gas: '6000000'});
  		assert(false);
  	} catch(err) { assert(err); }
  });

  it('', async() => {
  	try {
  		await notice.getBids(accounts[1]).send({from: accounts[1], gas: '6000000'});
  		assert(false);
  	} catch(err) { assert(err); }
  });

  it('', async() => {
  	try {
  		await notice.getBids(accounts[9]).send({from: accounts[1], gas: '6000000'});
  		assert(false);
  	} catch(err) { assert(err); }
  });

  it('', async() => {
  	try {
  		await notice.getBestBidderItemByAddress(notice_item_address).send({from: accounts[1], gas: '6000000'});
  		assert(false);
  	} catch(err) { assert(err); }
  });

  it('', async() => {
  	try {
  		await notice.getBiddersItemArray(notice_item_address).send({from: accounts[1], gas: '6000000'});
  		assert(false);
  	} catch(err) { assert(err); }
  });

  it('', async() => {
  	try {
  		await notice.getBestOffersItemArray(notice_item_address).send({from: accounts[1], gas: '6000000'});
  		assert(false);
  	} catch(err) { assert(err); }
  });

  it('', async() => {
  	try {
  		await notice.getBestOfferByItemAddress(notice_item_address).send({from: accounts[1], gas: '6000000'});
  		assert(false);
  	} catch(err) { assert(err); }
  });

  it('', async() => {
  	try {
  		await notice.getRefValueByAddress(notice_item_address).send({from: accounts[1], gas: '6000000'});
  		assert(false);
  	} catch(err) { assert(err); }
  });

  it('', async() => {
  	try {
  		await notice_item.tryBid(accounts[1], 100, 100).send({from: accounts[1], gas: '6000000'});
  		assert(false);
  	} catch(err) { assert(err); }
  });

  it('', async() => {
  	try {
  		await notice_item.getBestBidder(0).send({from: accounts[1], gas: '6000000'});
  		assert(false);
  	} catch(err) { assert(err); }
  });

  it('', async() => {
  	try {
  		await notice_item.getBestOffer().send({from: accounts[1], gas: '6000000'});
  		assert(false);
  	} catch(err) { assert(err); }
  });

  it('', async() => {
  	try {
  		await notice_item.getRefValue().send({from: accounts[1], gas: '6000000'});
  		assert(false);
  	} catch(err) { assert(err); }
  });

  it('', async() => {
  	try {
  		await notice_item.getAllBestOffers().send({from: accounts[1], gas: '6000000'});
  		assert(false);
  	} catch(err) { assert(err); }
  });

  it('', async() => {
  	try {
  		await notice_item.getAllbn().send({from: accounts[1], gas: '6000000'});
  		assert(false);
  	} catch(err) { assert(err); }
  });

  it('', async() => {
  	try {
  		await notice_item.getAllBestBidders().send({from: accounts[1], gas: '6000000'});
  		assert(false);
  	} catch(err) { assert(err); }
  });

  it('', async () => {
    i_blocknumber = await factory.methods.getBlockNumber().call();
    console.log(i_blocknumber);
  });
});
//
// describe('Notice usage after publish blocknumber and before public open session', () => {
//
// });
//
// describe('Notice usage after ')
//
//
// // tests done with the Notice itself
// describe('Notice usage', () => {
//   it('Owner can\'t enter the Notice', async () => {
//     try {
//       await notice.methods.enterNotice().send({from: accounts[0]});
//       assert(false);
//     } catch (err) { assert(err); }
//     // i_blocknumber = await factory.methods.getBlockNumber().call();
//     // console.log(i_blocknumber);
//   });
//
//   it('Cannot enter in notice before summon status', async() => {
//     try {
//       let is_bidder = await notice.methods.bidders_mapping(accounts[1]).call();
//       assert(is_bidder);
//       assert(false);
//     } catch (err) {
//       assert(err);
//     }
//     // i_blocknumber = await factory.methods.getBlockNumber().call();
//     // console.log(i_blocknumber);
//   });
//
//   it('Others can\'t update notice status', async() => {
//     try {
//       await notice.methods.updateStatus().send({
//         from: accounts[1], gas: '1000000'
//       });
//       assert(false);
//     } catch (err) {
//       assert(err);
//     }
//       // i_blocknumber = await factory.methods.getBlockNumber().call();
//       // console.log(i_blocknumber);
//   });
//
//   it('Others can\'t add notices pdfs references', async() => {
//     try {
//       await notice.methods.addNoticePDF("fake_pdf", "fake_link").send({
//         from: accounts[9], gas: '1000000'
//       });
//       assert(false);
//     } catch(err) {
//       assert(err);
//       // console.log(err.results[err.hashes[0]].reason);
//     }
//       // i_blocknumber = await factory.methods.getBlockNumber().call();
//       // console.log(i_blocknumber);
//   });
//
//   it('Others can\'t config internal blocks intervals', async() => {
//     // i_blocknumber = await factory.methods.getBlockNumber().call();
//     // console.log(i_blocknumber);
//     try {
//       await notice.methods.configBlocksIntervals(0, 1, 2, 3, 4).send({
//         from: accounts[1], gas: '1000000'
//       });
//       assert(false);
//     } catch(err) {
//       assert(err);
//     }
//   });
//
//   it('Others can\'t add item to notice', async() => {
//     try {
//       await notice.methods.addItem(99, 9999).send({
//         from: accounts[1], gas: '1000000'
//       });
//       assert(false);
//     } catch(err) {
//       assert(err);
//     }
//       // i_blocknumber = await factory.methods.getBlockNumber().call();
//       // console.log(i_blocknumber);
//   });
//
//   it('Owner can\'t enter the Notice', async () => {
//     try {
//       await notice.methods.enterNotice().send({from: accounts[0]});
//       assert(false);
//     } catch (err) { assert(err); }
//     // i_blocknumber = await factory.methods.getBlockNumber().call();
//     // console.log(i_blocknumber);
//   });
//
//   it('Cannot enter in notice before summon status', async() => {
//     try {
//       let is_bidder = await notice.methods.bidders_mapping(accounts[1]).call();
//       assert(is_bidder);
//       assert(false);
//     } catch (err) {
//       assert(err);
//     }
//     // i_blocknumber = await factory.methods.getBlockNumber().call();
//     // console.log(i_blocknumber);
//   });
//
//   it('Owner can\'t update notice status', async() => {
//     try {
//       await notice.methods.updateStatus().send({
//         from: accounts[0], gas: '1000000'
//       });
//       assert(false);
//     } catch (err) {
//       assert(err);
//     }
//       // i_blocknumber = await factory.methods.getBlockNumber().call();
//       // console.log(i_blocknumber);
//   });
//
//   it('Owner can\'t add notices pdfs references', async() => {
//     try {
//       await notice.methods.addNoticePDF("fake_pdf", "fake_link").send({
//         from: accounts[0], gas: '1000000'
//       });
//       assert(false);
//     } catch(err) {
//       assert(err);
//       // console.log(err.results[err.hashes[0]].reason);
//     }
//       // i_blocknumber = await factory.methods.getBlockNumber().call();
//       // console.log(i_blocknumber);
//   });
//
//   it('Owner can\'t config internal blocks intervals', async() => {
//     // i_blocknumber = await factory.methods.getBlockNumber().call();
//     // console.log(i_blocknumber);
//     try {
//       await notice.methods.configBlocksIntervals(0, 1, 2, 3, 4).send({
//         from: accounts[0], gas: '1000000'
//       });
//       assert(false);
//     } catch(err) {
//       assert(err);
//     }
//   });
//
//   it('Owner can\'t add item to notice', async() => {
//     try {
//       await notice.methods.addItem(99, 9999).send({
//         from: accounts[0], gas: '1000000'
//       });
//       assert(false);
//     } catch(err) {
//       assert(err);
//     }
//       // i_blocknumber = await factory.methods.getBlockNumber().call();
//       // console.log(i_blocknumber);
//   });
//
//   it('Outsiders can\'t bid', async() => {
//     // i_blocknumber = await factory.methods.getBlockNumber().call();
//     // console.log(i_blocknumber);
//     try {
//       await notice.methods.makeBid(notice_item_address, 900).send( {
//         from: accounts[1], gas: '6000000'
//       });
//       assert(false);
//     } catch (err) {
//       i_blocknumber = await factory.methods.getBlockNumber().call();
//       assert(err);
//     }
//   });
//
//   it('Outsiders can enter the notice', async() => {
//     // i_blocknumber = await factory.methods.getBlockNumber().call();
//     // console.log(i_blocknumber);
//     try {
//       await notice.methods.enterNotice().send({ from: accounts[1], gas: '6000000'});
//       let is_bidder = await notice.methods.bidders_mapping(accounts[1]).call();
//       assert(is_bidder);
//     } catch (err) {
//       assert(err);
//     }
//   });
//
//   it('Sellers can exit before public session', async() => {
//     await notice.methods.exitNotice().send({ from: accounts[1], gas: '1000000'});
//     let is_bidder = await notice.methods.bidders_mapping(accounts[1]).call();
//     assert(is_bidder == false);
//     // i_blocknumber = await factory.methods.getBlockNumber().call();
//     // console.log(i_blocknumber);
//   });
//
//   it('Outsiders can\'t bid', async () => {
//     try {
//       await notice.methods.makeBid(notice_item_address, 100).send({
//         from: accounts[9], gas: '6000000'
//       });
//       assert(false);
//     } catch (err) {
//       // console.log(err.results[err.hashes[0]].reason);
//       assert(err);
//     }
//     // i_blocknumber = await factory.methods.getBlockNumber().call();
//     // console.log(i_blocknumber);
//   });
//
//   it('Sellers can bid', async() => {
//     await notice.methods.enterNotice().send({
//       from: accounts[2],
//       gas: '1000000'
//     });
//     let is_bidder = await notice.methods.bidders_mapping(accounts[2]).call();
//     if (is_bidder) {
//       await notice.methods.makeBid(notice_item_address, 100).send({
//         from: accounts[2],
//         gas: '1000000'
//       });
//     }
//   });
//
//   it('More than one can enter the notice', async () => {
//     await notice.methods.enterNotice().send({
//       from: accounts[3],
//       gas: '1000000'
//     });
//     let is_bidder = await notice.methods.bidders_mapping(accounts[3]).call();
//     assert(is_bidder);
//     await notice.methods.enterNotice().send({
//       from: accounts[4],
//       gas: '1000000'
//     });
//     is_bidder = await notice.methods.bidders_mapping(accounts[4]).call();
//     assert(is_bidder);
//   });
//
//   it('After public session has been opened no one can leave the reverse auction', async() => {
//     try {
//       await notice.methods.exitNotice().send({
//         from: accounts[4],
//         gas: '1000000'
//       });
//       assert(false);
//     } catch(err) {
//       assert(err);
//     }
//
//     let is_bidder = await notice.methods.bidders_mapping(accounts[4]).call();
//     assert(is_bidder);
//   });
//
//   it('', async () => {
//     i_blocknumber = await factory.methods.getBlockNumber().call();
//     console.log(i_blocknumber);
//   });
//
// });
