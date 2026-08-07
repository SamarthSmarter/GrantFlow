#![cfg(test)]
use super::*;
use soroban_sdk::testutils::{Address as _, Events};
use soroban_sdk::{vec, Env, Address, String, Symbol, IntoVal};
use grant_registry::{GrantRegistry, GrantRegistryClient as RegistryContractClient, GrantStatus as RegistryGrantStatus};

#[test]
fn test_successful_milestone_release() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let applicant = Address::generate(&env);
    let grantor = Address::generate(&env);

    // Register token contract (Stellar Asset Contract)
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let token_addr = sac.address();
    let token_client = soroban_sdk::token::Client::new(&env, &token_addr);
    let sac_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_addr);

    // Register escrow contract
    let escrow_addr = env.register_contract(None, MilestoneEscrow);
    let escrow_client = MilestoneEscrowClient::new(&env, &escrow_addr);

    // Register grant registry contract
    let registry_addr = env.register_contract(None, GrantRegistry);
    let registry_client = RegistryContractClient::new(&env, &registry_addr);

    // Initialize contracts — registry needs the escrow address
    registry_client.initialize(&admin, &escrow_addr);
    escrow_client.initialize(&admin, &token_addr, &registry_addr);

    // Submit a grant via the registry
    let grant_id = String::from_str(&env, "grt_release");
    let amount: i128 = 5000_0000000; // 5000 XLM

    registry_client.submit_grant(
        &applicant,
        &grant_id,
        &grantor,
        &amount,
        &String::from_str(&env, "Test Project"),
        &String::from_str(&env, "Milestone release test"),
        &1900000000,
    );

    // Mint tokens to grantor so they can fund the milestone
    sac_client.mint(&grantor, &amount);
    assert_eq!(token_client.balance(&grantor), amount);
    assert_eq!(token_client.balance(&applicant), 0);

    // Release milestone (grantor pays applicant)
    escrow_client.release_milestone(&grantor, &grant_id);

    // Verify balances changed
    assert_eq!(token_client.balance(&grantor), 0);
    assert_eq!(token_client.balance(&applicant), amount);

    // Verify grant status changed to Funded in Registry
    let grant = registry_client.get_grant(&grant_id);
    assert_eq!(grant.status, RegistryGrantStatus::Funded);
}

#[test]
#[should_panic(expected = "grant is not in pending status")]
fn test_double_release_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let applicant = Address::generate(&env);
    let grantor = Address::generate(&env);

    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let token_addr = sac.address();
    let sac_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_addr);

    let escrow_addr = env.register_contract(None, MilestoneEscrow);
    let escrow_client = MilestoneEscrowClient::new(&env, &escrow_addr);

    let registry_addr = env.register_contract(None, GrantRegistry);
    let registry_client = RegistryContractClient::new(&env, &registry_addr);

    registry_client.initialize(&admin, &escrow_addr);
    escrow_client.initialize(&admin, &token_addr, &registry_addr);

    let grant_id = String::from_str(&env, "grt_double");
    let amount: i128 = 1000_0000000;

    registry_client.submit_grant(
        &applicant,
        &grant_id,
        &grantor,
        &amount,
        &String::from_str(&env, "Double Release Test"),
        &String::from_str(&env, "Should fail on second release"),
        &1900000000,
    );

    sac_client.mint(&grantor, &(amount * 2));

    // First release should succeed
    escrow_client.release_milestone(&grantor, &grant_id);

    // Second release should panic
    escrow_client.release_milestone(&grantor, &grant_id);
}

#[test]
#[should_panic(expected = "already initialized")]
fn test_double_initialization_fails() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let token = Address::generate(&env);
    let registry = Address::generate(&env);

    let escrow_addr = env.register_contract(None, MilestoneEscrow);
    let escrow_client = MilestoneEscrowClient::new(&env, &escrow_addr);

    escrow_client.initialize(&admin, &token, &registry);
    escrow_client.initialize(&admin, &token, &registry);
}

#[test]
fn test_getter_functions() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let token = Address::generate(&env);
    let registry = Address::generate(&env);

    let escrow_addr = env.register_contract(None, MilestoneEscrow);
    let escrow_client = MilestoneEscrowClient::new(&env, &escrow_addr);

    escrow_client.initialize(&admin, &token, &registry);

    assert_eq!(escrow_client.get_admin(), admin);
    assert_eq!(escrow_client.get_token(), token);
    assert_eq!(escrow_client.get_registry(), registry);
}
