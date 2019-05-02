pragma solidity >=0.4.22 <0.6.0;

contract NoticeFactory {
  address factory_owner;
  address[] notices;

  constructor() public {
    factory_owner = msg.sender;
  }

  modifier onlyFactoryOwner() { require(msg.sender == factory_owner, "You can't deploy a Notice."); _; }

  function addNotice(address _crier, uint publish, uint opening, uint ending, string memory pdf_hash, string memory pdf_link) public onlyFactoryOwner {
    Notice n = new Notice(_crier, publish, opening, ending, pdf_hash, pdf_link);
    notices.push(address(n));
  }

  function getNotices() public view returns (address[] memory) {
    return notices;
  }
}

contract Notice {
  // bidders struct
  struct Bidder {
    address[] item;
    uint[] value;
    uint[] timestamp;
    uint[] status_bid;
    bool able;
  }

  // general info needed to open a new Notice
  address notice_owner;                                 // factory address
  mapping (address => bool) criers;                     // criers mapping

  string[] hash_pdf;                                    // pdf hash
  string[] link_pdf;                                    // pdf link

  address[] bidders;                                    // bidders address
  mapping(address => Bidder) public bidders_mapping;    // bidders mapping

  address[] public notice_items;                        // address list of itens in the notice
  mapping(address => bool) notice_items_mapping;        // notice item mapping

  // controlling variables
  uint[] publish_timestamp;                             // notice start time
  uint[] opening_timestamp;                             // timestamp of public session opening
  uint[] ending_timestamp;                              // timestamp to end the open session
  uint[] iminent_timestamp;                             // iminent time to end the ending notice

  // 0 - deployed | 1 - public summon | 2 - public session opened
  // 3 - suspended | 4 - canceled
  // 5 - public session ended | 6 - notice ended
  uint16 public notice_status;

  modifier onlyNoticeOwner() { require(msg.sender == notice_owner || criers[msg.sender] == true, "Only the Notice owner can use this function"); _; }
  modifier onlyBidders() { require(bidders_mapping[msg.sender].able == true, "Only bidders can use this function"); _; }
  modifier notSuspended() { require(notice_status != 3, "This contract is suspended by now!"); _; }

  constructor(address _crier, uint publish, uint opening,
            uint ending, string memory pdf_hash, string memory pdf_link) public payable {
    notice_owner = msg.sender;
    criers[_crier] = true;
    publish_timestamp.push(publish);
    opening_timestamp.push(opening);
    ending_timestamp.push(ending);
    hash_pdf.push(pdf_hash);
    link_pdf.push(pdf_link);
    notice_status = 0;
  }

  /*
    Owner functions
  */

  // add notices pdfs
  function addNoticePDF(string memory hash, string memory link, uint opening, uint publish, uint ending) public onlyNoticeOwner() {
    hash_pdf.push(hash);
    link_pdf.push(link);
    publish_timestamp.push(publish);
    opening_timestamp.push(opening);
    ending_timestamp.push(ending);
  }

  // add item to notice
  function addItem(uint value, uint ref) public onlyNoticeOwner returns(address newItem) {
    require(notice_status == 0, "You can only add items before public summoning.");
    NoticeItem new_item = new NoticeItem(value, ref);
    notice_items.push(address(new_item));
    notice_items_mapping[address(new_item)] = true;
    return address(new_item);
  }

  // set ending time for notice
  function endNotice(uint timestamp) public notSuspended() onlyNoticeOwner() {
    iminent_timestamp.push(ending_timestamp[ending_timestamp.length-1] + timestamp);
  }

  // change notice status
  function updateStatus(uint8 status) public onlyNoticeOwner() {
    notice_status = status;
  }

  /*
  Bidders functions
  */

  // function to bidder enter the notice
  function enterNotice() public notSuspended() {
    require(msg.sender != notice_owner, "You cannot enter this Notice. You are the crier.");
    require(bidders_mapping[msg.sender].able == false, "You already in this Notice.");
    require(notice_status == 1, "New bidders are only possible before the public session.");
    bidders_mapping[msg.sender].able = true;
    bidders.push(msg.sender);
  }

  // Bidder exit notice, only before public session opening.
  function exitNotice() public onlyBidders() {
    require(notice_status <= 1, "Is not possible to exit the notice after the public session started.");
    bidders_mapping[msg.sender].able = false;
  }

  // make bid
  function makeBid(address notice_item, uint offer, uint ts) public notSuspended() onlyBidders() {
    require(notice_items_mapping[notice_item] == true, "This is not an valid notice item");
    require(notice_status <= 2 && notice_status != 0, "Only possible to make an offer while summon or public session.");
    NoticeItem deployed_contract;
    deployed_contract = NoticeItem(notice_item);

    uint resp = deployed_contract.tryBid(msg.sender, offer, ts);

    bidders_mapping[msg.sender].item.push(notice_item);
    bidders_mapping[msg.sender].value.push(offer);
    bidders_mapping[msg.sender].timestamp.push(ts);
    bidders_mapping[msg.sender].status_bid.push(resp);
  }

  /*
  Views of the notice
  */

  // returns most recent pdf info link and hash to verify proof
  function getLastNoticeInfo() public view returns(string memory, string memory) {
    return(hash_pdf[hash_pdf.length-1], link_pdf[link_pdf.length-1]);
  }

  // returns any link and hash by index in history
  function getNoticeHistoryByIndex(uint i) public view returns(string memory, string memory) {
    require(i < hash_pdf.length, "Index out of range");
    return (hash_pdf[i], link_pdf[i]);
  }

  function getNoticePDFHistoryLength() public view returns(uint) {
    return hash_pdf.length;
  }

  function getBidders() public view returns (address[] memory) {
    require(notice_status > 3, "You can only see the bidders after the notice end");
    return bidders;
  }

  function getNoticeItems() public view returns (address[] memory) {
    return notice_items;
  }

  // return bids of a given bidder
  function getBids(address bidder) public view returns (address[] memory notice_item_list, uint[] memory notice_item_offer, uint[] memory notice_offer_ts, uint[] memory notice_offer_status) {
    require(notice_status > 3, "You can\'t see the bid while the notice isn\'t finished");
    return (bidders_mapping[bidder].item, bidders_mapping[bidder].value,
    bidders_mapping[bidder].timestamp, bidders_mapping[bidder].status_bid);
  }

  // get best bidder by any item
  function getBestBidderItemByAddress(address item_address) public view notSuspended() returns (address bidder) {
    require(notice_status == 5 || notice_status == 6, "The best bidder can only be shown at the end of the public session.");
    NoticeItem deployed_contract;
    deployed_contract = NoticeItem(item_address);
    return deployed_contract.getBestBidder(ending_timestamp[ending_timestamp.length-1]);
  }

  function getBiddersItemArray(address item_address) public view notSuspended() returns (address[] memory bidders_array) {
    require(notice_status == 5 || notice_status == 6, "The best bidder can only be shown at the end of the public session.");
    NoticeItem deployed_contract;
    deployed_contract = NoticeItem(item_address);
    return deployed_contract.getAllBestBidders();
  }

  function getBestOffersItemArray(address item_address) public view notSuspended() returns (uint[] memory best_offer_array) {
    require(notice_status == 5 || notice_status == 6, "The best bidder can only be shown at the end of the public session.");
    NoticeItem deployed_contract;
    deployed_contract = NoticeItem(item_address);
    return deployed_contract.getAllBestOffers();
  }

  function getTimestampsItemArray(address item_address) public view notSuspended() returns (uint[] memory timestamp_array) {
    require(notice_status == 5 || notice_status == 6, "The best bidder can only be shown at the end of the public session.");
    NoticeItem deployed_contract;
    deployed_contract = NoticeItem(item_address);
    return deployed_contract.getAllTimeStamp();
  }

  function getBestOfferByItemAddress(address item_address) public view returns (uint best_offer) {
    require(notice_status > 1 && notice_status < 7, "You can only see the best offer after summon and before");
    NoticeItem deployed_contract;
    deployed_contract = NoticeItem(item_address);
    return deployed_contract.getBestOffer();
  }

  // get max value of given item address
  function getRefValueByAddress(address item_address) public view returns (uint ref_value) {
    NoticeItem deployed_contract;
    deployed_contract = NoticeItem(item_address);
    return deployed_contract.getRefValue();
  }
}

