use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
    program_pack::{Pack, IsInitialized},
    sysvar::{rent::Rent, Sysvar},
    system_instruction,
    program::{invoke, invoke_signed},
};
use spl_token::state::Account as TokenAccount;

mod error;
mod instruction;
mod processor;
mod state;

use crate::instruction::BridgeInstruction;
use crate::processor::Processor;

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    msg!("Bridge program entrypoint");
    
    let instruction = BridgeInstruction::unpack(instruction_data)?;
    
    match instruction {
        BridgeInstruction::InitializeBridge {
            fee_rate,
            min_amount,
            max_amount,
        } => {
            msg!("Instruction: Initialize Bridge");
            Processor::process_initialize_bridge(
                program_id,
                accounts,
                fee_rate,
                min_amount,
                max_amount,
            )
        }
        BridgeInstruction::SwapTokens { amount } => {
            msg!("Instruction: Swap Tokens");
            Processor::process_swap_tokens(program_id, accounts, amount)
        }
        BridgeInstruction::UpdateBridgeConfig {
            fee_rate,
            min_amount,
            max_amount,
        } => {
            msg!("Instruction: Update Bridge Config");
            Processor::process_update_bridge_config(
                program_id,
                accounts,
                fee_rate,
                min_amount,
                max_amount,
            )
        }
    }
}
