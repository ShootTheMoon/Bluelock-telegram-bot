// Function Imports
const { sendVideo } = require("../sendResponse");
const { getTokenPrice } = require("../getTokenPrice");
const fs = require("fs");

//Event options
const options = {
  filter: {
    value: [],
  },
};
const tokenEvents = async (web3, tokenContract, totalTokenSupply, decimals, TELEGRAM_API) => {
  tokenContract.events
    .Transfer(options)
    .on("data", async (event) => {
      if (event.returnValues.to === "0x000000000000000000000000000000000000dEaD") {
        try {
          // Get amount sent to dead address
          let burned = parseInt(event.returnValues.value) / 10 ** decimals;
          // Get token price
          const tokenPrice = await getTokenPrice(web3);
          // Get tokens at dead address
          let totalBurned = parseInt(await tokenContract.methods.balanceOf("0x000000000000000000000000000000000000dEaD").call());
          let groups = fs.readFileSync("./data/groupData.json", "utf-8");
          groups = JSON.parse(groups);
          const percentBurned = (totalBurned / totalTokenSupply) * 100;
          for (let group of groups) {
            sendVideo(
              TELEGRAM_API,
              group.chatId,
              "https://i.imgur.com/yVJOsJ8.mp4",
              `⚽️ *Initiating Bluelock Protocol* ⚽️\n\n🔥 *Contract successfully buyback & burn*:\n${burned.toFixed(2).toString()} ($${(tokenPrice * burned).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")})\n\n💠 *Accumulated $ISAGI burned*:\n${(totalBurned / 10 ** decimals)
                .toFixed(0)
                .replace(/\B(?=(\d{3})+(?!\d))/g, ",")} ($${(tokenPrice * (totalBurned / 10 ** decimals)).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}) (${percentBurned.toFixed(2)}%)`,
              ["Buy on Pancakeswap", `https://pancakeswap.finance/swap?outputCurrency=0xBe010d8f1adc0371FEacEe63270B8b3c0e793cb3`]
            );
          }
          // Reset burned buffer
          fs.writeFile("./data/data.txt", "0", (err) => {
            if (err) {
              console.log(err);
            }
          });
        } catch (err) {
          console.log(err);
        }
      }
    })
    .on("error", (err) => {
      console.log(err);
    })
    .on("connected", (str) => console.log(str, "connected"));
};

module.exports = { tokenEvents };
