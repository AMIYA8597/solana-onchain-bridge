const { PublicKey } = require("@solana/web3.js")
const BufferLayout = require("buffer-layout")

function decodeBridgeState(data) {
  // Bridge state layout
  const bridgeLayout = BufferLayout.struct([
    BufferLayout.u8("is_initialized"),
    layout.publicKey("source_token_mint"),
    layout.publicKey("target_token_mint"),
    layout.publicKey("authority"),
    BufferLayout.nu64("fee_rate"),
    BufferLayout.nu64("min_amount"),
    BufferLayout.nu64("max_amount"),
    BufferLayout.nu64("total_swapped"),
  ])

  const state = bridgeLayout.decode(data)

  return {
    isInitialized: state.is_initialized === 1,
    sourceTokenMint: new PublicKey(state.source_token_mint),
    targetTokenMint: new PublicKey(state.target_token_mint),
    authority: new PublicKey(state.authority),
    feeRate: state.fee_rate,
    minAmount: state.min_amount,
    maxAmount: state.max_amount,
    totalSwapped: state.total_swapped,
  }
}

// Helper for PublicKey in BufferLayout
const layout = {
  publicKey: (property) => {
    return BufferLayout.blob(32, property)
  },
}

module.exports = {
  decodeBridgeState,
}
