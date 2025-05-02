use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    program_pack::{IsInitialized, Pack},
    pubkey::Pubkey,
    sysvar::{rent::Rent, Sysvar},
    program::{invoke, invoke_signed},
};
use spl_token::instruction as token_instruction;
use spl_token::state::Account as TokenAccount;

use crate::error::BridgeError;
use crate::state::Bridge;

pub struct Processor;

impl Processor {
    pub fn process_initialize_bridge(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        fee_rate: u64,
        min_amount: u64,
        max_amount: u64,
    ) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        
        let bridge_account = next_account_info(account_info_iter)?;
        let source_token_mint = next_account_info(account_info_iter)?;
        let target_token_mint = next_account_info(account_info_iter)?;
        let authority = next_account_info(account_info_iter)?;
        let system_program = next_account_info(account_info_iter)?;
        
        // Check if the bridge account is already initialized
        if !bridge_account.data.borrow().iter().all(|&x| x == 0) {
            return Err(BridgeError::AlreadyInitialized.into());
        }
        
        // Check if the authority signed the transaction
        if !authority.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }
        
        // Create bridge account
        let rent = Rent::get()?;
        let rent_lamports = rent.minimum_balance(Bridge::LEN);
        
        // Create the bridge account
        invoke(
            &system_instruction::create_account(
                authority.key,
                bridge_account.key,
                rent_lamports,
                Bridge::LEN as u64,
                program_id,
            ),
            &[authority.clone(), bridge_account.clone()],
        )?;
        
        // Initialize bridge state
        let mut bridge_info = Bridge {
            is_initialized: true,
            source_token_mint: *source_token_mint.key,
            target_token_mint: *target_token_mint.key,
            authority: *authority.key,
            fee_rate,
            min_amount,
            max_amount,
            total_swapped: 0,
        };
        
        Bridge::pack(bridge_info, &mut bridge_account.data.borrow_mut())?;
        
        msg!("Bridge initialized successfully");
        
        Ok(())
    }
    
    pub fn process_swap_tokens(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        amount: u64,
    ) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        
        let bridge_account = next_account_info(account_info_iter)?;
        let source_token_account = next_account_info(account_info_iter)?;
        let target_token_account = next_account_info(account_info_iter)?;
        let user_authority = next_account_info(account_info_iter)?;
        let token_program = next_account_info(account_info_iter)?;
        
        // Check if the bridge account is initialized
        let mut bridge_info = Bridge::unpack(&bridge_account.data.borrow())?;
        if !bridge_info.is_initialized {
            return Err(BridgeError::NotInitialized.into());
        }
        
        // Check if the user signed the transaction
        if !user_authority.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }
        
        // Verify amount is within limits
        if amount < bridge_info.min_amount {
            return Err(BridgeError::AmountBelowMinimum.into());
        }
        if amount > bridge_info.max_amount {
            return Err(BridgeError::AmountAboveMaximum.into());
        }
        
        // Verify token accounts
        let source_token_info = TokenAccount::unpack(&source_token_account.data.borrow())?;
        let target_token_info = TokenAccount::unpack(&target_token_account.data.borrow())?;
        
        if source_token_info.mint != bridge_info.source_token_mint {
            return Err(BridgeError::InvalidTokenMint.into());
        }
        if target_token_info.mint != bridge_info.target_token_mint {
            return Err(BridgeError::InvalidTokenMint.into());
        }
        
        // Calculate fee
        let fee_amount = amount * bridge_info.fee_rate / 10000;
        let transfer_amount = amount - fee_amount;
        
        // Transfer tokens from user to bridge (fee)
        invoke(
            &token_instruction::transfer(
                token_program.key,
                source_token_account.key,
                bridge_account.key,
                user_authority.key,
                &[],
                fee_amount,
            )?,
            &[
                source_token_account.clone(),
                bridge_account.clone(),
                user_authority.clone(),
                token_program.clone(),
            ],
        )?;
        
        // Mint equivalent tokens to user's target account
        // In a real implementation, this would involve a cross-chain operation
        // For this example, we're simulating by directly minting to the target account
        invoke_signed(
            &token_instruction::mint_to(
                token_program.key,
                &bridge_info.target_token_mint,
                target_token_account.key,
                bridge_account.key,
                &[],
                transfer_amount,
            )?,
            &[
                target_token_account.clone(),
                bridge_account.clone(),
                token_program.clone(),
            ],
            &[&[
                bridge_account.key.as_ref(),
                &[0], // Bump seed
            ]],
        )?;
        
        // Update bridge state
        bridge_info.total_swapped += amount;
        Bridge::pack(bridge_info, &mut bridge_account.data.borrow_mut())?;
        
        msg!("Token swap completed successfully");
        
        Ok(())
    }
    
    pub fn process_update_bridge_config(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        fee_rate: u64,
        min_amount: u64,
        max_amount: u64,
    ) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        
        let bridge_account = next_account_info(account_info_iter)?;
        let authority = next_account_info(account_info_iter)?;
        
        // Check if the bridge account is initialized
        let mut bridge_info = Bridge::unpack(&bridge_account.data.borrow())?;
        if !bridge_info.is_initialized {
            return Err(BridgeError::NotInitialized.into());
        }
        
        // Check if the authority signed the transaction
        if !authority.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }
        
        // Check if the authority is authorized
        if *authority.key != bridge_info.authority {
            return Err(BridgeError::Unauthorized.into());
        }
        
        // Update bridge configuration
        bridge_info.fee_rate = fee_rate;
        bridge_info.min_amount = min_amount;
        bridge_info.max_amount = max_amount;
        
        Bridge::pack(bridge_info, &mut bridge_account.data.borrow_mut())?;
        
        msg!("Bridge configuration updated successfully");
        
        Ok(())
    }
}
