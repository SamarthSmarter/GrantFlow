#![cfg(test)]
use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Env, String};

#[test]
fn test_open_and_query_dispute() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let initiator = Address::generate(&env);
    let respondent = Address::generate(&env);

    let contract_id = env.register_contract(None, DisputeResolver);
    let client = DisputeResolverClient::new(&env, &contract_id);

    client.initialize(&admin);

    let dispute_id = String::from_str(&env, "DSP-001");
    let grant_id = String::from_str(&env, "grt_abc123");
    let reason = String::from_str(&env, "Milestone deliverables not met");
    let evidence = String::from_str(&env, "QmHash123abc");

    client.open_dispute(
        &initiator,
        &dispute_id,
        &grant_id,
        &respondent,
        &reason,
        &evidence,
    );

    let dispute = client.get_dispute(&dispute_id);
    assert_eq!(dispute.id, dispute_id);
    assert_eq!(dispute.grant_id, grant_id);
    assert_eq!(dispute.initiator, initiator);
    assert_eq!(dispute.respondent, respondent);
    assert_eq!(dispute.status, DisputeStatus::Open);

    let all = client.get_all_disputes();
    assert_eq!(all.len(), 1);

    let grant_disputes = client.get_grant_disputes(&grant_id);
    assert_eq!(grant_disputes.len(), 1);

    assert_eq!(client.dispute_count(), 1);
}

#[test]
fn test_review_and_resolve_dispute() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let initiator = Address::generate(&env);
    let respondent = Address::generate(&env);

    let contract_id = env.register_contract(None, DisputeResolver);
    let client = DisputeResolverClient::new(&env, &contract_id);

    client.initialize(&admin);

    let dispute_id = String::from_str(&env, "DSP-002");
    let grant_id = String::from_str(&env, "grt_xyz789");

    client.open_dispute(
        &initiator,
        &dispute_id,
        &grant_id,
        &respondent,
        &String::from_str(&env, "Funds not released on time"),
        &String::from_str(&env, "QmEvidenceHash"),
    );

    // Move to under review
    client.review_dispute(&admin, &dispute_id);
    let dispute = client.get_dispute(&dispute_id);
    assert_eq!(dispute.status, DisputeStatus::UnderReview);

    // Resolve in favor of applicant
    client.resolve_dispute(&admin, &dispute_id, &true);
    let dispute = client.get_dispute(&dispute_id);
    assert_eq!(dispute.status, DisputeStatus::ResolvedApplicant);
}

#[test]
fn test_dismiss_dispute() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let initiator = Address::generate(&env);
    let respondent = Address::generate(&env);

    let contract_id = env.register_contract(None, DisputeResolver);
    let client = DisputeResolverClient::new(&env, &contract_id);

    client.initialize(&admin);

    let dispute_id = String::from_str(&env, "DSP-003");
    let grant_id = String::from_str(&env, "grt_dismiss");

    client.open_dispute(
        &initiator,
        &dispute_id,
        &grant_id,
        &respondent,
        &String::from_str(&env, "Spurious claim"),
        &String::from_str(&env, "QmNoEvidence"),
    );

    client.dismiss_dispute(&admin, &dispute_id);
    let dispute = client.get_dispute(&dispute_id);
    assert_eq!(dispute.status, DisputeStatus::Dismissed);
}

#[test]
#[should_panic(expected = "already initialized")]
fn test_prevent_double_init() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = env.register_contract(None, DisputeResolver);
    let client = DisputeResolverClient::new(&env, &contract_id);

    client.initialize(&admin);
    client.initialize(&admin);
}

#[test]
#[should_panic(expected = "dispute already exists")]
fn test_prevent_duplicate_dispute() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let initiator = Address::generate(&env);
    let respondent = Address::generate(&env);

    let contract_id = env.register_contract(None, DisputeResolver);
    let client = DisputeResolverClient::new(&env, &contract_id);
    client.initialize(&admin);

    let dispute_id = String::from_str(&env, "DSP-DUP");
    let grant_id = String::from_str(&env, "grt_dup");

    client.open_dispute(
        &initiator,
        &dispute_id,
        &grant_id,
        &respondent,
        &String::from_str(&env, "First dispute"),
        &String::from_str(&env, "QmHash1"),
    );

    client.open_dispute(
        &initiator,
        &dispute_id,
        &grant_id,
        &respondent,
        &String::from_str(&env, "Duplicate dispute"),
        &String::from_str(&env, "QmHash2"),
    );
}

#[test]
#[should_panic(expected = "dispute not found")]
fn test_query_nonexistent_dispute() {
    let env = Env::default();
    let contract_id = env.register_contract(None, DisputeResolver);
    let client = DisputeResolverClient::new(&env, &contract_id);

    client.get_dispute(&String::from_str(&env, "NONEXISTENT"));
}

#[test]
#[should_panic(expected = "unauthorized")]
fn test_unauthorized_resolve() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let initiator = Address::generate(&env);
    let respondent = Address::generate(&env);
    let attacker = Address::generate(&env);

    let contract_id = env.register_contract(None, DisputeResolver);
    let client = DisputeResolverClient::new(&env, &contract_id);
    client.initialize(&admin);

    let dispute_id = String::from_str(&env, "DSP-AUTH");
    let grant_id = String::from_str(&env, "grt_auth");

    client.open_dispute(
        &initiator,
        &dispute_id,
        &grant_id,
        &respondent,
        &String::from_str(&env, "Auth test"),
        &String::from_str(&env, "QmAuthHash"),
    );

    // Non-admin tries to resolve
    client.resolve_dispute(&attacker, &dispute_id, &true);
}

#[test]
#[should_panic(expected = "dispute reason cannot be empty")]
fn test_empty_reason_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let initiator = Address::generate(&env);
    let respondent = Address::generate(&env);

    let contract_id = env.register_contract(None, DisputeResolver);
    let client = DisputeResolverClient::new(&env, &contract_id);
    client.initialize(&admin);

    client.open_dispute(
        &initiator,
        &String::from_str(&env, "DSP-EMPTY"),
        &String::from_str(&env, "grt_empty"),
        &respondent,
        &String::from_str(&env, ""),
        &String::from_str(&env, "QmHash"),
    );
}
