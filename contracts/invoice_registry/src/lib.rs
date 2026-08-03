#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Env, String, Symbol, Vec
};

/// Invoice status tracking
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[contracttype]
pub enum InvoiceStatus {
    Created = 0,
    Paid = 1,
    Cancelled = 2,
}

/// Core Invoice structure stored on-chain
#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct Invoice {
    pub id: String,
    pub creator: Address,
    pub client: Address,
    pub amount: i128,          // Amount in Stroops (1 XLM = 10_000_000 stroops)
    pub title: String,
    pub description: String,
    pub due_date: u64,         // Unix epoch timestamp
    pub status: InvoiceStatus,
}

/// Storage key enum for invoice persistent/instance storage
#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    PaymentManager,           // Address of the Payment Manager contract
    Invoice(String),          // Individual invoice keyed by invoice ID
    InvoiceList,              // List of all invoice IDs
}

/// GrantFlow Invoice Registry Contract
///
/// Stores invoice metadata, tracks status transitions
/// (Created → Paid or Created → Cancelled), and emits on-chain events
/// for transparency and indexer consumption.
#[contract]
pub struct InvoiceRegistry;

#[contractimpl]
#[allow(clippy::too_many_arguments)]
impl InvoiceRegistry {

    /// Initialize the contract with an admin and payment manager address.
    /// Can only be called once.
    pub fn initialize(env: Env, admin: Address, payment_manager: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::PaymentManager, &payment_manager);
    }

    /// Returns the registered admin address.
    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }

    /// Returns the registered Payment Manager contract address.
    pub fn get_payment_manager(env: Env) -> Address {
        env.storage().instance().get(&DataKey::PaymentManager).unwrap()
    }

    /// Create a new invoice (invoked by the invoice creator).
    ///
    /// Arguments:
    /// - `creator`: Address creating the invoice (must sign)
    /// - `id`: Unique invoice identifier (e.g. "INV-001")
    /// - `client`: Address of the client who will pay
    /// - `amount`: Invoice amount in Stroops
    /// - `title`: Invoice title/subject
    /// - `description`: Detailed description of services
    /// - `due_date`: Unix timestamp for payment due date
    #[allow(clippy::too_many_arguments)]
    pub fn create_invoice(
        env: Env,
        creator: Address,
        id: String,
        client: Address,
        amount: i128,
        title: String,
        description: String,
        due_date: u64,
    ) {
        // Authenticate creator
        creator.require_auth();

        if amount <= 0 {
            panic!("amount must be positive");
        }

        let key = DataKey::Invoice(id.clone());
        if env.storage().persistent().has(&key) {
            panic!("invoice already exists with this ID");
        }

        let invoice = Invoice {
            id: id.clone(),
            creator: creator.clone(),
            client: client.clone(),
            amount,
            title,
            description,
            due_date,
            status: InvoiceStatus::Created,
        };

        // Write to persistent storage
        env.storage().persistent().set(&key, &invoice);

        // Update invoice list
        let mut list: Vec<String> = env
            .storage()
            .persistent()
            .get(&DataKey::InvoiceList)
            .unwrap_or(Vec::new(&env));
        list.push_back(id.clone());
        env.storage().persistent().set(&DataKey::InvoiceList, &list);

        // Emit on-chain event
        env.events().publish(
            (Symbol::new(&env, "invoice_created"), id.clone(), creator.clone()),
            (client, amount),
        );
    }

    /// Retrieve a single invoice by ID.
    pub fn get_invoice(env: Env, id: String) -> Invoice {
        let key = DataKey::Invoice(id);
        if !env.storage().persistent().has(&key) {
            panic!("invoice not found");
        }
        env.storage().persistent().get(&key).unwrap()
    }

    /// Fetch all registered invoice IDs.
    pub fn get_all_invoices(env: Env) -> Vec<String> {
        env.storage()
            .persistent()
            .get(&DataKey::InvoiceList)
            .unwrap_or(Vec::new(&env))
    }

    /// Returns the total count of registered invoices.
    pub fn get_invoice_count(env: Env) -> u32 {
        let list: Vec<String> = env
            .storage()
            .persistent()
            .get(&DataKey::InvoiceList)
            .unwrap_or(Vec::new(&env));
        list.len()
    }

    /// Mark an invoice as Paid (transition: Created → Paid).
    ///
    /// Restricted to the registered PaymentManager contract address.
    pub fn set_paid(env: Env, caller: Address, id: String) {
        caller.require_auth();

        let pm = Self::get_payment_manager(env.clone());
        if caller != pm {
            panic!("unauthorized status transition");
        }

        let key = DataKey::Invoice(id.clone());
        let mut invoice: Invoice = env.storage().persistent().get(&key).unwrap_or_else(|| {
            panic!("invoice not found");
        });

        if invoice.status != InvoiceStatus::Created {
            panic!("invoice status is not Created");
        }

        invoice.status = InvoiceStatus::Paid;
        env.storage().persistent().set(&key, &invoice);

        env.events().publish(
            (Symbol::new(&env, "invoice_paid"), id.clone(), invoice.creator.clone()),
            (invoice.client.clone(), invoice.amount),
        );
    }

    /// Cancel an invoice (transition: Created → Cancelled).
    ///
    /// Only the original creator may cancel their own invoice.
    pub fn cancel_invoice(env: Env, id: String) {
        let key = DataKey::Invoice(id.clone());
        let mut invoice: Invoice = env.storage().persistent().get(&key).unwrap_or_else(|| {
            panic!("invoice not found");
        });

        // Require creator's signature
        invoice.creator.require_auth();

        if invoice.status != InvoiceStatus::Created {
            panic!("invoice cannot be cancelled in current status");
        }

        invoice.status = InvoiceStatus::Cancelled;
        env.storage().persistent().set(&key, &invoice);

        env.events().publish(
            (Symbol::new(&env, "invoice_cancelled"), id.clone()),
            invoice.creator.clone(),
        );
    }
}

mod test;
