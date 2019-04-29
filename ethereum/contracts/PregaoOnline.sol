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
  // struct to storage questions
  // TODO questions
  // how to manage all the information and control the data
  struct QuestionInfo {
    string hash_question_pdf;
    string link_question_pdf;
    bool answered;
    string hash_answer_pdf;
    string link_answer_pdf;
  }

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
  // 3 - public session ended | 4 - notice ended
  // 5 - suspended
  uint8 notice_status;

  modifier onlyNoticeOwner() { require(msg.sender == notice_owner || criers[msg.sender] == true, "Only the Notice owner can use this function"); _; }
  modifier onlyBidders() { require(bidders_mapping[msg.sender].able == true, "Only bidders can use this function"); _; }

  constructor(address _crier, uint publish, uint opening,
            uint ending, string memory pdf_hash, string memory pdf_link) public payable {
    notice_owner = msg.sender;
    criers[_crier] = true;
    publish_timestamp.push(publish);
    opening_timestamp.push(opening);
    ending_timestamp.push(ending);
    hash_pdf.push(pdf_hash);
    link_pdf.push(pdf_link);
  }

  // add notices pdfs
  function addNoticePDF(string memory hash, string memory link, uint opening, uint publish, uint ending) public onlyNoticeOwner() {
    hash_pdf.push(hash);
    link_pdf.push(link);
    publish_timestamp.push(publish);
    opening_timestamp.push(opening);
    ending_timestamp.push(ending);
  }

  // returns most recent pdf info link and hash to verify proof
  function getLastNoticeInfo() public view returns(string memory, string memory) {
    return(hash_pdf[hash_pdf.length-1], link_pdf[link_pdf.length-1]);
  }

  // returns any link and hash by index in history
  function getNoticeHistoryByIndex(uint i) public view returns(string memory, string memory) {
    require(i < hash_pdf.length, "Index out of range");
    return (hash_pdf[i], link_pdf[i]);
  }

  // change notice status
  function updateStatus(uint8 status) public onlyNoticeOwner() {
    notice_status = status;
  }

  function endNotice(uint timestamp) public onlyNoticeOwner() {
    iminent_timestamp.push(ending_timestamp[ending_timestamp.length-1] + timestamp);
  }

  // function to bidder enter the notice
  function enterNotice() public {
    require(msg.sender != notice_owner, "You cannot enter this Notice. You are the crier.");
    require(bidders_mapping[msg.sender].able == false, "You already in this Notice.");
    require(notice_status == 1, "New bidders are only possible before the public session.");
    bidders_mapping[msg.sender].able = true;
    bidders.push(msg.sender);
  }

  // Bidder exit notice, only before public session opening.
  function exitNotice() public onlyBidders() {
    require(notice_status == 1, "Is not possible to exit the notice after the public session started.");
    bidders_mapping[msg.sender].able = false;
  }

  // add item to notice
  function addItem(uint value) public onlyNoticeOwner returns(address newItem) {
    NoticeItem new_item = new NoticeItem(value);
    notice_items.push(address(new_item));
    notice_items_mapping[address(new_item)] = true;
    return address(new_item);
  }

  function getBidders() public view returns (address[] memory) {
    return bidders;
  }

  function getNoticeItems() public view returns (address[] memory) {
    return notice_items;
  }

  // return bids of a given bidder
  function getBids(address bidder) public view returns (address[] memory, uint[] memory, uint[] memory, uint[] memory) {
    return (bidders_mapping[bidder].item, bidders_mapping[bidder].value,
    bidders_mapping[bidder].timestamp, bidders_mapping[bidder].status_bid);
  }

  // make bid
  function makeBid(address notice_item, uint offer) public onlyBidders() {
    require(notice_items_mapping[notice_item] == true, "This is not an valid notice item");
    require(notice_status <= 2 && notice_status != 0, "Only possible to make an offer while summon or public session.");
    NoticeItem deployed_contract;
    deployed_contract = NoticeItem(notice_item);

    uint resp = deployed_contract.tryBid(msg.sender, offer, now);

    bidders_mapping[msg.sender].item.push(notice_item);
    bidders_mapping[msg.sender].value.push(offer);
    bidders_mapping[msg.sender].timestamp.push(now);
    bidders_mapping[msg.sender].status_bid.push(resp);
  }

  // get best offer by any item
  function getBestBidderItemByAddress(address item_address) public view returns (address) {
    require(notice_status == 3 || notice_status == 4, "The best bidder can only be shown at the end of the public session.");
    NoticeItem deployed_contract;
    deployed_contract = NoticeItem(item_address);
    return deployed_contract.getBestBidder(ending_timestamp[ending_timestamp.length-1]);
  }

  function getBestOfferByItemAddress(address item_address) public view returns (uint) {
    require(notice_status > 1 && notice_status < 5, "You can only see the best offer after summon and before");
    NoticeItem deployed_contract;
    deployed_contract = NoticeItem(item_address);
    return deployed_contract.getBestOffer();
  }

  // get max value of given item address
  function getMaxValueByAddress(address item_address) public view returns (uint) {
    NoticeItem deployed_contract;
    deployed_contract = NoticeItem(item_address);
    return deployed_contract.getMaxValue();
  }
}

contract NoticeItem {
  // TODO add any reference to notice pdf item
  address notice;                       // refence to the notice it belongs
  uint public max_value;                // max value of this item
  uint public best_offer;               // best offer until now
  uint timestamp;                       // timestamp of the best offer
  address private best_bidder_address;  // address of best bidder

  modifier onlyNotice() { require(msg.sender == notice); _; }

  constructor(uint notice_value) public payable {
    notice = msg.sender;
    max_value = notice_value;
    best_offer = notice_value;
    best_bidder_address = msg.sender;
  }

  function tryBid(address bidder, uint offer, uint bid_timestamp) public onlyNotice returns(uint) {
    if (offer > max_value) return 0;
    if (offer < best_offer) {
      best_offer = offer;
      best_bidder_address = bidder;
      timestamp = bid_timestamp;
      return 1;
    } else {
      return 2;
    }
  }

  function getBestBidder(uint timestamp_notice_end) public onlyNotice view returns (address) {
    require (timestamp_notice_end < now, "The best bidder can only be shown after the public session end.");
    return best_bidder_address;
  }

  function getBestOffer() public view returns (uint) {
    return best_offer;
  }

  function getMaxValue() public onlyNotice view returns (uint) {
    return max_value;
  }
}
