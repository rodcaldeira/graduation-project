var NoticeFactory = artifacts.require('./NoticeFactory');
var Notice = artifacts.require('./Notice');
var NoticeItem = artifacts.require('./NoticeItem');

let factory_instance;
let notice_instance;
let notice_item_instance;
let notices;

contract("NoticeFactory", async accounts => {

  let buyer = accounts[0];
  let seller_one = accounts[1];
  let seller_two = accounts[2];
  let outsider = accounts[9];

  console.log("buyer", buyer);
  before(async () => {
    factory_instance = await NoticeFactory.deployed();

    await factory_instance.addNotice.sendTransaction(buyer, {
      from: buyer
    });

    notices = await factory_instance.getNotices.call();
    notice_instance = await Notice.at(notices[0]);
    assert.equal(notice_instance.address, notices[0], "Not the same address");

    await notice_instance.addNoticePDF.sendTransaction("buyer", {
      from: buyer
    });

    // await notice_instance.methods.addNoticePDF("a1b2c3").send({
    //   from: buyer,
    //   gas: '6000000'
    // });

    await notice_instance.addItem.sendTransaction(1, 10000, {
      from: buyer
    });

    await notice_instance.configBlockIntervals.sendTransaction(3, 10, 10, 5, 2, {
      from: buyer
    });

    let notice_items = await notice_instance.getItems.call();
    notice_item_instance = await NoticeItem.at(notice_items[0]);
  });

  it('should deploy a notice instance', async () => {
    assert.notEqual(factory_instance.address, 'undefined', "Factory not deployed");
    assert.notEqual(notice_instance.address, 'undefined', "Notice not deployed");
    // assert.notEqual(notice_item_instance.address, 'undefined', "Notice Item not deployed");
  })
  // it('should have notice instance', async () => {

  //   notice_instance = await Notice.deployed();
  //   assert.isTrue(true);
  //   console.log(notice_instance);
  // })

  it("should assert true", async () => {
    // factory_instance = NoticeFactory.deployed();
    assert.isTrue(true);
    // console.log(factory_instance.addNotice.sendTransaction());
  });
});