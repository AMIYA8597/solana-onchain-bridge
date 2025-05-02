const { Connection, Keypair, PublicKey, clusterApiUrl } = require("@solana/web3.js")
const {
  Liquidity,
  LiquidityPoolKeys,
  Token,
  TokenAmount,
  Percent,
  TOKEN_PROGRAM_ID,
  LIQUIDITY_STATE_LAYOUT_V4,
} = require("@raydium-io/raydium-sdk")
const fs = require("fs")
require("dotenv").config()

async function createPool(connection, wallet, tokenMint, tokenDecimals, baseTokenAmount, quoteTokenAmount) {
  console.log(`Creating Raydium pool for token: ${tokenMint.toString()}`)

  // WSOL is the quote token
  const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112")
  const WSOL_DECIMALS = 9

  // Raydium AMM Program ID
  const AMM_PROGRAM_ID = new PublicKey("675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8")
  const AMM_AUTHORITY = new PublicKey("5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1")
  const SERUM_PROGRAM_ID = new PublicKey("DESVgJVGajEgKGXhb6XmqDHGz3VjdgP7rEVESBgxmroY")

  // Create pool keys
  const poolKeys = await Liquidity.createPoolKeys({
    connection,
    programId: AMM_PROGRAM_ID,
    ammAuthority: AMM_AUTHORITY,
    ammId: Keypair.generate().publicKey,
    ammOpenOrders: Keypair.generate().publicKey,
    ammTargetOrders: Keypair.generate().publicKey,
    poolCoinTokenAccount: Keypair.generate().publicKey,
    poolPcTokenAccount: Keypair.generate().publicKey,
    serumProgramId: SERUM_PROGRAM_ID,
    serumMarket: Keypair.generate().publicKey,
    serumBids: Keypair.generate().publicKey,
    serumAsks: Keypair.generate().publicKey,
    serumEventQueue: Keypair.generate().publicKey,
    serumCoinVaultAccount: Keypair.generate().publicKey,
    serumPcVaultAccount: Keypair.generate().publicKey,
    serumVaultSigner: Keypair.generate().publicKey,
    baseMint: tokenMint,
    quoteMint: WSOL_MINT,
  })

  // Create tokens
  const baseToken = new Token(TOKEN_PROGRAM_ID, tokenMint, tokenDecimals)
  const quoteToken = new Token(TOKEN_PROGRAM_ID, WSOL_MINT, WSOL_DECIMALS)

  // Create token amounts
  const baseTokenAmountWithDecimals = new TokenAmount(baseToken, baseTokenAmount * Math.pow(10, tokenDecimals))
  const quoteTokenAmountWithDecimals = new TokenAmount(quoteToken, quoteTokenAmount * Math.pow(10, WSOL_DECIMALS))

  // Create pool
  const slippage = new Percent(1, 100) // 1%

  const { transaction, signers } = await Liquidity.makeCreatePoolTransaction({
    connection,
    wallet,
    poolKeys,
    baseAmount: baseTokenAmountWithDecimals,
    quoteAmount: quoteTokenAmountWithDecimals,
    slippage,
  })

  // Send transaction
  const txid = await connection.sendTransaction(transaction, signers)
  await connection.confirmTransaction(txid)

  console.log(`Pool created! Transaction: ${txid}`)

  // Save pool info
  const poolInfo = {
    id: poolKeys.id.toString(),
    baseMint: tokenMint.toString(),
    quoteMint: WSOL_MINT.toString(),
    lpMint: poolKeys.lpMint.toString(),
    baseDecimals: tokenDecimals,
    quoteDecimals: WSOL_DECIMALS,
    baseAmount: baseTokenAmount,
    quoteAmount: quoteTokenAmount,
  }

  return poolInfo
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

  // Create JCK pool
  const jckPoolInfo = await createPool(
    connection,
    wallet,
    jckMint,
    jckInfo.decimals,
    10000, // 10,000 JCK tokens
    10, // 10 SOL
  )

  // Create JCKP pool
  const jckpPoolInfo = await createPool(
    connection,
    wallet,
    jckpMint,
    jckpInfo.decimals,
    10000, // 10,000 JCKP tokens
    10, // 10 SOL
  )

  // Save pool info
  const poolsInfo = {
    jck: jckPoolInfo,
    jckp: jckpPoolInfo,
  }

  fs.writeFileSync("./dist/pools-info.json", JSON.stringify(poolsInfo, null, 2))

  console.log("Raydium pools creation completed successfully!")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
