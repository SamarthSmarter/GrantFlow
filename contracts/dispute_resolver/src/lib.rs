#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Env, String, Symbol, Vec,
};

/// Dispute status tracking
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[contracttype]
pub enum DisputeStatus {
    Open = 0,
    UnderReview = 1,
    ResolvedApplicant = 2,  // Resolved in favor of applicant
    ResolvedGrantor = 3,    // Resolved in favor of grantor
    Dismissed = 4,
}

/// Dispute record stored on-chain
#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct Dispute {
    pub id: String,
    pub grant_id: String,
    pub initiator: Address,
    pub respondent: Address,
    pub reason: String,
    pub evidence_hash: String,   // IPFS or SHA-256 hash of uploaded evidence
    pub status: DisputeStatus,
    pub created_at: u64,
    pub resolved_at: u64,
}

/// Storage keys for DisputeResolver
#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    Dispute(String),         // Individual dispute by ID
    DisputeList,             // Vec of all dispute IDs
    GrantDisputes(String),   // Vec of dispute IDs for a given grant
}

/// GrantFlow Dispute Resolution Contract
///
/// Provides on-chain dispute tracking for grant applications.
/// Allows applicants or grantors to raise disputes when milestones
/// are contested, and an admin (arbitrator) to resolve them.
#[contract]
pub struct DisputeResolver;

#[contractimpl]
impl DisputeResolver {
    /// Initialize with an admin/arbitrator address
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    /// Returns the registered admin/arbitrator address
    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }

    /// Open a new dispute for a grant application
    ///
    /// Arguments:
    /// - `initiator`: Address raising the dispute (must sign)
    /// - `dispute_id`: Unique dispute identifier
    /// - `grant_id`: The grant this dispute relates to
    /// - `respondent`: The other party in the dispute
    /// - `reason`: Description of the dispute
    /// - `evidence_hash`: Hash of supporting evidence document
    pub fn open_dispute(
        env: Env,
        initiator: Address,
        dispute_id: String,
        grant_id: String,
        respondent: Address,
        reason: String,
        evidence_hash: String,
    ) {
        initiator.require_auth();

        let key = DataKey::Dispute(dispute_id.clone());
        if env.storage().persistent().has(&key) {
            panic!("dispute already exists with this ID");
        }

        if reason.len() == 0 {
            panic!("dispute reason cannot be empty");
        }

        let dispute = Dispute {
            id: dispute_id.clone(),
            grant_id: grant_id.clone(),
            initiator: initiator.clone(),
            respondent: respondent.clone(),
            reason,
            evidence_hash,
            status: DisputeStatus::Open,
            created_at: env.ledger().timestamp(),
            resolved_at: 0,
        };

        env.storage().persistent().set(&key, &dispute);

        // Update global dispute list
        let mut list: Vec<String> = env
            .storage()
            .persistent()
            .get(&DataKey::DisputeList)
            .unwrap_or(Vec::new(&env));
        list.push_back(dispute_id.clone());
        env.storage().persistent().set(&DataKey::DisputeList, &list);

        // Update per-grant dispute list
        let mut grant_disputes: Vec<String> = env
            .storage()
            .persistent()
            .get(&DataKey::GrantDisputes(grant_id.clone()))
            .unwrap_or(Vec::new(&env));
        grant_disputes.push_back(dispute_id.clone());
        env.storage().persistent().set(
            &DataKey::GrantDisputes(grant_id.clone()),
            &grant_disputes,
        );

        env.events().publish(
            (Symbol::new(&env, "dispute_opened"), dispute_id, initiator),
            grant_id,
        );
    }

    /// Move a dispute to UnderReview status (admin only)
    pub fn review_dispute(env: Env, admin: Address, dispute_id: String) {
        admin.require_auth();

        let stored_admin: Address = Self::get_admin(env.clone());
        if admin != stored_admin {
            panic!("unauthorized: only admin can review disputes");
        }

        let key = DataKey::Dispute(dispute_id.clone());
        let mut dispute: Dispute = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic!("dispute not found"));

        if dispute.status != DisputeStatus::Open {
            panic!("dispute is not in open status");
        }

        dispute.status = DisputeStatus::UnderReview;
        env.storage().persistent().set(&key, &dispute);

        env.events().publish(
            (Symbol::new(&env, "dispute_reviewing"), dispute_id),
            admin,
        );
    }

    /// Resolve a dispute (admin only)
    ///
    /// Arguments:
    /// - `admin`: The arbitrator address
    /// - `dispute_id`: The dispute to resolve
    /// - `in_favor_of_applicant`: true = resolved for applicant, false = for grantor
    pub fn resolve_dispute(
        env: Env,
        admin: Address,
        dispute_id: String,
        in_favor_of_applicant: bool,
    ) {
        admin.require_auth();

        let stored_admin: Address = Self::get_admin(env.clone());
        if admin != stored_admin {
            panic!("unauthorized: only admin can resolve disputes");
        }

        let key = DataKey::Dispute(dispute_id.clone());
        let mut dispute: Dispute = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic!("dispute not found"));

        if dispute.status != DisputeStatus::Open && dispute.status != DisputeStatus::UnderReview {
            panic!("dispute cannot be resolved in current status");
        }

        dispute.status = if in_favor_of_applicant {
            DisputeStatus::ResolvedApplicant
        } else {
            DisputeStatus::ResolvedGrantor
        };
        dispute.resolved_at = env.ledger().timestamp();
        env.storage().persistent().set(&key, &dispute);

        env.events().publish(
            (Symbol::new(&env, "dispute_resolved"), dispute_id, dispute.initiator),
            in_favor_of_applicant,
        );
    }

    /// Dismiss a dispute (admin only)
    pub fn dismiss_dispute(env: Env, admin: Address, dispute_id: String) {
        admin.require_auth();

        let stored_admin: Address = Self::get_admin(env.clone());
        if admin != stored_admin {
            panic!("unauthorized: only admin can dismiss disputes");
        }

        let key = DataKey::Dispute(dispute_id.clone());
        let mut dispute: Dispute = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic!("dispute not found"));

        if dispute.status != DisputeStatus::Open && dispute.status != DisputeStatus::UnderReview {
            panic!("dispute cannot be dismissed in current status");
        }

        dispute.status = DisputeStatus::Dismissed;
        dispute.resolved_at = env.ledger().timestamp();
        env.storage().persistent().set(&key, &dispute);

        env.events().publish(
            (Symbol::new(&env, "dispute_dismissed"), dispute_id),
            admin,
        );
    }

    /// Retrieve a single dispute by ID
    pub fn get_dispute(env: Env, dispute_id: String) -> Dispute {
        let key = DataKey::Dispute(dispute_id);
        if !env.storage().persistent().has(&key) {
            panic!("dispute not found");
        }
        env.storage().persistent().get(&key).unwrap()
    }

    /// Get all dispute IDs
    pub fn get_all_disputes(env: Env) -> Vec<String> {
        env.storage()
            .persistent()
            .get(&DataKey::DisputeList)
            .unwrap_or(Vec::new(&env))
    }

    /// Get all dispute IDs for a specific grant
    pub fn get_grant_disputes(env: Env, grant_id: String) -> Vec<String> {
        env.storage()
            .persistent()
            .get(&DataKey::GrantDisputes(grant_id))
            .unwrap_or(Vec::new(&env))
    }

    /// Count total disputes
    pub fn dispute_count(env: Env) -> u32 {
        let list: Vec<String> = env
            .storage()
            .persistent()
            .get(&DataKey::DisputeList)
            .unwrap_or(Vec::new(&env));
        list.len()
    }
}

mod test;
