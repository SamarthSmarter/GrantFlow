#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Env, String, Symbol, Vec
};

/// Grant application status
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[contracttype]
pub enum GrantStatus {
    Pending = 0,
    Funded = 1,
    Rejected = 2,
}

/// Core Grant Application structure stored on-chain
#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct Grant {
    pub id: String,
    pub applicant: Address,
    pub grantor: Address,
    pub amount: i128,         // Amount in Stroops (1 XLM = 10_000_000 stroops)
    pub title: String,
    pub proposal: String,
    pub milestone_deadline: u64, // Unix epoch timestamp
    pub status: GrantStatus,
}

/// Storage key enum for Soroban persistent/instance storage
#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    MilestoneEscrow,          // Address of the Milestone Escrow contract
    Grant(String),            // Individual grant keyed by grant ID
    GrantList,                // List of all grant IDs
}

/// GrantFlow Grant Registry Contract
///
/// Stores grant application metadata, tracks status transitions
/// (Pending → Funded or Pending → Rejected), and emits on-chain events
/// for transparency and indexer consumption.
#[contract]
pub struct GrantRegistry;

#[contractimpl]
#[allow(clippy::too_many_arguments)]
impl GrantRegistry {

    /// Initialize the contract with an admin and milestone escrow address.
    /// Can only be called once.
    pub fn initialize(env: Env, admin: Address, milestone_escrow: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::MilestoneEscrow, &milestone_escrow);
    }

    /// Returns the registered admin address.
    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }

    /// Returns the registered Milestone Escrow contract address.
    pub fn get_milestone_escrow(env: Env) -> Address {
        env.storage().instance().get(&DataKey::MilestoneEscrow).unwrap()
    }

    /// Submit a new grant application (invoked by the applicant).
    ///
    /// Arguments:
    /// - `applicant`: Address submitting the grant application (must sign)
    /// - `id`: Unique grant identifier (e.g. "grt_abc123")
    /// - `grantor`: Address of the granting organization / DAO
    /// - `amount`: Requested grant amount in Stroops
    /// - `title`: Project title
    /// - `proposal`: Project proposal and deliverables description
    /// - `milestone_deadline`: Unix timestamp for milestone completion deadline
    #[allow(clippy::too_many_arguments)]
    pub fn submit_grant(
        env: Env,
        applicant: Address,
        id: String,
        grantor: Address,
        amount: i128,
        title: String,
        proposal: String,
        milestone_deadline: u64,
    ) {
        // Authenticate applicant
        applicant.require_auth();

        if amount <= 0 {
            panic!("grant amount must be positive");
        }

        let key = DataKey::Grant(id.clone());
        if env.storage().persistent().has(&key) {
            panic!("grant already exists with this ID");
        }

        let grant = Grant {
            id: id.clone(),
            applicant: applicant.clone(),
            grantor: grantor.clone(),
            amount,
            title,
            proposal,
            milestone_deadline,
            status: GrantStatus::Pending,
        };

        // Write to persistent storage
        env.storage().persistent().set(&key, &grant);

        // Update grant list
        let mut list: Vec<String> = env
            .storage()
            .persistent()
            .get(&DataKey::GrantList)
            .unwrap_or(Vec::new(&env));
        list.push_back(id.clone());
        env.storage().persistent().set(&DataKey::GrantList, &list);

        // Emit on-chain event for indexers and transparency
        env.events().publish(
            (Symbol::new(&env, "grant_submitted"), id.clone(), applicant.clone()),
            (grantor, amount),
        );
    }

    /// Retrieve a single grant application by ID.
    pub fn get_grant(env: Env, id: String) -> Grant {
        let key = DataKey::Grant(id);
        if !env.storage().persistent().has(&key) {
            panic!("grant not found");
        }
        env.storage().persistent().get(&key).unwrap()
    }

    /// Fetch all registered grant IDs.
    pub fn get_all_grants(env: Env) -> Vec<String> {
        env.storage()
            .persistent()
            .get(&DataKey::GrantList)
            .unwrap_or(Vec::new(&env))
    }

    /// Mark a grant as Funded (transition: Pending → Funded).
    ///
    /// Restricted to the registered MilestoneEscrow contract address.
    /// This is called by the MilestoneEscrow contract after verifying
    /// that milestone conditions are satisfied and XLM has been disbursed.
    pub fn set_funded(env: Env, caller: Address, id: String) {
        caller.require_auth();

        let escrow = Self::get_milestone_escrow(env.clone());
        if caller != escrow {
            panic!("unauthorized: only the milestone escrow contract can release funds");
        }

        let key = DataKey::Grant(id.clone());
        let mut grant: Grant = env.storage().persistent().get(&key).unwrap_or_else(|| {
            panic!("grant not found");
        });

        if grant.status != GrantStatus::Pending {
            panic!("grant is not in pending status");
        }

        grant.status = GrantStatus::Funded;
        env.storage().persistent().set(&key, &grant);

        // Emit milestone release event
        env.events().publish(
            (Symbol::new(&env, "milestone_released"), id.clone(), grant.applicant.clone()),
            (grant.grantor.clone(), grant.amount),
        );
    }

    /// Withdraw / reject a grant application (transition: Pending → Rejected).
    ///
    /// Only the original applicant may withdraw their own application.
    pub fn reject_grant(env: Env, id: String) {
        let key = DataKey::Grant(id.clone());
        let mut grant: Grant = env.storage().persistent().get(&key).unwrap_or_else(|| {
            panic!("grant not found");
        });

        // Require applicant's signature
        grant.applicant.require_auth();

        if grant.status != GrantStatus::Pending {
            panic!("grant cannot be withdrawn in current status");
        }

        grant.status = GrantStatus::Rejected;
        env.storage().persistent().set(&key, &grant);

        // Emit rejection event
        env.events().publish(
            (Symbol::new(&env, "grant_rejected"), id.clone()),
            grant.applicant.clone(),
        );
    }
}

mod test;
