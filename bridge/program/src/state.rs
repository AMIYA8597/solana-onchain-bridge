use solana_program::{
    program_error::ProgramError,
    program_pack::{IsInitialized, Pack, Sealed},
    pubkey::Pubkey,
};
use arrayref::{array_mut_ref, array_ref, array_refs, mut_array_refs};

#[derive(Debug, PartialEq)]
pub struct Bridge {
    pub is_initialized: bool,
    pub source_token_mint: Pubkey,
    pub target_token_mint: Pubkey,
    pub authority: Pubkey,
    pub fee_rate: u64,
    pub min_amount: u64,
    pub max_amount: u64,
    pub total_swapped: u64,
}

impl Sealed for Bridge {}

impl IsInitialized for Bridge {
    fn is_initialized(&self) -> bool {
        self.is_initialized
    }
}

impl Pack for Bridge {
    const LEN: usize = 1 + 32 + 32 + 32 + 8 + 8 + 8 + 8;
    
    fn unpack_from_slice(src: &[u8]) -> Result<Self, ProgramError> {
        let src = array_ref![src, 0, Bridge::LEN];
        let (
            is_initialized,
            source_token_mint,
            target_token_mint,
            authority,
            fee_rate,
            min_amount,
            max_amount,
            total_swapped,
        ) = array_refs![src, 1, 32, 32, 32, 8, 8, 8, 8];
        
        let is_initialized = match is_initialized {
            [0] => false,
            [1] => true,
            _ => return Err(ProgramError::InvalidAccountData),
        };
        
        Ok(Bridge {
            is_initialized,
            source_token_mint: Pubkey::new_from_array(*source_token_mint),
            target_token_mint: Pubkey::new_from_array(*target_token_mint),
            authority: Pubkey::new_from_array(*authority),
            fee_rate: u64::from_le_bytes(*fee_rate),
            min_amount: u64::from_le_bytes(*min_amount),
            max_amount: u64::from_le_bytes(*max_amount),
            total_swapped: u64::from_le_bytes(*total_swapped),
        })
    }
    
    fn pack_into_slice(&self, dst: &mut [u8]) {
        let dst = array_mut_ref![dst, 0, Bridge::LEN];
        let (
            is_initialized_dst,
            source_token_mint_dst,
            target_token_mint_dst,
            authority_dst,
            fee_rate_dst,
            min_amount_dst,
            max_amount_dst,
            total_swapped_dst,
        ) = mut_array_refs![dst, 1, 32, 32, 32, 8, 8, 8, 8];
        
        is_initialized_dst[0] = self.is_initialized as u8;
        source_token_mint_dst.copy_from_slice(self.source_token_mint.as_ref());
        target_token_mint_dst.copy_from_slice(self.target_token_mint.as_ref());
        authority_dst.copy_from_slice(self.authority.as_ref());
        *fee_rate_dst = self.fee_rate.to_le_bytes();
        *min_amount_dst = self.min_amount.to_le_bytes();
        *max_amount_dst = self.max_amount.to_le_bytes();
        *total_swapped_dst = self.total_swapped.to_le_bytes();
    }
}
