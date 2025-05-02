const {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  clusterApiUrl,
} = require("@solana/web3.js");
const { 
  createMint, 
  getOrCreateAssociatedTokenAccount, 
  mintTo,
  TOKEN_PROGRAM_ID
} = require("@solana/spl-token");
const fs = require("fs");
require("dotenv").config();

async function createToken(connection, payer, decimals, name, symbol) {
  console.log(`Creating token: ${name} (${symbol})`);

  // Create mint authority
  const mintAuthority = Keypair.generate();
  const freezeAuthority = mintAuthority.publicKey;

  // Create token mint
  const tokenMint = await createMint(
    connection,
    payer,
    mintAuthority.publicKey,
    freezeAuthority,
    decimals
  );

  console.log(`Token created: ${tokenMint.toString()}`);

  // Create token account for the payer
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    tokenMint,
    payer.publicKey
  );
  
  console.log(`Token account created: ${tokenAccount.address.toString()}`);

  // Mint some tokens to the payer
  const mintAmount = 1000000 * Math.pow(10, decimals);
  await mintTo(
    connection,
    payer,
    tokenMint,
    tokenAccount.address,
    mintAuthority,
    mintAmount
  );

  console.log(`Minted ${mintAmount / Math.pow(10, decimals)} tokens to ${tokenAccount.address.toString()}`);

  // Save token info
  const tokenInfo = {
    mint: tokenMint.toString(),
    mintAuthority: Array.from(mintAuthority.secretKey),
    decimals,
    name,
    symbol,
  };

  // Ensure dist/tokens directory exists
  if (!fs.existsSync("./dist/tokens")) {
    fs.mkdirSync("./dist/tokens", { recursive: true });
  }

  fs.writeFileSync(`./dist/tokens/${symbol.toLowerCase()}-info.json`, JSON.stringify(tokenInfo, null, 2));

  console.log(`Token info saved to ./dist/tokens/${symbol.toLowerCase()}-info.json`);

  return {
    mint: tokenMint,
    mintAuthority,
    tokenAccount: tokenAccount.address,
  };
}

async function main() {
  // Connect to devnet
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  // Load wallet from env
  const walletSecretKey = new Uint8Array(JSON.parse(process.env.WALLET_PRIVATE_KEY));
  const wallet = Keypair.fromSecretKey(walletSecretKey);

  console.log(`Using wallet: ${wallet.publicKey.toString()}`);

  // Create JCK token
  const jckToken = await createToken(
    connection,
    wallet,
    9, // decimals
    "JCK Token",
    "JCK",
  );

  // Create JCKP token
  const jckpToken = await createToken(
    connection,
    wallet,
    9, // decimals
    "JCKP Token",
    "JCKP",
  );

  console.log("Token creation completed successfully!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});