#![cfg(test)]
use super::*;
use soroban_sdk::testutils::{Address as _, Events};
use soroban_sdk::{vec, Env, IntoVal};

#[test]
fn test_submit_and_query_grant() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let escrow = Address::generate(&env);
    let applicant = Address::generate(&env);
    let grantor = Address::generate(&env);

    let contract_id = env.register_contract(None, GrantRegistry);
    let client = GrantRegistryClient::new(&env, &contract_id);

    client.initialize(&admin, &escrow);

    let grant_id = String::from_str(&env, "grt_001");
    let title = String::from_str(&env, "DeFi Analytics Dashboard");
    let proposal = String::from_str(&env, "Build a real-time analytics dashboard");
    let amount: i128 = 8500_0000000;
    let deadline: u64 = 1800000000;

    client.submit_grant(&applicant, &grant_id, &grantor, &amount, &title, &proposal, &deadline);

    let grant = client.get_grant(&grant_id);
    assert_eq!(grant.id, grant_id);
    assert_eq!(grant.applicant, applicant);
    assert_eq!(grant.grantor, grantor);
    assert_eq!(grant.amount, amount);
    assert_eq!(grant.status, GrantStatus::Pending);

    let list = client.get_all_grants();
    assert_eq!(list.len(), 1);
    assert_eq!(list.get(0).unwrap(), grant_id);
}

#[test]
fn test_grant_count_and_status_filter() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let escrow = Address::generate(&env);
    let applicant = Address::generate(&env);
    let grantor = Address::generate(&env);

    let contract_id = env.register_contract(None, GrantRegistry);
    let client = GrantRegistryClient::new(&env, &contract_id);
    client.initialize(&admin, &escrow);

    client.submit_grant(&applicant, &String::from_str(&env, "grt_a"), &grantor, &1000_0000000, &String::from_str(&env, "Grant A"), &String::from_str(&env, "Proposal A"), &1800000000);
    client.submit_grant(&applicant, &String::from_str(&env, "grt_b"), &grantor, &2000_0000000, &String::from_str(&env, "Grant B"), &String::from_str(&env, "Proposal B"), &1900000000);

    assert_eq!(client.get_grant_count(), 2);

    let pending = client.get_grants_by_status(&GrantStatus::Pending);
    assert_eq!(pending.len(), 2);
    let funded = client.get_grants_by_status(&GrantStatus::Funded);
    assert_eq!(funded.len(), 0);

    client.reject_grant(&String::from_str(&env, "grt_b"));
    let rejected = client.get_grants_by_status(&GrantStatus::Rejected);
    assert_eq!(rejected.len(), 1);
    let still_pending = client.get_grants_by_status(&GrantStatus::Pending);
    assert_eq!(still_pending.len(), 1);
}

#[test]
fn test_set_funded_by_escrow() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let escrow = Address::generate(&env);
    let applicant = Address::generate(&env);
    let grantor = Address::generate(&env);

    let contract_id = env.register_contract(None, GrantRegistry);
    let client = GrantRegistryClient::new(&env, &contract_id);
    client.initialize(&admin, &escrow);

    let grant_id = String::from_str(&env, "grt_fund");
    client.submit_grant(&applicant, &grant_id, &grantor, &5000_0000000, &String::from_str(&env, "Funded Grant"), &String::from_str(&env, "Testing funded flow"), &1800000000);

    client.set_funded(&escrow, &grant_id);
    let grant = client.get_grant(&grant_id);
    assert_eq!(grant.status, GrantStatus::Funded);

    let events = env.events().all();
    let last_event = events.last().unwrap();
    assert_eq!(last_event.1, vec![&env, Symbol::new(&env, "milestone_released").into_val(&env), grant_id.into_val(&env), applicant.into_val(&env)]);
}

#[test]
#[should_panic(expected = "unauthorized")]
fn test_unauthorized_set_funded() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let escrow = Address::generate(&env);
    let applicant = Address::generate(&env);
    let grantor = Address::generate(&env);
    let attacker = Address::generate(&env);

    let contract_id = env.register_contract(None, GrantRegistry);
    let client = GrantRegistryClient::new(&env, &contract_id);
    client.initialize(&admin, &escrow);

    let grant_id = String::from_str(&env, "grt_auth");
    client.submit_grant(&applicant, &grant_id, &grantor, &1000_0000000, &String::from_str(&env, "Auth Test"), &String::from_str(&env, "Testing auth"), &1800000000);
    client.set_funded(&attacker, &grant_id);
}

#[test]
#[should_panic(expected = "already initialized")]
fn test_prevent_double_initialization() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let escrow = Address::generate(&env);
    let contract_id = env.register_contract(None, GrantRegistry);
    let client = GrantRegistryClient::new(&env, &contract_id);
    client.initialize(&admin, &escrow);
    client.initialize(&admin, &escrow);
}

#[test]
#[should_panic(expected = "grant already exists")]
fn test_prevent_duplicate_grant_id() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let escrow = Address::generate(&env);
    let applicant = Address::generate(&env);
    let grantor = Address::generate(&env);
    let contract_id = env.register_contract(None, GrantRegistry);
    let client = GrantRegistryClient::new(&env, &contract_id);
    client.initialize(&admin, &escrow);

    let grant_id = String::from_str(&env, "grt_dup");
    client.submit_grant(&applicant, &grant_id, &grantor, &500_0000000, &String::from_str(&env, "Original"), &String::from_str(&env, "First submission"), &1800000000);
    client.submit_grant(&applicant, &grant_id, &grantor, &100_0000000, &String::from_str(&env, "Duplicate"), &String::from_str(&env, "Should fail"), &1800000000);
}

