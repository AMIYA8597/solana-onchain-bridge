use solana_program::program_error::ProgramError;
use thiserror::Error;

#[derive(Error, Debug, Copy, Clone)]
pub enum BridgeError {
    #[error("Invalid instruction")]
    InvalidInstruction,
    
    #[error("Account not initialized")]
    NotInitialized,
    
    #[error("Account already initialized")]
    AlreadyInitialized,
    
    #[error("Unauthorized")]
    Unauthorized,
    
    #[error("Invalid token mint")]
    InvalidTokenMint,
    
    #[error("Amount below minimum")]
    AmountBelowMinimum,
    
    #[error("Amount above maximum")]
    AmountAboveMaximum,
    
    #[error("Insufficient funds")]
    InsufficientFunds,
}

impl From<BridgeError> for ProgramError {
    fn from(e: BridgeError) -> Self {
        ProgramError::Custom(e as u32)
    }
}
