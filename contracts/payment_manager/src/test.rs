#![cfg(test)]
use super::*;
use soroban_sdk::testutils::{Address as _, Events};
use soroban_sdk::{vec, Env, Address, String, Symbol, IntoVal};
use invoice_registry::{InvoiceRegistry, InvoiceRegistryClient as RegistryContractClient, InvoiceStatus as RegistryInvoiceStatus};

#[test]
fn test_successful_c2c_payment() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let client = Address::generate(&env);
    let creator = Address::generate(&env);

    // Register token contract (Stellar Asset Contract)
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let token_addr = sac.address();
    let token_client = soroban_sdk::token::Client::new(&env, &token_addr);
    let sac_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_addr);

    // Register registry contract
    let registry_addr = env.register_contract(None, InvoiceRegistry);
    let registry_client = RegistryContractClient::new(&env, &registry_addr);

    // Register payment manager contract
    let payment_mgr_addr = env.register_contract(None, PaymentManager);
    let payment_mgr_client = PaymentManagerClient::new(&env, &payment_mgr_addr);

    // Initialize contracts
    registry_client.initialize(&admin, &payment_mgr_addr);
    payment_mgr_client.initialize(&admin, &token_addr, &registry_addr);

    // Setup invoice details
    let invoice_id = String::from_str(&env, "INV-100");
    let amount = 100_0000000; // 100 XLM
    
    registry_client.create_invoice(
        &creator,
        &invoice_id,
        &client,
        &amount,
        &String::from_str(&env, "Server Setup"),
        &String::from_str(&env, "Deploying cloud instances"),
        &1900000000,
    );

    // Mint tokens to client to pay
    sac_client.mint(&client, &amount);
    assert_eq!(token_client.balance(&client), amount);
    assert_eq!(token_client.balance(&creator), 0);

    // Execute Payment via PaymentManager (Client pays)
    payment_mgr_client.pay_invoice(&client, &invoice_id);

    // Verify balances changed
    assert_eq!(token_client.balance(&client), 0);
    assert_eq!(token_client.balance(&creator), amount);

    // Verify status changed in Registry to Paid
    let invoice = registry_client.get_invoice(&invoice_id);
    assert_eq!(invoice.status, RegistryInvoiceStatus::Paid);

    // Verify events emitted
    let events = env.events().all();
    let payment_event = events.last().unwrap();
    assert_eq!(
        payment_event.1,
        vec![
            &env,
            Symbol::new(&env, "payment_processed").into_val(&env),
            invoice_id.into_val(&env),
            client.into_val(&env)
        ]
    );
}

#[test]
#[should_panic(expected = "caller is not the designated client")]
fn test_unauthorized_payment_client() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let client = Address::generate(&env);
    let creator = Address::generate(&env);
    let attacker = Address::generate(&env);

    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let token_addr = sac.address();
    let sac_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_addr);

    let registry_addr = env.register_contract(None, InvoiceRegistry);
    let registry_client = RegistryContractClient::new(&env, &registry_addr);

    let payment_mgr_addr = env.register_contract(None, PaymentManager);
    let payment_mgr_client = PaymentManagerClient::new(&env, &payment_mgr_addr);

    registry_client.initialize(&admin, &payment_mgr_addr);
    payment_mgr_client.initialize(&admin, &token_addr, &registry_addr);

    let invoice_id = String::from_str(&env, "INV-101");
    let amount = 100_0000000;
    
    registry_client.create_invoice(
        &creator,
        &invoice_id,
        &client,
        &amount,
        &String::from_str(&env, "Server Setup"),
        &String::from_str(&env, "Deploying cloud instances"),
        &1900000000,
    );

    sac_client.mint(&attacker, &amount);

    // Attacker tries to pay invoice belonging to client
    payment_mgr_client.pay_invoice(&attacker, &invoice_id);
}

#[test]
#[should_panic(expected = "invoice status is not Created")]
fn test_double_payment_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let client = Address::generate(&env);
    let creator = Address::generate(&env);

    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let token_addr = sac.address();
    let token_client = soroban_sdk::token::Client::new(&env, &token_addr);
    let sac_client = soroban_sdk::token::StellarAssetClient::new(&env, &token_addr);

    let registry_addr = env.register_contract(None, InvoiceRegistry);
    let registry_client = RegistryContractClient::new(&env, &registry_addr);

    let payment_mgr_addr = env.register_contract(None, PaymentManager);
    let payment_mgr_client = PaymentManagerClient::new(&env, &payment_mgr_addr);

    registry_client.initialize(&admin, &payment_mgr_addr);
    payment_mgr_client.initialize(&admin, &token_addr, &registry_addr);

    let invoice_id = String::from_str(&env, "INV-102");
    let amount = 100_0000000;
    
    registry_client.create_invoice(
        &creator,
        &invoice_id,
        &client,
        &amount,
        &String::from_str(&env, "Server Setup"),
        &String::from_str(&env, "Deploying cloud instances"),
        &1900000000,
    );

    sac_client.mint(&client, &(amount * 2));
    assert_eq!(token_client.balance(&client), amount * 2);

    // Pay first time
    payment_mgr_client.pay_invoice(&client, &invoice_id);

    // Pay second time (should panic because invoice status is Paid)
    payment_mgr_client.pay_invoice(&client, &invoice_id);
}

#[test]
#[should_panic(expected = "already initialized")]
fn test_double_initialization_fails() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let token = Address::generate(&env);
    let registry = Address::generate(&env);

    let payment_mgr_addr = env.register_contract(None, PaymentManager);
    let payment_mgr_client = PaymentManagerClient::new(&env, &payment_mgr_addr);

    payment_mgr_client.initialize(&admin, &token, &registry);
    payment_mgr_client.initialize(&admin, &token, &registry);
}
