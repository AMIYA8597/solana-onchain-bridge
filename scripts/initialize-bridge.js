const {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  clusterApiUrl,
  SystemProgram,
  TransactionInstruction,
} = require("@solana/web3.js")
const fs = require("fs")
const { BN } = require("bn.js")
require("dotenv").config()

// Load bridge program
const BRIDGE_PROGRAM_ID = new PublicKey(process.env.BRIDGE_PROGRAM_ID)

// Bridge instruction layout
const BufferLayout = require("buffer-layout")
const { Buffer } = require("buffer")

const InitializeBridgeLayout = BufferLayout.struct([
  BufferLayout.u8("instruction"),
  BufferLayout.nu64("fee_rate"),
  BufferLayout.nu64("min_amount"),
  BufferLayout.nu64("max_amount"),
])

function createInitializeBridgeInstruction(
  bridgeAccount,
  sourceTokenMint,
  targetTokenMint,
  authority,
  feeRate,
  minAmount,
  maxAmount,
) {
  const keys = [
    { pubkey: bridgeAccount, isSigner: false, isWritable: true },
    { pubkey: sourceTokenMint, isSigner: false, isWritable: false },
    { pubkey: targetTokenMint, isSigner: false, isWritable: false },
    { pubkey: authority, isSigner: true, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ]

  const data = Buffer.alloc(InitializeBridgeLayout.span)
  InitializeBridgeLayout.encode(
    {
      instruction: 0, // Initialize instruction
      fee_rate: new BN(feeRate),
      min_amount: new BN(minAmount),
      max_amount: new BN(maxAmount),
    },
    data,
  )

  return new TransactionInstruction({
    keys,
    programId: BRIDGE_PROGRAM_ID,
    data,
  })
}

async function main() {
  // Connect to devnet
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed")

  // Load wallet from env
  const walletSecretKey = new Uint8Array(JSON.parse(process.env.WALLET_PRIVATE_KEY))
  const wallet = Keypair.fromSecretKey(walletSecretKey)

  console.log(`Using wallet: ${wallet.publicKey.toString()}`)

  // Load token info
  const jckInfo = JSON.parse(fs.readFileSync("./dist/tokens/jck-info.json"))
  const jckpInfo = JSON.parse(fs.readFileSync("./dist/tokens/jckp-info.json"))

  const jckMint = new PublicKey(jckInfo.mint)
  const jckpMint = new PublicKey(jckpInfo.mint)

  console.log(`JCK Mint: ${jckMint.toString()}`)
  console.log(`JCKP Mint: ${jckpMint.toString()}`)

  // Create bridge account
  const bridgeAccount = Keypair.generate()
  console.log(`Bridge Account: ${bridgeAccount.publicKey.toString()}`)

  // Save bridge keypair
  fs.writeFileSync("./dist/program/bridge-keypair.json", JSON.stringify(Array.from(bridgeAccount.secretKey)))

  // Initialize bridge
  const feeRate = 0.01 * 10000 // 1% (in basis points)
  const minAmount = 1 * Math.pow(10, jckInfo.decimals) // 1 token
  const maxAmount = 1000 * Math.pow(10, jckInfo.decimals) // 1000 tokens

  const initInstruction = createInitializeBridgeInstruction(
    bridgeAccount.publicKey,
    jckMint,
    jckpMint,
    wallet.publicKey,
    feeRate,
    minAmount,
    maxAmount,
  )

  const transaction = new Transaction().add(initInstruction)

  const signature = await sendAndConfirmTransaction(connection, transaction, [wallet, bridgeAccount])

  console.log(`Bridge initialized! Transaction: ${signature}`)

  // Save bridge config
  const bridgeConfig = {
    id: bridgeAccount.publicKey.toString(),
    sourceToken: jckMint.toString(),
    targetToken: jckpMint.toString(),
    authority: wallet.publicKey.toString(),
    feeRate: feeRate / 10000, // Convert back to decimal
    minAmount: minAmount / Math.pow(10, jckInfo.decimals),
    maxAmount: maxAmount / Math.pow(10, jckInfo.decimals),
  }

  fs.writeFileSync("./dist/bridge-config.json", JSON.stringify(bridgeConfig, null, 2))

  console.log("Bridge initialization completed successfully!")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
