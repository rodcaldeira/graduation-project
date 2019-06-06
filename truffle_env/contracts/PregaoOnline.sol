// pragma solidity ^0.5.0;


// contract PregaoOnline {
//   constructor() public {
//   }
// }

pragma solidity >= 0.4.22 < 0.6.0;

contract NoticeFactory {
  address factory_owner;
  address[] notices;
  uint dummy;

  modifier onlyFactoryOwner() {
    require(msg.sender == factory_owner, "You can't deploy a Notice.");
    _;
  }

  function addNotice(address _buyer) public onlyFactoryOwner {
    Notice n = new Notice(_buyer);
    notices.push(address(n));
  }

  function getNotices() public view returns(address[] memory) {
    return notices;
  }

  function dummyFunction() public {
    dummy += 1;
  }

  function getBlockNumber() public view returns(uint) {
    return block.number;
  }
}

contract Notice {
  enum QuestionStatus {OPEN, REJECTED, DEFERRED }
  enum NoticeStatus {CONFIG, RUNNING, SUSPENDED, CANCELED }

  // questions struct
  struct Question {
    string[] ipsf_questions;
    string[] ipsf_answer;
    QuestionStatus status;
  }


  // bidders struct
  struct Bidder {
    address[] item;
    uint[] value;
    uint[] bn;
    uint[] status_bid;
    bool able;
  }

  // general info needed to open a new Notice
  address notice_owner; // factory address
  mapping(address => bool) buyers; // buyers mapping

  string[] ipsf_hash; // pdf hash


  address[] bidders; // bidders address
  mapping(address => Bidder) public bidders_mapping; // bidders mapping

  address[] public notice_items; // address list of itens in the notice
  mapping(address => bool) notice_items_mapping; // notice item mapping

  // controlling variables
  uint[] publish_bn; // notice start time
  uint[] opening_bn; // bn of public session opening
  uint[] ending_bn; // bn to end the open session
  uint[] iminent_bn; // iminent time to end the ending notice

  uint public i_publish_bn;
  uint public i_open_session_bn;
  uint public i_start_eminent_bn;
  uint public i_end_notice;
  uint public i_open_to_eminent;
  uint blocks_extensions;

  uint i_suspension_init;

  NoticeStatus noticeStatus;
  NoticeStatus[] noticeStatusHistory;

  // modifiers
  modifier onlyNoticeOwner() {
    require(msg.sender == notice_owner || buyers[msg.sender] == true, "Only the Notice owner can use this function");
    _;
  }
  modifier onlyBidders() {
    require(bidders_mapping[msg.sender].able == true, "Only bidders can use this function");
    _;
  }

  modifier notSuspended() {
    require(noticeStatus != NoticeStatus.SUSPENDED, "This contract is suspended by now!");
    _;
  }

  modifier notCanceled() {
    require(noticeStatus != NoticeStatus.CANCELED, "This reverse auction has been canceled!");
    _;
  }

  modifier atConfigState() {
    require(noticeStatus == NoticeStatus.CONFIG, "You cannot change this notice at this moment. Suspend it first!");
    _;
  }

  modifier afterPublish() {
    require(block.number >= i_publish_bn, "You can only use this method after notice is publish.");
    _;
  }

  modifier atPublicSummon() {
    require(block.number >= i_publish_bn && block.number < i_open_session_bn, "You can only do this when in Public Summon.");
    _;
  }

  modifier atOpenSession() {
    require(block.number >= i_open_session_bn && block.number < i_end_notice, "You can only do this when in Open Session");
    _;
  }

  modifier openToBid() {
    require(block.number >= i_publish_bn && block.number < i_end_notice, "You can only bid while in Publish Summon or in Open Session");
    _;
  }

  modifier afterOpen() {
    require(block.number >= i_open_session_bn, "You can only access this information after the session has been opened.");
    _;
  }
  modifier ended() {
    require(block.number > i_end_notice, "The notice must end before you can use this method");
    _;
  }

  // events

  event NewNoticePDF(address _from, string _ipsf);
  event UpdateNotice(address _from, NoticeStatus status);
  event NewBid(address _from, address _item, uint _value, uint _res);

  constructor(address _buyer) public payable {
    notice_owner = msg.sender;
    buyers[_buyer] = true;
    noticeStatus = NoticeStatus.CONFIG;
    i_suspension_init = 0;
    noticeStatusHistory.push(noticeStatus);
  }

  /*
    Configuration functions
  */

  // add notices pdfs
  function addNoticePDF(string memory pdf_hash) public onlyNoticeOwner() atConfigState() {
    ipsf_hash.push(pdf_hash);
    emit NewNoticePDF(msg.sender, pdf_hash);
  }

  function configBlocksIntervals(uint publish, uint opening, uint start_eminent, uint end, uint extension) public atConfigState onlyNoticeOwner {
    require(ipsf_hash.length > 0, "Add pdf as reference before configure.");
    require(publish >= 0, "Publish interval invalid.");
    require(opening > 0, "Opening interval invalid.");
    require(start_eminent > 0, "Ending interval invalid.");
    require(end > 0, "Eminent interval invalid.");
    require(extension >= 0, "Extension value invalid.");
    publish_bn.push(publish);
    opening_bn.push(opening);
    ending_bn.push(start_eminent);
    iminent_bn.push(end);
    i_publish_bn = publish;
    i_open_session_bn = i_publish_bn + opening;
    i_start_eminent_bn = i_open_session_bn + start_eminent;
    i_end_notice = i_start_eminent_bn + end;
    i_open_to_eminent = start_eminent + opening;
    blocks_extensions = extension;
  }


  // add item to notice
  function addItem(uint value, uint ref) public atConfigState() onlyNoticeOwner() returns(address newItem) {
    require(ipsf_hash.length > 0, "Add pdf as reference before.");
    NoticeItem new_item = new NoticeItem(value, ref);
    notice_items.push(address(new_item));
    notice_items_mapping[address(new_item)] = true;
    return address(new_item);
  }


  // force end
  /* function endNotice(uint bn) public notSuspended() notCanceled() onlyNoticeOwner() {
    iminent_bn.push(ending_bn[ending_bn.length-1] + bn);
  } */

  // set blocks extensions for every new bid
  function setBlockExtension(uint extension) public atConfigState() onlyNoticeOwner() {
    require(extension > 0, "Invalid extension value!");
    blocks_extensions = extension;
  }

  // add blocks to notices limit
  function addBlocksLimit() private {
    require(block.number < i_start_eminent_bn);
    if (i_start_eminent_bn + blocks_extensions < block.number + i_open_to_eminent) {
      i_start_eminent_bn += blocks_extensions;
      i_end_notice += blocks_extensions;
    } else {
      i_start_eminent_bn = block.number + i_open_to_eminent;
      i_end_notice = block.number + i_open_to_eminent;
    }
  }

  // change notice status
  function updateStatus(NoticeStatus status) public onlyNoticeOwner() {
    noticeStatusHistory.push(noticeStatus);
    noticeStatus = status;
    emit UpdateNotice(msg.sender, status);
  }

  /*
  Buyer operation functions
  */

  function startNotice() public onlyNoticeOwner() {
    require(noticeStatus == NoticeStatus.CONFIG, "Already running.");
    require(i_suspension_init == 0, "You can only resume.");
    i_publish_bn += block.number;
    i_open_session_bn += block.number;
    i_start_eminent_bn += block.number;
    i_end_notice += block.number;
    updateStatus(NoticeStatus.RUNNING);
  }

  function suspendNotice() public afterPublish() onlyNoticeOwner() {
    require(noticeStatus != NoticeStatus.SUSPENDED, "Already suspended");
    i_suspension_init = block.number;
    updateStatus(NoticeStatus.SUSPENDED);
  }

  function returnNotice() public afterPublish() onlyNoticeOwner() {
    uint increment = block.number - i_suspension_init;
    i_publish_bn += increment;
    i_open_session_bn += increment;
    i_start_eminent_bn += increment;
    i_end_notice += increment;
    updateStatus(NoticeStatus.RUNNING);
  }

  /*
  Bidders functions
  */

  // function to bidder enter the notice
  function enterNotice() public notSuspended() atPublicSummon() {
    require(msg.sender != notice_owner, "Owner can\'t enter.");
    require(bidders_mapping[msg.sender].able == false, "You already in.");
    require(noticeStatus == NoticeStatus.RUNNING, "You can\'t enter now.");
    bidders_mapping[msg.sender].able = true;
    bidders.push(msg.sender);
  }

  // Bidder exit notice, only before public session opening.
  function exitNotice() public onlyBidders() atPublicSummon() {
    bidders_mapping[msg.sender].able = false;
  }


  // make bid and add blocks to notice end
  function makeBid(address notice_item, uint offer) public notSuspended() notCanceled() onlyBidders() openToBid() {
    require(notice_items_mapping[notice_item] == true, "This is not a notice item");
    require(noticeStatus == NoticeStatus.RUNNING, "You can\'t bid now.");
    NoticeItem deployed_contract;
    deployed_contract = NoticeItem(notice_item);

    uint resp = deployed_contract.tryBid(msg.sender, offer, block.number);

    bidders_mapping[msg.sender].item.push(notice_item);
    bidders_mapping[msg.sender].value.push(offer);
    bidders_mapping[msg.sender].bn.push(block.number);
    bidders_mapping[msg.sender].status_bid.push(resp);

    emit NewBid(msg.sender, notice_item, offer, resp);
    if (resp <= 2) { // only add blocks to notice limits when the item notice offer is updated
      addBlocksLimit();
    }
  }

  /*
  Views of the notice
  */

  // returns most recent pdf info link and hash to verify proof
  function getLastNoticeInfo() public view returns(string memory ipsf) {
    require(msg.sender == notice_owner || block.number >= i_publish_bn, "You cannot use this function before publish.");
    require(ipsf_hash.length > 0, "There is no info disponible");
    return (ipsf_hash[ipsf_hash.length - 1]);
  }

  // returns any link and hash by index in history
  function getNoticeHistoryByIndex(uint i) public view returns(string memory ipsf) {
    require(msg.sender == notice_owner || block.number >= i_publish_bn, "You cannot use this function before publish.");
    require(ipsf_hash.length > 0, "There is no info disponible");
    require(i < ipsf_hash.length, "Index out of range");
    return (ipsf_hash[i]);
  }

  function getNoticePDFHistoryLength() public view returns(uint) {
    require(msg.sender == notice_owner || block.number >= i_publish_bn, "You cannot use this function before publish.");
    require(ipsf_hash.length > 0, "There is no info disponible");
    return ipsf_hash.length;
  }

  function getBidders() public view ended() returns(address[] memory) {
    return bidders;
  }

  function getNoticeItems() public view afterPublish() returns(address[] memory) {
    return notice_items;
  }

  function returnEminentStatus() public view onlyNoticeOwner() returns(bool status) {
    if (block.number >= i_start_eminent_bn && block.number < i_end_notice) {
      return true;
    } else {
      return false;
    }
  }

  // return bids of a given bidder
  function getBids(address bidder)
    public view ended()
    returns(address[] memory notice_item_list, uint[] memory notice_item_offer, uint[] memory notice_offer_ts, uint[] memory notice_offer_status)
  {
    return (bidders_mapping[bidder].item, bidders_mapping[bidder].value,
      bidders_mapping[bidder].bn, bidders_mapping[bidder].status_bid);
  }

  // get best bidder by any item
  function getBestBidderItemByAddress(address item_address) public view notSuspended() ended() returns(address bidder) {
    NoticeItem deployed_contract;
    deployed_contract = NoticeItem(item_address);
    return deployed_contract.getBestBidder(i_end_notice);
  }

  // returns the array with all bidders to the item
  function getBiddersItemArray(address item_address) public view notSuspended() ended() returns(address[] memory bidders_array) {
    NoticeItem deployed_contract;
    deployed_contract = NoticeItem(item_address);
    return deployed_contract.getAllBestBidders();
  }

  function getBestOffersItemArray(address item_address) public view notSuspended() afterOpen() returns(uint[] memory best_offer_array) {
    NoticeItem deployed_contract;
    deployed_contract = NoticeItem(item_address);
    return deployed_contract.getAllBestOffers();
  }

  /* function getBestOfferByItemAddress(address item_address) public afterOpen() view returns (uint best_offer) { */
  function getBestOfferByItemAddress(address item_address) public view returns(uint best_offer) {
    NoticeItem deployed_contract;
    deployed_contract = NoticeItem(item_address);
    return deployed_contract.getBestOffer();
  }

  // get max value of given item address
  function getRefValueByAddress(address item_address) public view returns(uint ref_value) {
    NoticeItem deployed_contract;
    deployed_contract = NoticeItem(item_address);
    return deployed_contract.getRefValue();
  }
}