#[test]
#[should_panic(expected = "grant not found")]
fn test_non_existent_grant_retrieval() {
    let env = Env::default();
    let contract_id = env.register_contract(None, GrantRegistry);
    let client = GrantRegistryClient::new(&env, &contract_id);
    client.get_grant(&String::from_str(&env, "NONEXISTENT"));
}

#[test]
#[should_panic(expected = "grant amount must be positive")]
fn test_zero_amount_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let escrow = Address::generate(&env);
    let applicant = Address::generate(&env);
    let grantor = Address::generate(&env);
    let contract_id = env.register_contract(None, GrantRegistry);
    let client = GrantRegistryClient::new(&env, &contract_id);
    client.initialize(&admin, &escrow);
    client.submit_grant(&applicant, &String::from_str(&env, "grt_zero"), &grantor, &0, &String::from_str(&env, "Zero Grant"), &String::from_str(&env, "Should fail"), &1800000000);
}

#[test]
#[should_panic(expected = "grant amount must be positive")]
fn test_negative_amount_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let escrow = Address::generate(&env);
    let applicant = Address::generate(&env);
    let grantor = Address::generate(&env);
    let contract_id = env.register_contract(None, GrantRegistry);
    let client = GrantRegistryClient::new(&env, &contract_id);
    client.initialize(&admin, &escrow);
    client.submit_grant(&applicant, &String::from_str(&env, "grt_neg"), &grantor, &-500, &String::from_str(&env, "Negative Grant"), &String::from_str(&env, "Should fail"), &1800000000);
}

#[test]
fn test_reject_grant_by_applicant() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let escrow = Address::generate(&env);
    let applicant = Address::generate(&env);
    let grantor = Address::generate(&env);

    let contract_id = env.register_contract(None, GrantRegistry);
    let client = GrantRegistryClient::new(&env, &contract_id);
    client.initialize(&admin, &escrow);

    let grant_id = String::from_str(&env, "grt_reject");
    client.submit_grant(&applicant, &grant_id, &grantor, &1000_0000000, &String::from_str(&env, "Reject Test"), &String::from_str(&env, "Testing rejection"), &1800000000);

    client.reject_grant(&grant_id);
    let grant = client.get_grant(&grant_id);
    assert_eq!(grant.status, GrantStatus::Rejected);

    let events = env.events().all();
    let reject_event = events.last().unwrap();
    assert_eq!(reject_event.1, vec![&env, Symbol::new(&env, "grant_rejected").into_val(&env), grant_id.into_val(&env)]);
}

#[test]
fn test_admin_and_escrow_getters() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let escrow = Address::generate(&env);
    let contract_id = env.register_contract(None, GrantRegistry);
    let client = GrantRegistryClient::new(&env, &contract_id);
    client.initialize(&admin, &escrow);
    assert_eq!(client.get_admin(), admin);
    assert_eq!(client.get_milestone_escrow(), escrow);
}

#[test]
#[should_panic(expected = "milestone deadline must be in the future")]
fn test_past_deadline_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(2000000000);

    let admin = Address::generate(&env);
    let escrow = Address::generate(&env);
    let applicant = Address::generate(&env);
    let grantor = Address::generate(&env);
    let contract_id = env.register_contract(None, GrantRegistry);
    let client = GrantRegistryClient::new(&env, &contract_id);
    client.initialize(&admin, &escrow);

    client.submit_grant(&applicant, &String::from_str(&env, "grt_past"), &grantor, &1000_0000000, &String::from_str(&env, "Past Deadline Grant"), &String::from_str(&env, "Should fail deadline passed"), &1800000000);
}

#[test]
fn test_is_overdue_detection() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let escrow = Address::generate(&env);
    let applicant = Address::generate(&env);
    let grantor = Address::generate(&env);
    let contract_id = env.register_contract(None, GrantRegistry);
    let client = GrantRegistryClient::new(&env, &contract_id);
    client.initialize(&admin, &escrow);

    let grant_id = String::from_str(&env, "grt_overdue");
    client.submit_grant(&applicant, &grant_id, &grantor, &1000_0000000, &String::from_str(&env, "Overdue Grant"), &String::from_str(&env, "Testing overdue detection"), &500);

    assert!(!client.is_overdue(&grant_id));
    env.ledger().set_timestamp(1000);
    assert!(client.is_overdue(&grant_id));
}

#[test]
fn test_get_overdue_grants() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let escrow = Address::generate(&env);
    let applicant = Address::generate(&env);
    let grantor = Address::generate(&env);
    let contract_id = env.register_contract(None, GrantRegistry);
    let client = GrantRegistryClient::new(&env, &contract_id);
    client.initialize(&admin, &escrow);

    client.submit_grant(&applicant, &String::from_str(&env, "grt_od1"), &grantor, &1000_0000000, &String::from_str(&env, "Overdue One"), &String::from_str(&env, "First overdue"), &500);
    client.submit_grant(&applicant, &String::from_str(&env, "grt_od2"), &grantor, &2000_0000000, &String::from_str(&env, "Overdue Two"), &String::from_str(&env, "Second overdue"), &500);

    assert_eq!(client.get_overdue_grants().len(), 0);
    env.ledger().set_timestamp(1000);
    assert_eq!(client.get_overdue_grants().len(), 2);

    client.set_funded(&escrow, &String::from_str(&env, "grt_od1"));
    assert_eq!(client.get_overdue_grants().len(), 1);
}
