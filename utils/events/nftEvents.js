// Lib imports
const fs = require("fs");
// Function Imports
const { sendMessage } = require("../sendResponse");

//Event options
const options = {
  filter: {
    value: [],
  },
};

console.log("NFT");

const nftEvents = (nftContract, nftAddress, nftsLeft, TELEGRAM_API) => {
  nftContract.events
    .Transfer(options)
    .on("data", (event) => {
console.log(event.returnValues);
      if (event.returnValues["0"] === "0x0000000000000000000000000000000000000000") {
        nftsLeft--;
        (async () => {
          console.log("nft minted");
          let groups = fs.readFileSync("./data/groupData.json", "utf-8");
          groups = JSON.parse(groups);
          for (let group of groups) {
            sendMessage(TELEGRAM_API, group.chatId, `⚽️ Another *Fifa NFT* has arrived! #${event.returnValues.tokenId}\n\n*⏳ Fifa NFT's Remaining:* ${1022-nftsLeft}/1022`, false, ["View On TofuNFt", `https://tofunft.com/nft/bsc/${nftAddress}/${event.returnValues.tokenId}`]);
          }
        })();
      }
    })
    .on("error", (err) => {
      console.log(err);
    })
    .on("connected", (str) => console.log(str, "connected"));
};

module.exports = { nftEvents };