contract NoticeItem {
  // TODO: add any reference to notice pdf item
  address notice; // refence to the notice it belongs
  uint public ref_item_notice; // item reference notice
  uint public ref_value; // max value of this item
  uint[] public best_offer; // best offer until now
  uint[] public blocknumber; // bn of the best offer
  address[] private best_bidder_address; // address of best bidder

  modifier onlyNotice() {
    require(msg.sender == notice, "Only notice can interact with this method");
    _;
  }

  constructor(uint notice_value, uint ref_item) public payable {
    notice = msg.sender;
    ref_value = notice_value;
    ref_item_notice = ref_item;
  }

  function tryBid(address bidder, uint offer, uint bid_bn) public onlyNotice returns(uint bid_status) {
    uint res;
    if (offer < ref_value) {
      res = 0;
    } else {
      res = 1;
    }
    if (best_offer.length == 0 || offer < best_offer[best_offer.length - 1]) {
      best_offer.push(offer);
      best_bidder_address.push(bidder);
      blocknumber.push(bid_bn);
      return res + 1;
    } else {
      return res + 3;
    }
  }

  function getBestBidder(uint bn_notice_end) public onlyNotice view returns(address bidder_address) {
    require(bn_notice_end < block.number, "The best bidder can only be shown after the public session end.");
    return best_bidder_address[best_bidder_address.length - 1];
  }

  function getBestOffer() public view returns(uint offer) {
    return best_offer[best_offer.length - 1];
  }

  function getRefValue() public view returns(uint ref) {
    return ref_value;
  }

  function getAllBestOffers() public onlyNotice view returns(uint[] memory best_offer_array) {
    return best_offer;
  }

  function getAllbn() public onlyNotice view returns(uint[] memory offer_bn_array) {
    return blocknumber;
  }

  function getAllBestBidders() public onlyNotice view returns(address[] memory best_bidders_array) {
    return best_bidder_address;
  }
}