contract NoticeItem {
  // TODO add any reference to notice pdf item
  address notice;                         // refence to the notice it belongs
  uint public ref_item_notice;            // item reference notice
  uint public ref_value;                  // max value of this item
  uint[] public best_offer;               // best offer until now
  uint[] timestamp;                       // timestamp of the best offer
  address[] private best_bidder_address;  // address of best bidder

  modifier onlyNotice() { require(msg.sender == notice); _; }

  constructor(uint notice_value, uint ref_item) public payable {
    notice = msg.sender;
    ref_value = notice_value;
    ref_item_notice = ref_item;
  }

  function tryBid(address bidder, uint offer, uint bid_timestamp) public onlyNotice returns(uint bid_status) {
    uint res;
    if (offer < ref_value) { res = 0; } else { res = 1; }
    if (best_offer.length == 0 || offer < best_offer[best_offer.length-1]) {
      best_offer.push(offer);
      best_bidder_address.push(bidder);
      timestamp.push(bid_timestamp);
      return res+1;
    } else {
      return res+3;
    }
  }

  function getBestBidder(uint timestamp_notice_end) public onlyNotice view returns (address bidder_address) {
    require (timestamp_notice_end < now, "The best bidder can only be shown after the public session end.");
    return best_bidder_address[best_bidder_address.length-1];
  }

  function getBestOffer() public view returns (uint offer) {
    return best_offer[best_offer.length-1];
  }

  function getRefValue() public view returns (uint ref) {
    return ref_value;
  }

  function getAllBestOffers() public onlyNotice view returns (uint[] memory best_offer_array) {
    return best_offer;
  }

  function getAllTimeStamp() public onlyNotice view returns (uint[] memory offer_timestamp_array) {
    return timestamp;
  }

  function getAllBestBidders() public onlyNotice view returns (address[] memory best_bidders_array) {
    return best_bidder_address;
  }
}
