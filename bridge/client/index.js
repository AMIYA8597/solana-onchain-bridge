const {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  Keypair,
  sendAndConfirmTransaction,
} = require("@solana/web3.js")
const { Token, TOKEN_PROGRAM_ID } = require("@solana/spl-token")
const BN = require("bn.js")
const BufferLayout = require("buffer-layout")
const { Buffer } = require("buffer")

const utils = require("./utils")

class BridgeClient {
  constructor(connection, programId, payerAccount) {
    this.connection = connection
    this.programId = programId
    this.payer = payerAccount
  }

  async initializeBridge(bridgeAccount, sourceTokenMint, targetTokenMint, feeRate, minAmount, maxAmount) {
    const initializeInstruction = this.createInitializeBridgeInstruction(
      bridgeAccount.publicKey,
      sourceTokenMint,
      targetTokenMint,
      this.payer.publicKey,
      feeRate,
      minAmount,
      maxAmount,
    )

    const transaction = new Transaction().add(initializeInstruction)

    return await sendAndConfirmTransaction(this.connection, transaction, [this.payer, bridgeAccount], {
      commitment: "confirmed",
    })
  }

  async swapTokens(bridgeAccount, sourceTokenAccount, targetTokenAccount, amount) {
    const swapInstruction = this.createSwapTokensInstruction(
      bridgeAccount,
      sourceTokenAccount,
      targetTokenAccount,
      this.payer.publicKey,
      amount,
    )

    const transaction = new Transaction().add(swapInstruction)

    return await sendAndConfirmTransaction(this.connection, transaction, [this.payer], { commitment: "confirmed" })
  }

  async updateBridgeConfig(bridgeAccount, feeRate, minAmount, maxAmount) {
    const updateInstruction = this.createUpdateBridgeConfigInstruction(
      bridgeAccount,
      this.payer.publicKey,
      feeRate,
      minAmount,
      maxAmount,
    )

    const transaction = new Transaction().add(updateInstruction)

    return await sendAndConfirmTransaction(this.connection, transaction, [this.payer], { commitment: "confirmed" })
  }

  createInitializeBridgeInstruction(
    bridgeAccount,
    sourceTokenMint,
    targetTokenMint,
    authority,
    feeRate,
    minAmount,
    maxAmount,
  ) {
    const dataLayout = BufferLayout.struct([
      BufferLayout.u8("instruction"),
      BufferLayout.nu64("fee_rate"),
      BufferLayout.nu64("min_amount"),
      BufferLayout.nu64("max_amount"),
    ])

    const data = Buffer.alloc(dataLayout.span)
    dataLayout.encode(
      {
        instruction: 0, // Initialize instruction
        fee_rate: new BN(feeRate),
        min_amount: new BN(minAmount),
        max_amount: new BN(maxAmount),
      },
      data,
    )

    const keys = [
      { pubkey: bridgeAccount, isSigner: false, isWritable: true },
      { pubkey: sourceTokenMint, isSigner: false, isWritable: false },
      { pubkey: targetTokenMint, isSigner: false, isWritable: false },
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ]

    return new TransactionInstruction({
      keys,
      programId: this.programId,
      data,
    })
  }

  createSwapTokensInstruction(bridgeAccount, sourceTokenAccount, targetTokenAccount, authority, amount) {
    const dataLayout = BufferLayout.struct([BufferLayout.u8("instruction"), BufferLayout.nu64("amount")])

    const data = Buffer.alloc(dataLayout.span)
    dataLayout.encode(
      {
        instruction: 1, // Swap instruction
        amount: new BN(amount),
      },
      data,
    )

    const keys = [
      { pubkey: bridgeAccount, isSigner: false, isWritable: true },
      { pubkey: sourceTokenAccount, isSigner: false, isWritable: true },
      { pubkey: targetTokenAccount, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ]

    return new TransactionInstruction({
      keys,
      programId: this.programId,
      data,
    })
  }

  createUpdateBridgeConfigInstruction(bridgeAccount, authority, feeRate, minAmount, maxAmount) {
    const dataLayout = BufferLayout.struct([
      BufferLayout.u8("instruction"),
      BufferLayout.nu64("fee_rate"),
      BufferLayout.nu64("min_amount"),
      BufferLayout.nu64("max_amount"),
    ])

    const data = Buffer.alloc(dataLayout.span)
    dataLayout.encode(
      {
        instruction: 2, // Update config instruction
        fee_rate: new BN(feeRate),
        min_amount: new BN(minAmount),
        max_amount: new BN(maxAmount),
      },
      data,
    )

    const keys = [
      { pubkey: bridgeAccount, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: false },
    ]

    return new TransactionInstruction({
      keys,
      programId: this.programId,
      data,
    })
  }

  async getBridgeInfo(bridgeAccount) {
    const accountInfo = await this.connection.getAccountInfo(bridgeAccount)
    if (!accountInfo) {
      throw new Error("Bridge account not found")
    }

    return utils.decodeBridgeState(accountInfo.data)
  }
}

module.exports = { BridgeClient }
