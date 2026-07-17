#![cfg(test)]
use super::*;
use soroban_sdk::testutils::{Address as _, Events};
use soroban_sdk::{vec, Env, IntoVal};

#[test]
fn test_create_and_query_invoice() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let payment_mgr = Address::generate(&env);
    let client = Address::generate(&env);
    let creator = Address::generate(&env);

    let contract_id = env.register_contract(None, InvoiceRegistry);
    let client_reg = InvoiceRegistryClient::new(&env, &contract_id);

    client_reg.initialize(&admin, &payment_mgr);

    let invoice_id = String::from_str(&env, "INV-001");
    let title = String::from_str(&env, "Consulting Fee");
    let desc = String::from_str(&env, "10 hours of dev work");
    let amount = 500_0000000; // 500 XLM
    let due = 1800000000;

    // Create Invoice
    client_reg.create_invoice(&creator, &invoice_id, &client, &amount, &title, &desc, &due);

    // Verify Invoice fields
    let invoice = client_reg.get_invoice(&invoice_id);
    assert_eq!(invoice.id, invoice_id);
    assert_eq!(invoice.creator, creator);
    assert_eq!(invoice.client, client);
    assert_eq!(invoice.amount, amount);
    assert_eq!(invoice.status, InvoiceStatus::Created);

    // Verify Invoice List
    let list = client_reg.get_all_invoices();
    assert_eq!(list.len(), 1);
    assert_eq!(list.get(0).unwrap(), invoice_id);
}

#[test]
#[should_panic(expected = "unauthorized status transition")]
fn test_unauthorized_pay_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let payment_mgr = Address::generate(&env);
    let client = Address::generate(&env);
    let creator = Address::generate(&env);

    let contract_id = env.register_contract(None, InvoiceRegistry);
    let client_reg = InvoiceRegistryClient::new(&env, &contract_id);

    client_reg.initialize(&admin, &payment_mgr);

    let invoice_id = String::from_str(&env, "INV-001");
    client_reg.create_invoice(
        &creator,
        &invoice_id,
        &client,
        &500_0000000,
        &String::from_str(&env, "Title"),
        &String::from_str(&env, "Desc"),
        &1800000000,
    );

    // Some random address tries to set it as Paid
    let attacker = Address::generate(&env);
    client_reg.set_paid(&attacker, &invoice_id);
}

#[test]
fn test_authorized_pay_and_cancellation() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let payment_mgr = Address::generate(&env);
    let client = Address::generate(&env);
    let creator = Address::generate(&env);

    let contract_id = env.register_contract(None, InvoiceRegistry);
    let client_reg = InvoiceRegistryClient::new(&env, &contract_id);

    client_reg.initialize(&admin, &payment_mgr);

    let invoice_id = String::from_str(&env, "INV-001");
    client_reg.create_invoice(
        &creator,
        &invoice_id,
        &client,
        &500_0000000,
        &String::from_str(&env, "Title"),
        &String::from_str(&env, "Desc"),
        &1800000000,
    );

    // Cancel invoice as creator
    client_reg.cancel_invoice(&invoice_id);
    let invoice = client_reg.get_invoice(&invoice_id);
    assert_eq!(invoice.status, InvoiceStatus::Cancelled);

    // Check cancellation event
    let events = env.events().all();
    let cancel_event = events.last().unwrap();
    assert_eq!(
        cancel_event.1,
        vec![
            &env,
            Symbol::new(&env, "invoice_cancelled").into_val(&env),
            invoice_id.into_val(&env)
        ]
    );
}

#[test]
#[should_panic(expected = "already initialized")]
fn test_prevent_double_initialization() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let payment_mgr = Address::generate(&env);
    let contract_id = env.register_contract(None, InvoiceRegistry);
    let client_reg = InvoiceRegistryClient::new(&env, &contract_id);

    client_reg.initialize(&admin, &payment_mgr);
    client_reg.initialize(&admin, &payment_mgr);
}

#[test]
#[should_panic(expected = "invoice already exists")]
fn test_prevent_duplicate_invoice_id() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let payment_mgr = Address::generate(&env);
    let client = Address::generate(&env);
    let creator = Address::generate(&env);
    let contract_id = env.register_contract(None, InvoiceRegistry);
    let client_reg = InvoiceRegistryClient::new(&env, &contract_id);
    client_reg.initialize(&admin, &payment_mgr);

    let invoice_id = String::from_str(&env, "INV-001");
    client_reg.create_invoice(
        &creator,
        &invoice_id,
        &client,
        &500_0000000,
        &String::from_str(&env, "Title"),
        &String::from_str(&env, "Desc"),
        &1800000000,
    );
    client_reg.create_invoice(
        &creator,
        &invoice_id,
        &client,
        &100_0000000,
        &String::from_str(&env, "Title 2"),
        &String::from_str(&env, "Desc 2"),
        &1800000000,
    );
}

#[test]
#[should_panic(expected = "invoice not found")]
fn test_non_existent_invoice_retrieval() {
    let env = Env::default();
    let contract_id = env.register_contract(None, InvoiceRegistry);
    let client_reg = InvoiceRegistryClient::new(&env, &contract_id);

    client_reg.get_invoice(&String::from_str(&env, "NON-EXISTENT"));
}

#[test]
#[should_panic(expected = "amount must be positive")]
fn test_create_invoice_with_invalid_amount() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let payment_mgr = Address::generate(&env);
    let client = Address::generate(&env);
    let creator = Address::generate(&env);
    let contract_id = env.register_contract(None, InvoiceRegistry);
    let client_reg = InvoiceRegistryClient::new(&env, &contract_id);
    client_reg.initialize(&admin, &payment_mgr);

    client_reg.create_invoice(
        &creator,
        &String::from_str(&env, "INV-001"),
        &client,
        &-500,
        &String::from_str(&env, "Title"),
        &String::from_str(&env, "Desc"),
        &1800000000,
    );
}
