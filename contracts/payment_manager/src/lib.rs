#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Env, String, Symbol
};

/// Invoice status enum — mirrors the InvoiceRegistry XDR schema
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[contracttype]
pub enum InvoiceStatus {
    Created = 0,
    Paid = 1,
    Cancelled = 2,
}

/// Invoice structure — mirrors the InvoiceRegistry XDR schema
#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct Invoice {
    pub id: String,
    pub creator: Address,
    pub client: Address,
    pub amount: i128,            // Amount in Stroops (1 XLM = 10_000_000 stroops)
    pub title: String,
    pub description: String,
    pub due_date: u64,           // Unix epoch timestamp
    pub status: InvoiceStatus,
}

/// Client interface for InvoiceRegistry contract-to-contract calls
#[soroban_sdk::contractclient(name = "InvoiceRegistryClient")]
pub trait InvoiceRegistryClientTrait {
    fn get_invoice(env: Env, id: String) -> Invoice;
    fn set_paid(env: Env, caller: Address, id: String);
}

/// Storage keys for PaymentManager
#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    Token,
    Registry,
}

/// GrantFlow Payment Manager Contract
///
/// Orchestrates invoice-based payments for the GrantFlow protocol.
/// On `pay_invoice`, it:
///   1. Reads invoice details from the InvoiceRegistry via C2C call
///   2. Validates the caller is the designated client
///   3. Transfers XLM from the client to the invoice creator via SAC
///   4. Updates the invoice status to Paid in the InvoiceRegistry via C2C call
///   5. Emits a `payment_processed` event for indexers
#[contract]
pub struct PaymentManager;

#[contractimpl]
impl PaymentManager {
    /// Initialize the PaymentManager with admin, native token, and registry addresses.
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

    /// Returns the registered InvoiceRegistry contract address.
    pub fn get_registry(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Registry).unwrap()
    }

    /// Pay an invoice.
    ///
    /// Arguments:
    /// - `caller`: The address paying the invoice (must be the designated client)
    /// - `invoice_id`: The unique invoice identifier
    ///
    /// Flow:
    /// 1. Authenticates caller
    /// 2. Fetches invoice details from InvoiceRegistry (C2C)
    /// 3. Validates caller is the designated client
    /// 4. Validates invoice is in Created status
    /// 5. Validates amount is positive
    /// 6. Transfers XLM from caller to invoice creator via SAC
    /// 7. Updates invoice status to Paid in InvoiceRegistry (C2C)
    /// 8. Emits `payment_processed` event
    pub fn pay_invoice(env: Env, caller: Address, invoice_id: String) {
        // Authenticate the caller
        caller.require_auth();

        let token_addr = Self::get_token(env.clone());
        let registry_addr = Self::get_registry(env.clone());

        // Instantiate clients for cross-contract calls
        let token_client = soroban_sdk::token::Client::new(&env, &token_addr);
        let registry_client = InvoiceRegistryClient::new(&env, &registry_addr);

        // Fetch invoice details from InvoiceRegistry (Contract-to-Contract Call)
        let invoice: Invoice = registry_client.get_invoice(&invoice_id);

        // Validate caller is the designated client for this invoice
        if caller != invoice.client {
            panic!("caller is not the designated client");
        }

        // Validate invoice status is Created
        if invoice.status != InvoiceStatus::Created {
            panic!("invoice status is not Created");
        }

        // Validate amount is positive (defense in depth)
        if invoice.amount <= 0 {
            panic!("invoice amount must be positive");
        }

        // Transfer XLM from caller to invoice creator (Stellar Asset Contract)
        token_client.transfer(&caller, &invoice.creator, &invoice.amount);

        // Update InvoiceRegistry status to Paid (Contract-to-Contract Call)
        registry_client.set_paid(&env.current_contract_address(), &invoice_id);

        // Emit payment processed event for indexers
        env.events().publish(
            (Symbol::new(&env, "payment_processed"), invoice_id.clone(), caller.clone()),
            (invoice.creator.clone(), invoice.amount),
        );
    }
}

mod test;
