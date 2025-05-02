use solana_program::{
    program_error::ProgramError,
    msg,
    pubkey::Pubkey,
};
use std::convert::TryInto;
use std::mem::size_of;

#[derive(Clone, Debug, PartialEq)]
pub enum BridgeInstruction {
    /// Initialize a new bridge
    ///
    /// Accounts expected:
    /// 0. `[writable]` Bridge account - uninitialized
    /// 1. `[]` Source token mint
    /// 2. `[]` Target token mint
    /// 3. `[signer]` Authority
    /// 4. `[]` System program
    InitializeBridge {
        fee_rate: u64,
        min_amount: u64,
        max_amount: u64,
    },
    
    /// Swap tokens from source to target
    ///
    /// Accounts expected:
    /// 0. `[writable]` Bridge account - initialized
    /// 1. `[writable]` Source token account - user's source token account
    /// 2. `[writable]` Target token account - user's target token account
    /// 3. `[signer]` Authority - user
    /// 4. `[]` Token program
    SwapTokens {
        amount: u64,
    },
    
    /// Update bridge configuration
    ///
    /// Accounts expected:
    /// 0. `[writable]` Bridge account - initialized
    /// 1. `[signer]` Authority - bridge authority
    UpdateBridgeConfig {
        fee_rate: u64,
        min_amount: u64,
        max_amount: u64,
    },
}

impl BridgeInstruction {
    pub fn unpack(input: &[u8]) -> Result<Self, ProgramError> {
        let (tag, rest) = input.split_first().ok_or(ProgramError::InvalidInstructionData)?;
        
        Ok(match tag {
            0 => {
                let (fee_rate, rest) = Self::unpack_u64(rest)?;
                let (min_amount, rest) = Self::unpack_u64(rest)?;
                let (max_amount, _) = Self::unpack_u64(rest)?;
                
                Self::InitializeBridge {
                    fee_rate,
                    min_amount,
                    max_amount,
                }
            }
            1 => {
                let (amount, _) = Self::unpack_u64(rest)?;
                
                Self::SwapTokens {
                    amount,
                }
            }
            2 => {
                let (fee_rate, rest) = Self::unpack_u64(rest)?;
                let (min_amount, rest) = Self::unpack_u64(rest)?;
                let (max_amount, _) = Self::unpack_u64(rest)?;
                
                Self::UpdateBridgeConfig {
                    fee_rate,
                    min_amount,
                    max_amount,
                }
            }
            _ => return Err(ProgramError::InvalidInstructionData),
        })
    }
    
    fn unpack_u64(input: &[u8]) -> Result<(u64, &[u8]), ProgramError> {
        if input.len() < 8 {
            msg!("u64 cannot be unpacked");
            return Err(ProgramError::InvalidInstructionData);
        }
        
        let (bytes, rest) = input.split_at(8);
        let value = bytes
            .try_into()
            .map(u64::from_le_bytes)
            .map_err(|_| ProgramError::InvalidInstructionData)?;
            
        Ok((value, rest))
    }
}
