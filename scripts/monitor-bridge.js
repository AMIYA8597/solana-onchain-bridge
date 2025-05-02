const { Connection, PublicKey, clusterApiUrl } = require("@solana/web3.js")
const fs = require("fs")
require("dotenv").config()

// Load bridge program
const BRIDGE_PROGRAM_ID = new PublicKey(process.env.BRIDGE_PROGRAM_ID)

async function main() {
  // Connect to devnet
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed")

  // Load bridge config
  const bridgeConfig = JSON.parse(fs.readFileSync("./dist/bridge-config.json"))
  const bridgeAccount = new PublicKey(bridgeConfig.id)

  console.log(`Monitoring bridge: ${bridgeAccount.toString()}`)
  console.log(`Source Token: ${bridgeConfig.sourceToken}`)
  console.log(`Target Token: ${bridgeConfig.targetToken}`)

  // Subscribe to bridge account changes
  const subscriptionId = connection.onAccountChange(
    bridgeAccount,
    (accountInfo, context) => {
      console.log("Bridge account updated:")
      console.log(`Slot: ${context.slot}`)
      console.log(`Data length: ${accountInfo.data.length} bytes`)

      // Here you would decode the account data based on your bridge program's state layout
      // For example:
      // const decodedData = BRIDGE_STATE_LAYOUT.decode(accountInfo.data);
      // console.log('Decoded data:', decodedData);
    },
    "confirmed",
  )

  console.log(`Subscription ID: ${subscriptionId}`)
  console.log("Monitoring bridge activity. Press Ctrl+C to exit.")

  // Keep the process running
  process.stdin.resume()

  // Handle cleanup on exit
  process.on("SIGINT", () => {
    console.log("Stopping bridge monitor...")
    connection.removeAccountChangeListener(subscriptionId)
    process.exit()
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
