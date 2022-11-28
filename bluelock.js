// -> Library Imports
require("dotenv").config();
const fs = require("fs");
const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const Web3 = require("web3");
const Web3WsProvider = require("web3-providers-ws");
const path = require("path");
// const scriptName = path.basename(__filename).replace(".js", "");

// -> Global variables
const { TOKEN, SERVER_URL, TOKEN_ADDRESS, BUILD, WS_API_KEY, PORT } = process.env;

// -> Function Imports
const { getTokenPrice } = require("./utils/getTokenPrice");
const { addToGroups, checkIfAdded } = require("./utils/groupsHandlers");
// const { nftEvents } = require("./utils/events/nftEvents");
const { tokenEvents } = require("./utils/events/tokenEvents");
const { sendMessage, sendPhoto } = require("./utils/sendResponse");
// const { getNFTData } = require("./utils/getNFTData");

// -> Express
const app = express();
app.use(bodyParser.json());

// -> Webhook
let serverUrl = SERVER_URL;
if (BUILD == "Test") {
  serverUrl = "https://e68a-2601-5ca-c300-47f0-e480-39bd-f43-8cf5.ngrok.io";
}
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;
const URI = `/app2/${TOKEN}`;
const WEBHOOK_URL = serverUrl + URI;

// -> Websocket
const wsOptions = {
  timeout: 30000, // ms

  clientConfig: {
    // Useful if requests are large
    maxReceivedFrameSize: 100000000, // bytes - default: 1MiB
    maxReceivedMessageSize: 100000000, // bytes - default: 8MiB

    // Useful to keep a connection alive
    keepalive: true,
    keepaliveInterval: 60000, // ms
  },

  // Enable auto reconnection
  reconnect: {
    auto: true,
    delay: 5000, // ms
    maxAttempts: 5,
    onTimeout: false,
  },
};
const ws = new Web3WsProvider(WS_API_KEY, wsOptions);

// -> Web3 declarations
// let nftAbi = fs.readFileSync("./blockchain/nftAbi.json");
// nftAbi = JSON.parse(nftAbi);
let tokenAbi = fs.readFileSync("./blockchain/tokenAbi.json");
tokenAbi = JSON.parse(tokenAbi);
let routerAbi = fs.readFileSync("./blockchain/routerAbi.json");
routerAbi = JSON.parse(routerAbi);
const web3 = new Web3(ws);
const tokenAddress = TOKEN_ADDRESS.toLowerCase();
const tokenContract = new web3.eth.Contract(tokenAbi, tokenAddress);

let totalTokenSupply, decimals;

const init = async () => {
  try {
    totalTokenSupply = parseInt(await tokenContract.methods.totalSupply().call());
    decimals = parseInt(await tokenContract.methods.decimals().call());
    tokenEvents(web3, tokenContract, totalTokenSupply, decimals, TELEGRAM_API);
  } catch (err) {
    console.log(err);
  }
};

app.post(URI, async (req, res) => {
  try {
    if (req.body.message.chat) {
      const chatId = req.body.message.chat.id;
      const command = req.body.message.text;
      const messageId = req.body.message.message_id;
      if (command === "/blbot") {
        if (checkIfAdded(chatId) === false) {
          const addToGroup = addToGroups(chatId);
          if (addToGroup) {
            sendMessage(TELEGRAM_API, chatId, `*Bluelock Bot activated with chat id:* ${chatId}`, false, messageId);
          } else {
            sendMessage(TELEGRAM_API, chatId, `*Error starting bot with chat id:* ${chatId}`, false, messageId);
          }
        } else {
          sendMessage(TELEGRAM_API, chatId, `*Bluelock Bot already active*`, false, messageId);
        }
      } else if (command === "/burned") {
        if (checkIfAdded(chatId) == true) {
          try {
            const tokenPrice = await getTokenPrice(web3);
            let totalBurned = parseInt(await tokenContract.methods.balanceOf("0x000000000000000000000000000000000000dEaD").call());
            const percentBurned = (totalBurned / totalTokenSupply) * 100;
            sendMessage(
              TELEGRAM_API,
              chatId,
              `*Total $ISAGI burned:*\n${(totalBurned / 10 ** decimals).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} ($${(tokenPrice * (totalBurned / 10 ** decimals)).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}) (${percentBurned.toFixed(2)}%)`,
              ["Buy on Pancakeswap", `https://pancakeswap.finance/swap?outputCurrency=0xBe010d8f1adc0371FEacEe63270B8b3c0e793cb3`],
              messageId
            );
          } catch (err) {
            console.log(err);
          }
        }
      }
      // else if (command.split(" ")[0] == "/nftlookup") {
      //   if (checkIfAdded(chatId) == true) {
      //     const nftID = parseInt(command.split(" ")[1]);
      //     if (nftID) {
      //       try {
      //         getNFTData(nftContract, nftID).then((data) => {
      //           if (data) {
      //             sendPhoto(TELEGRAM_API, chatId, data.imageURI, `*Owner:* https://bscscan.com/address/${data.owner}\n\n${data.traitValue}`, ["View On TofuNFt", `https://tofunft.com/nft/bsc/${nftAddress}/${nftID}`], messageId);
      //           } else {
      //             sendMessage(TELEGRAM_API, chatId, "*NFT does not exist or has not been minted yet!*", messageId);
      //           }
      //         });
      //       } catch (err) {
      //         console.log(err);
      //       }
      //     } else {
      //       sendMessage(TELEGRAM_API, chatId, `*This command looks up the image of a given Fifa Inu NFT. Please include the id of the nft following the command.* \nExample: /nftlookup 420`, messageId);
      //     }
      //   } else {
      //     console.log("Group not added");
      //   }
      // } else if (command == "/nftsleft") {
      //   let nftsLeft = await nftContract.methods.lastSupply().call();
      //   sendMessage(TELEGRAM_API, chatId, `*Minted:* ${1022 - nftsLeft}/1022`, messageId);
      // }
    }
  } catch (err) {}
  return res.send();
});
app.listen(PORT || 5000, () => {
  console.log("🚀 app running on port", PORT || 5000);

  // Delete and unsubscribe to webhook events
  axios.get(`${TELEGRAM_API}/deleteWebhook?drop_pending_updates=true`).then((res) => {
    console.log(res.data);
    // Subscribe to webhook events
    axios.get(`${TELEGRAM_API}/setWebhook?url=${WEBHOOK_URL}`).then((res) => {
      console.log(res.data);
      init();
    });
  });
  axios.get(`${TELEGRAM_API}/getMyCommands`).then((res) => {
    console.log(res.data);
  });
});
