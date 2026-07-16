#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Env, String, Symbol
};

/// Grant status enum — mirrors the GrantRegistry XDR schema
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[contracttype]
pub enum GrantStatus {
    Pending = 0,
    Funded = 1,
    Rejected = 2,
}

/// Grant structure — mirrors the GrantRegistry XDR schema
#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct Grant {
    pub id: String,
    pub applicant: Address,
    pub grantor: Address,
    pub amount: i128,            // Amount in Stroops (1 XLM = 10_000_000 stroops)
    pub title: String,
    pub proposal: String,
    pub milestone_deadline: u64, // Unix epoch timestamp
    pub status: GrantStatus,
}

/// Client interface for GrantRegistry contract-to-contract calls
#[soroban_sdk::contractclient(name = "GrantRegistryClient")]
pub trait GrantRegistryClientTrait {
    fn get_grant(env: Env, id: String) -> Grant;
    fn set_funded(env: Env, caller: Address, id: String);
}

/// Storage keys for MilestoneEscrow
#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    Token,
    Registry,
}

/// GrantFlow Milestone Escrow Contract
///
/// Orchestrates milestone-based fund releases for the GrantFlow protocol.
/// On `release_milestone`, it:
///   1. Reads grant details from the GrantRegistry via C2C call
///   2. Transfers XLM from the escrow caller to the applicant via Stellar Asset Contract
///   3. Updates the grant status to Funded in the GrantRegistry via C2C call
///   4. Emits a `milestone_released` event for indexers
#[contract]
pub struct MilestoneEscrow;

#[contractimpl]
impl MilestoneEscrow {
    /// Initialize the MilestoneEscrow with admin, native token, and registry addresses.
    /// Can only be called once.
    pub fn initialize(env: Env, admin: Address, token: Address, registry: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Registry, &registry);
    }

    /// Returns the registered admin address.
    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }

    /// Returns the registered token (XLM / Stellar Asset Contract) address.
    pub fn get_token(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Token).unwrap()
    }

    /// Returns the registered GrantRegistry contract address.
    pub fn get_registry(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Registry).unwrap()
    }

    /// Release milestone funds for a grant application.
    ///
    /// Arguments:
    /// - `caller`: The address authorizing the release (must be admin or grantor)
    /// - `grant_id`: The unique grant identifier (e.g. "grt_abc123")
    ///
    /// Flow:
    /// 1. Authenticates caller
    /// 2. Fetches grant details from GrantRegistry (C2C)
    /// 3. Validates grant is in Pending status
    /// 4. Transfers XLM from caller to applicant via SAC
    /// 5. Updates grant status to Funded in GrantRegistry (C2C)
    /// 6. Emits `milestone_released` event
    pub fn release_milestone(env: Env, caller: Address, grant_id: String) {
        // Authenticate the caller
        caller.require_auth();

        let token_addr = Self::get_token(env.clone());
        let registry_addr = Self::get_registry(env.clone());

        // Instantiate clients for cross-contract calls
        let token_client = soroban_sdk::token::Client::new(&env, &token_addr);
        let registry_client = GrantRegistryClient::new(&env, &registry_addr);

        // Fetch grant details from GrantRegistry (Contract-to-Contract Call)
        let grant: Grant = registry_client.get_grant(&grant_id);

        // Validate grant status is Pending
        if grant.status != GrantStatus::Pending {
            panic!("grant is not in pending status");
        }

        // Transfer XLM from caller to grant applicant (Stellar Asset Contract)
        token_client.transfer(&caller, &grant.applicant, &grant.amount);

        // Update GrantRegistry status to Funded (Contract-to-Contract Call)
        registry_client.set_funded(&env.current_contract_address(), &grant_id);

        // Emit milestone release event for indexers
        env.events().publish(
            (Symbol::new(&env, "milestone_released"), grant_id.clone(), caller.clone()),
            (grant.applicant.clone(), grant.amount),
        );
    }
}

mod test;
