#![no_std]
#![allow(deprecated)]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Symbol};

#[contracttype]
#[derive(Clone)]
pub struct Market {
    pub question: String,
    pub description: String,
    pub category: String,
    pub creator: Address,
    pub close_time: u64,
    pub resolution_time: u64,
    pub dispute_window: u64,
    pub status: u32,         // 0=Open, 1=Closed, 2=Resolving, 3=Disputed, 4=Finalized
    pub yes_pool: i128,
    pub no_pool: i128,
    pub oracle_result: u32,  // 0=None, 1=YES, 2=NO
    pub disputed: bool,
}

#[contracttype]
pub enum DataKey {
    Market(u64),
    UserYesBet(u64, Address),
    UserNoBet(u64, Address),
    Oracle,
    MarketCount,
}

#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    pub fn initialize(env: Env, oracle: Address) {
        assert!(!env.storage().instance().has(&DataKey::Oracle), "already initialized");
        env.storage().instance().set(&DataKey::Oracle, &oracle);
    }

    pub fn create_market(
        env: Env,
        creator: Address,
        question: String,
        description: String,
        category: String,
        close_time: u64,
        dispute_window: u64,
    ) -> u64 {
        creator.require_auth();
        assert!(close_time > env.ledger().timestamp(), "close time must be in the future");
        assert!(dispute_window > 0, "dispute window must be positive");
        assert!(question.len() > 0, "question must not be empty");

        let mut count: u64 = env.storage().instance().get(&DataKey::MarketCount).unwrap_or(0);
        count += 1;

        let market = Market {
            question,
            description,
            category,
            creator: creator.clone(),
            close_time,
            resolution_time: 0,
            dispute_window,
            status: 0,
            yes_pool: 0,
            no_pool: 0,
            oracle_result: 0,
            disputed: false,
        };

        env.storage().instance().set(&DataKey::Market(count), &market);
        env.storage().instance().set(&DataKey::MarketCount, &count);

        env.events().publish(
            (Symbol::new(&env, "market_created"),),
            (count, creator),
        );

        count
    }

    pub fn buy_yes(env: Env, user: Address, market_id: u64, amount: i128) {
        user.require_auth();
        assert!(amount > 0, "amount must be positive");

        let mut market: Market = env.storage()
            .instance()
            .get(&DataKey::Market(market_id))
            .expect("market not found");
        assert!(market.status == 0, "market not open");
        assert!(env.ledger().timestamp() < market.close_time, "betting closed");

        let key = DataKey::UserYesBet(market_id, user.clone());
        let existing: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        env.storage().persistent().set(&key, &(existing + amount));

        market.yes_pool = market.yes_pool.checked_add(amount).expect("pool overflow");
        env.storage().instance().set(&DataKey::Market(market_id), &market);

        env.events().publish(
            (Symbol::new(&env, "shares_purchased"),),
            (market_id, user, amount, 1u32),
        );
    }

    pub fn buy_no(env: Env, user: Address, market_id: u64, amount: i128) {
        user.require_auth();
        assert!(amount > 0, "amount must be positive");

        let mut market: Market = env.storage()
            .instance()
            .get(&DataKey::Market(market_id))
            .expect("market not found");
        assert!(market.status == 0, "market not open");
        assert!(env.ledger().timestamp() < market.close_time, "betting closed");

        let key = DataKey::UserNoBet(market_id, user.clone());
        let existing: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        env.storage().persistent().set(&key, &(existing + amount));

        market.no_pool = market.no_pool.checked_add(amount).expect("pool overflow");
        env.storage().instance().set(&DataKey::Market(market_id), &market);

        env.events().publish(
            (Symbol::new(&env, "shares_purchased"),),
            (market_id, user, amount, 2u32),
        );
    }

    pub fn close_market(env: Env, market_id: u64) {
        let mut market: Market = env.storage()
            .instance()
            .get(&DataKey::Market(market_id))
            .expect("market not found");
        assert!(market.status == 0, "market not open");
        assert!(
            env.ledger().timestamp() >= market.close_time,
            "close time not reached"
        );

        market.status = 1;
        env.storage().instance().set(&DataKey::Market(market_id), &market);

        env.events().publish((Symbol::new(&env, "market_closed"),), (market_id,));
    }

    pub fn resolve_market(env: Env, oracle: Address, market_id: u64, result: u32) {
        oracle.require_auth();
        assert!(result == 1 || result == 2, "invalid result");

        let stored: Address = env.storage()
            .instance()
            .get(&DataKey::Oracle)
            .expect("not initialized");
        assert_eq!(oracle, stored, "not authorized");

        let mut market: Market = env.storage()
            .instance()
            .get(&DataKey::Market(market_id))
            .expect("market not found");
        assert!(market.status == 1, "market not closed");

        market.status = 2;
        market.oracle_result = result;
        market.resolution_time = env.ledger().timestamp();
        env.storage().instance().set(&DataKey::Market(market_id), &market);

        env.events().publish(
            (Symbol::new(&env, "result_submitted"),),
            (market_id, result),
        );
    }

    pub fn raise_dispute(env: Env, caller: Address, market_id: u64) {
        caller.require_auth();

        let mut market: Market = env.storage()
            .instance()
            .get(&DataKey::Market(market_id))
            .expect("market not found");
        assert!(market.status == 2, "market not resolving");
        assert!(!market.disputed, "already disputed");

        let now = env.ledger().timestamp();
        assert!(
            now <= market.resolution_time + market.dispute_window,
            "dispute window expired"
        );

        market.disputed = true;
        market.status = 3;
        env.storage().instance().set(&DataKey::Market(market_id), &market);

        env.events().publish(
            (Symbol::new(&env, "dispute_raised"),),
            (market_id, caller),
        );
    }

    pub fn resolve_dispute(env: Env, oracle: Address, market_id: u64) {
        oracle.require_auth();

        let stored: Address = env.storage()
            .instance()
            .get(&DataKey::Oracle)
            .expect("not initialized");
        assert_eq!(oracle, stored, "not authorized");

        let mut market: Market = env.storage()
            .instance()
            .get(&DataKey::Market(market_id))
            .expect("market not found");
        assert!(market.status == 3, "market not disputed");
        assert!(market.disputed, "not disputed");

        market.disputed = false;
        market.status = 2;
        env.storage().instance().set(&DataKey::Market(market_id), &market);

        env.events().publish(
            (Symbol::new(&env, "dispute_resolved"),),
            (market_id,),
        );
    }

    pub fn finalize_market(env: Env, market_id: u64) {
        let mut market: Market = env.storage()
            .instance()
            .get(&DataKey::Market(market_id))
            .expect("market not found");
        assert!(
            market.status == 2 || market.status == 3,
            "market not resolving or disputed"
        );
        assert!(
            env.ledger().timestamp() > market.resolution_time + market.dispute_window,
            "dispute window not expired"
        );

        market.status = 4;
        env.storage().instance().set(&DataKey::Market(market_id), &market);

        env.events().publish(
            (Symbol::new(&env, "market_finalized"),),
            (market_id,),
        );
    }

    pub fn claim_reward(env: Env, user: Address, market_id: u64) -> i128 {
        user.require_auth();

        let market: Market = env.storage()
            .instance()
            .get(&DataKey::Market(market_id))
            .expect("market not found");
        assert!(market.status == 4, "market not finalized");

        let yes_key = DataKey::UserYesBet(market_id, user.clone());
        let no_key = DataKey::UserNoBet(market_id, user.clone());

        let user_yes: i128 = env.storage().persistent().get(&yes_key).unwrap_or(0);
        let user_no: i128 = env.storage().persistent().get(&no_key).unwrap_or(0);

        let (wager, pool) = if market.oracle_result == 1 {
            (user_yes, market.yes_pool)
        } else {
            (user_no, market.no_pool)
        };

        assert!(wager > 0, "nothing to claim");

        let total_pool = market.yes_pool + market.no_pool;
        let payout = wager * total_pool / pool;

        // Zero out positions to prevent double-claiming
        env.storage().persistent().remove(&yes_key);
        env.storage().persistent().remove(&no_key);

        env.events().publish(
            (Symbol::new(&env, "reward_claimed"),),
            (market_id, user, payout),
        );

        payout
    }

    // --- Query functions ---

    pub fn get_market(env: Env, market_id: u64) -> Market {
        env.storage()
            .instance()
            .get(&DataKey::Market(market_id))
            .expect("market not found")
    }

    pub fn get_odds(env: Env, market_id: u64) -> (u32, u32) {
        let market: Market = env.storage()
            .instance()
            .get(&DataKey::Market(market_id))
            .expect("market not found");
        let total = market.yes_pool + market.no_pool;
        if total == 0 {
            return (5000, 5000);
        }
        let yes_prob = (market.yes_pool * 10000 / total) as u32;
        let no_prob = (market.no_pool * 10000 / total) as u32;
        (yes_prob, no_prob)
    }

    pub fn get_position(env: Env, user: Address, market_id: u64) -> (i128, i128) {
        let yes_key = DataKey::UserYesBet(market_id, user.clone());
        let no_key = DataKey::UserNoBet(market_id, user.clone());
        let yes_bet: i128 = env.storage().persistent().get(&yes_key).unwrap_or(0);
        let no_bet: i128 = env.storage().persistent().get(&no_key).unwrap_or(0);
        (yes_bet, no_bet)
    }

    pub fn get_payout(env: Env, user: Address, market_id: u64) -> i128 {
        let market: Market = env.storage()
            .instance()
            .get(&DataKey::Market(market_id))
            .expect("market not found");

        if market.status < 4 {
            return 0;
        }

        let yes_key = DataKey::UserYesBet(market_id, user.clone());
        let no_key = DataKey::UserNoBet(market_id, user.clone());
        let user_yes: i128 = env.storage().persistent().get(&yes_key).unwrap_or(0);
        let user_no: i128 = env.storage().persistent().get(&no_key).unwrap_or(0);

        let (wager, pool) = if market.oracle_result == 1 {
            (user_yes, market.yes_pool)
        } else {
            (user_no, market.no_pool)
        };

        if wager == 0 || pool == 0 {
            return 0;
        }

        wager * (market.yes_pool + market.no_pool) / pool
    }

    pub fn get_market_count(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::MarketCount).unwrap_or(0)
    }
}

mod test;
