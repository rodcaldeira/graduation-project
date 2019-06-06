const HDWalletProvider = require("truffle-hdwallet-provider");
const Web3 = require("web3");
const compiled_factory = require("./build/NoticeFactory.json");

const provider = new HDWalletProvider(
  "sauce parrot album month nice tragic coral left beach surge table news",
  "http://localhost:7545"
);

const web3 = new Web3(provider);

const deploy = async () => {
  const accounts = await web3.eth.getAccounts();

  console.log("Attempting to deploy from account ", accounts[0]);

  const result = await new web3.eth.Contract(
    JSON.parse(compiled_factory.interface)
  )
    .deploy({
      data: compiled_factory.bytecode
    })
    .send({
      gas: "10000000",
      from: accounts[0]
    });

  console.log("Contract deployed to ", result.options.address);
};

deploy();
