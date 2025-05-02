const {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  clusterApiUrl,
  TransactionInstruction,
} = require("@solana/web3.js")
const { Token, TOKEN_PROGRAM_ID } = require("@solana/spl-token")
const fs = require("fs")
const { BN } = require("bn.js")
require("dotenv").config()

// Load bridge program
const BRIDGE_PROGRAM_ID = new PublicKey(process.env.BRIDGE_PROGRAM_ID)

// Bridge instruction layout
const BufferLayout = require("buffer-layout")
const { Buffer } = require("buffer")

const SwapTokensLayout = BufferLayout.struct([BufferLayout.u8("instruction"), BufferLayout.nu64("amount")])

function createSwapTokensInstruction(bridgeAccount, sourceTokenAccount, targetTokenAccount, authority, amount) {
  const keys = [
    { pubkey: bridgeAccount, isSigner: false, isWritable: true },
    { pubkey: sourceTokenAccount, isSigner: false, isWritable: true },
    { pubkey: targetTokenAccount, isSigner: false, isWritable: true },
    { pubkey: authority, isSigner: true, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ]

  const data = Buffer.alloc(SwapTokensLayout.span)
  SwapTokensLayout.encode(
    {
      instruction: 1, // Swap instruction
      amount: new BN(amount),
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

  // Load bridge config
  const bridgeConfig = JSON.parse(fs.readFileSync("./dist/bridge-config.json"))
  const bridgeAccount = new PublicKey(bridgeConfig.id)

  // Load token info
  const jckInfo = JSON.parse(fs.readFileSync("./dist/tokens/jck-info.json"))
  const jckpInfo = JSON.parse(fs.readFileSync("./dist/tokens/jckp-info.json"))

  const jckMint = new PublicKey(jckInfo.mint)
  const jckpMint = new PublicKey(jckpInfo.mint)

  // Get token accounts
  const jckToken = new Token(connection, jckMint, TOKEN_PROGRAM_ID, wallet)
  const jckpToken = new Token(connection, jckpMint, TOKEN_PROGRAM_ID, wallet)

  const jckAccount = await jckToken.getOrCreateAssociatedAccountInfo(wallet.publicKey)
  const jckpAccount = await jckpToken.getOrCreateAssociatedAccountInfo(wallet.publicKey)

  console.log(`JCK Account: ${jckAccount.address.toString()}`)
  console.log(`JCKP Account: ${jckpAccount.address.toString()}`)

  // Check balances before swap
  const jckBalanceBefore = await connection.getTokenAccountBalance(jckAccount.address)
  const jckpBalanceBefore = await connection.getTokenAccountBalance(jckpAccount.address)

  console.log(`JCK Balance Before: ${jckBalanceBefore.value.uiAmount}`)
  console.log(`JCKP Balance Before: ${jckpBalanceBefore.value.uiAmount}`)

  // Swap JCK to JCKP
  const swapAmount = 10 * Math.pow(10, jckInfo.decimals) // 10 tokens

  const swapInstruction = createSwapTokensInstruction(
    bridgeAccount,
    jckAccount.address,
    jckpAccount.address,
    wallet.publicKey,
    swapAmount,
  )

  const transaction = new Transaction().add(swapInstruction)

  const signature = await sendAndConfirmTransaction(connection, transaction, [wallet])

  console.log(`Swap completed! Transaction: ${signature}`)

  // Check balances after swap
  const jckBalanceAfter = await connection.getTokenAccountBalance(jckAccount.address)
  const jckpBalanceAfter = await connection.getTokenAccountBalance(jckpAccount.address)

  console.log(`JCK Balance After: ${jckBalanceAfter.value.uiAmount}`)
  console.log(`JCKP Balance After: ${jckpBalanceAfter.value.uiAmount}`)

  console.log("Bridge test completed successfully!")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
