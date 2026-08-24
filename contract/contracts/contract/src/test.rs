#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Env, String};
use soroban_sdk::testutils::Ledger;

#[test]
fn test_initialize() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let oracle = Address::generate(&env);
    client.initialize(&oracle);
}

#[test]
#[should_panic(expected = "already initialized")]
fn test_double_initialize_panics() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let oracle = Address::generate(&env);
    client.initialize(&oracle);
    client.initialize(&oracle);
}

#[test]
fn test_create_market() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let oracle = Address::generate(&env);
    client.initialize(&oracle);

    let creator = Address::generate(&env);
    let question = String::from_str(&env, "Will BTC reach 150k by Dec 2026?");
    let description = String::from_str(&env, "Bitcoin price prediction market");
    let category = String::from_str(&env, "Crypto");
    let close_time: u64 = 2000000;
    let dispute_window: u64 = 86400; // 1 day

    let market_id = client.create_market(
        &creator, &question, &description, &category, &close_time, &dispute_window,
    );
    assert_eq!(market_id, 1);

    let market = client.get_market(&market_id);
    assert_eq!(market.question, question);
    assert_eq!(market.description, description);
    assert_eq!(market.category, category);
    assert_eq!(market.creator, creator);
    assert_eq!(market.close_time, close_time);
    assert_eq!(market.dispute_window, dispute_window);
    assert_eq!(market.status, 0); // Open
    assert_eq!(market.yes_pool, 0);
    assert_eq!(market.no_pool, 0);
    assert_eq!(market.oracle_result, 0); // None
    assert!(!market.disputed);
}

#[test]
fn test_buy_yes() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let oracle = Address::generate(&env);
    client.initialize(&oracle);

    let creator = Address::generate(&env);
    let market_id = client.create_market(
        &creator,
        &String::from_str(&env, "Will ETH reach 10k?"),
        &String::from_str(&env, "Ethereum price"),
        &String::from_str(&env, "Crypto"),
        &3000000u64,
        &86400u64,
    );

    let user = Address::generate(&env);
    client.buy_yes(&user, &market_id, &1000i128);

    let market = client.get_market(&market_id);
    assert_eq!(market.yes_pool, 1000);
    assert_eq!(market.no_pool, 0);

    let (yes_bet, no_bet) = client.get_position(&user, &market_id);
    assert_eq!(yes_bet, 1000);
    assert_eq!(no_bet, 0);
}

#[test]
fn test_buy_no() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let oracle = Address::generate(&env);
    client.initialize(&oracle);

    let creator = Address::generate(&env);
    let market_id = client.create_market(
        &creator,
        &String::from_str(&env, "Will SOL reach 500?"),
        &String::from_str(&env, "Solana price"),
        &String::from_str(&env, "Crypto"),
        &3000000u64,
        &86400u64,
    );

    let user = Address::generate(&env);
    client.buy_no(&user, &market_id, &500i128);

    let market = client.get_market(&market_id);
    assert_eq!(market.yes_pool, 0);
    assert_eq!(market.no_pool, 500);

    let (yes_bet, no_bet) = client.get_position(&user, &market_id);
    assert_eq!(yes_bet, 0);
    assert_eq!(no_bet, 500);
}

#[test]
fn test_odds_calculation() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let oracle = Address::generate(&env);
    client.initialize(&oracle);

    let creator = Address::generate(&env);
    let market_id = client.create_market(
        &creator,
        &String::from_str(&env, "Test odds?"),
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "General"),
        &3000000u64,
        &86400u64,
    );

    // Initial odds: no bets, 50/50
    let (yes_prob, no_prob) = client.get_odds(&market_id);
    assert_eq!(yes_prob, 5000);
    assert_eq!(no_prob, 5000);

    // User A bets 100 on YES, User B bets 300 on NO
    let user_a = Address::generate(&env);
    let user_b = Address::generate(&env);
    client.buy_yes(&user_a, &market_id, &100i128);
    client.buy_no(&user_b, &market_id, &300i128);

    // Total: 400, YES: 100, NO: 300
    // YES prob = 100/400 = 25% = 2500 bps
    // NO prob = 300/400 = 75% = 7500 bps
    let (yes_prob, no_prob) = client.get_odds(&market_id);
    assert_eq!(yes_prob, 2500);
    assert_eq!(no_prob, 7500);
}

#[test]
fn test_close_market() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let oracle = Address::generate(&env);
    client.initialize(&oracle);

    let creator = Address::generate(&env);
    let close_time: u64 = 2000000;
    let market_id = client.create_market(
        &creator,
        &String::from_str(&env, "Test close?"),
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "General"),
        &close_time,
        &86400u64,
    );

    // Advance time past close_time and close
    env.ledger().set_timestamp(close_time + 1);
    client.close_market(&market_id);

    let market = client.get_market(&market_id);
    assert_eq!(market.status, 1); // Closed
}

#[test]
#[should_panic(expected = "market not open")]
fn test_close_market_twice_panics() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let oracle = Address::generate(&env);
    client.initialize(&oracle);

    let creator = Address::generate(&env);
    let close_time: u64 = 2000000;
    let market_id = client.create_market(
        &creator,
        &String::from_str(&env, "Test double close?"),
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "General"),
        &close_time,
        &86400u64,
    );

    env.ledger().set_timestamp(close_time + 1);
    client.close_market(&market_id);
    client.close_market(&market_id); // should panic
}

#[test]
fn test_resolve_market() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let oracle = Address::generate(&env);
    client.initialize(&oracle);

    let creator = Address::generate(&env);
    let close_time: u64 = 2000000;
    let market_id = client.create_market(
        &creator,
        &String::from_str(&env, "Test resolve?"),
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "General"),
        &close_time,
        &86400u64,
    );

    let user_a = Address::generate(&env);
    let user_b = Address::generate(&env);
    client.buy_yes(&user_a, &market_id, &1000i128);
    client.buy_no(&user_b, &market_id, &500i128);

    env.ledger().set_timestamp(close_time + 1);
    client.close_market(&market_id);

    // Oracle resolves with YES (1)
    let resolution_time = close_time + 100;
    env.ledger().set_timestamp(resolution_time);
    client.resolve_market(&oracle, &market_id, &1u32);

    let market = client.get_market(&market_id);
    assert_eq!(market.status, 2); // Resolving
    assert_eq!(market.oracle_result, 1); // YES
    assert_eq!(market.resolution_time, resolution_time);
}

#[test]
#[should_panic(expected = "not authorized")]
fn test_resolve_market_unauthorized_panics() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let oracle = Address::generate(&env);
    client.initialize(&oracle);

    let creator = Address::generate(&env);
    let close_time: u64 = 2000000;
    let market_id = client.create_market(
        &creator,
        &String::from_str(&env, "Test?"),
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "General"),
        &close_time,
        &86400u64,
    );

    env.ledger().set_timestamp(close_time + 1);
    client.close_market(&market_id);

    // Wrong oracle tries to resolve
    let imposter = Address::generate(&env);
    client.resolve_market(&imposter, &market_id, &1u32);
}

#[test]
fn test_raise_and_resolve_dispute() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let oracle = Address::generate(&env);
    client.initialize(&oracle);

    let creator = Address::generate(&env);
    let close_time: u64 = 2000000;
    let dispute_window: u64 = 86400;
    let market_id = client.create_market(
        &creator,
        &String::from_str(&env, "Test dispute?"),
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "General"),
        &close_time,
        &dispute_window,
    );

    let user = Address::generate(&env);
    client.buy_yes(&user, &market_id, &100i128);

    env.ledger().set_timestamp(close_time + 1);
    client.close_market(&market_id);

    let resolution_time = close_time + 100;
    env.ledger().set_timestamp(resolution_time);
    client.resolve_market(&oracle, &market_id, &1u32);

    // Raise dispute (within dispute window)
    let disputer = Address::generate(&env);
    env.ledger().set_timestamp(resolution_time + dispute_window - 100);
    client.raise_dispute(&disputer, &market_id);

    let market = client.get_market(&market_id);
    assert_eq!(market.status, 3); // Disputed
    assert!(market.disputed);

    // Resolve dispute (oracle)
    env.ledger().set_timestamp(resolution_time + dispute_window - 50);
    client.resolve_dispute(&oracle, &market_id);

    let market = client.get_market(&market_id);
    assert_eq!(market.status, 2); // Back to Resolving
    assert!(!market.disputed);
}

#[test]
fn test_finalize_market() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let oracle = Address::generate(&env);
    client.initialize(&oracle);

    let creator = Address::generate(&env);
    let close_time: u64 = 2000000;
    let dispute_window: u64 = 86400;
    let market_id = client.create_market(
        &creator,
        &String::from_str(&env, "Test finalize?"),
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "General"),
        &close_time,
        &dispute_window,
    );

    let user = Address::generate(&env);
    client.buy_yes(&user, &market_id, &100i128);

    env.ledger().set_timestamp(close_time + 1);
    client.close_market(&market_id);

    let resolution_time = close_time + 100;
    env.ledger().set_timestamp(resolution_time);
    client.resolve_market(&oracle, &market_id, &1u32);

    // Advance past dispute window and finalize
    env.ledger().set_timestamp(resolution_time + dispute_window + 1);
    client.finalize_market(&market_id);

    let market = client.get_market(&market_id);
    assert_eq!(market.status, 4); // Finalized
}

#[test]
fn test_claim_reward_yes_wins() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let oracle = Address::generate(&env);
    client.initialize(&oracle);

    let creator = Address::generate(&env);
    let close_time: u64 = 2000000;
    let dispute_window: u64 = 86400;
    let market_id = client.create_market(
        &creator,
        &String::from_str(&env, "Test claim?"),
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "General"),
        &close_time,
        &dispute_window,
    );

    // User A bets 100 on YES
    let user_a = Address::generate(&env);
    client.buy_yes(&user_a, &market_id, &100i128);

    // User B bets 300 on NO
    let user_b = Address::generate(&env);
    client.buy_no(&user_b, &market_id, &300i128);

    // Close, resolve (YES wins), finalize
    env.ledger().set_timestamp(close_time + 1);
    client.close_market(&market_id);

    let resolution_time = close_time + 100;
    env.ledger().set_timestamp(resolution_time);
    client.resolve_market(&oracle, &market_id, &1u32);

    env.ledger().set_timestamp(resolution_time + dispute_window + 1);
    client.finalize_market(&market_id);

    // User A claims: 100 / 100 * 400 = 400 (4x)
    let payout = client.claim_reward(&user_a, &market_id);
    assert_eq!(payout, 400); 

    // User B's position should be zeroed (cannot claim, wrong side)
    let (yes, no) = client.get_position(&user_b, &market_id);
    assert_eq!(yes, 0);
    assert_eq!(no, 300); // still has NO position
}

#[test]
fn test_claim_reward_no_wins() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let oracle = Address::generate(&env);
    client.initialize(&oracle);

    let creator = Address::generate(&env);
    let close_time: u64 = 2000000;
    let dispute_window: u64 = 86400;
    let market_id = client.create_market(
        &creator,
        &String::from_str(&env, "Test claim NO?"),
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "General"),
        &close_time,
        &dispute_window,
    );

    let user_a = Address::generate(&env);
    client.buy_yes(&user_a, &market_id, &200i128);

    let user_b = Address::generate(&env);
    client.buy_no(&user_b, &market_id, &100i128);

    env.ledger().set_timestamp(close_time + 1);
    client.close_market(&market_id);

    let resolution_time = close_time + 100;
    env.ledger().set_timestamp(resolution_time);
    client.resolve_market(&oracle, &market_id, &2u32); // NO wins

    env.ledger().set_timestamp(resolution_time + dispute_window + 1);
    client.finalize_market(&market_id);

    // User B claims: 100 / 100 * 300 = 300 (3x)
    let payout = client.claim_reward(&user_b, &market_id);
    assert_eq!(payout, 300);
}

#[test]
#[should_panic(expected = "nothing to claim")]
fn test_claim_no_position_panics() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let oracle = Address::generate(&env);
    client.initialize(&oracle);

    let creator = Address::generate(&env);
    let close_time: u64 = 2000000;
    let dispute_window: u64 = 86400;
    let market_id = client.create_market(
        &creator,
        &String::from_str(&env, "Test?"),
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "General"),
        &close_time,
        &dispute_window,
    );

    env.ledger().set_timestamp(close_time + 1);
    client.close_market(&market_id);

    let resolution_time = close_time + 100;
    env.ledger().set_timestamp(resolution_time);
    client.resolve_market(&oracle, &market_id, &1u32);

    env.ledger().set_timestamp(resolution_time + dispute_window + 1);
    client.finalize_market(&market_id);

    // User with no position tries to claim
    let random_user = Address::generate(&env);
    client.claim_reward(&random_user, &market_id);
}

#[test]
fn test_get_market_count() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    assert_eq!(client.get_market_count(), 0);

    let oracle = Address::generate(&env);
    client.initialize(&oracle);

    let creator = Address::generate(&env);
    client.create_market(
        &creator,
        &String::from_str(&env, "M1"),
        &String::from_str(&env, "D1"),
        &String::from_str(&env, "General"),
        &1000000u64,
        &86400u64,
    );
    assert_eq!(client.get_market_count(), 1);

    client.create_market(
        &creator,
        &String::from_str(&env, "M2"),
        &String::from_str(&env, "D2"),
        &String::from_str(&env, "Sports"),
        &2000000u64,
        &86400u64,
    );
    assert_eq!(client.get_market_count(), 2);
}

#[test]
fn test_get_payout_before_finalized() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let oracle = Address::generate(&env);
    client.initialize(&oracle);

    let creator = Address::generate(&env);
    let market_id = client.create_market(
        &creator,
        &String::from_str(&env, "Test?"),
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "General"),
        &2000000u64,
        &86400u64,
    );

    let user = Address::generate(&env);
    client.buy_yes(&user, &market_id, &100i128);

    // Market not finalized yet — payout should be 0
    let payout = client.get_payout(&user, &market_id);
    assert_eq!(payout, 0);
}

#[test]
fn test_get_payout_after_finalized() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let oracle = Address::generate(&env);
    client.initialize(&oracle);

    let creator = Address::generate(&env);
    let close_time: u64 = 2000000;
    let dispute_window: u64 = 86400;
    let market_id = client.create_market(
        &creator,
        &String::from_str(&env, "Test payout?"),
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "General"),
        &close_time,
        &dispute_window,
    );

    let user = Address::generate(&env);
    client.buy_yes(&user, &market_id, &100i128);
    client.buy_no(&Address::generate(&env), &market_id, &100i128);

    env.ledger().set_timestamp(close_time + 1);
    client.close_market(&market_id);
    let resolution_time = close_time + 100;
    env.ledger().set_timestamp(resolution_time);
    client.resolve_market(&oracle, &market_id, &1u32);
    env.ledger().set_timestamp(resolution_time + dispute_window + 1);
    client.finalize_market(&market_id);

    let payout = client.get_payout(&user, &market_id);
    assert_eq!(payout, 200); // 100 / 100 * 200 = 200
}

#[test]
fn test_full_end_to_end_flow() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let oracle = Address::generate(&env);
    client.initialize(&oracle);

    let creator = Address::generate(&env);
    let close_time: u64 = 3000000;
    let dispute_window: u64 = 86400;

    let market_id = client.create_market(
        &creator,
        &String::from_str(&env, "Will XRP reach $5 by June 2026?"),
        &String::from_str(&env, "XRP price prediction"),
        &String::from_str(&env, "Crypto"),
        &close_time,
        &dispute_window,
    );
    assert_eq!(market_id, 1);

    // Multiple users bet
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let charlie = Address::generate(&env);

    client.buy_yes(&alice, &market_id, &5000i128);
    client.buy_no(&bob, &market_id, &2000i128);
    client.buy_yes(&charlie, &market_id, &3000i128);

    // Check odds: YES = (5000+3000)/(5000+2000+3000) = 8000/10000 = 80% = 8000 bps
    let (yes_prob, _) = client.get_odds(&market_id);
    assert_eq!(yes_prob, 8000);

    // Advance time and close
    env.ledger().set_timestamp(close_time + 1);
    client.close_market(&market_id);

    // Oracle resolves YES
    let resolution_time = close_time + 1000;
    env.ledger().set_timestamp(resolution_time);
    client.resolve_market(&oracle, &market_id, &1u32);

    // Raise dispute
    let disputer = Address::generate(&env);
    env.ledger().set_timestamp(resolution_time + dispute_window - 500);
    client.raise_dispute(&disputer, &market_id);
    assert_eq!(client.get_market(&market_id).status, 3); // Disputed

    // Resolve dispute
    client.resolve_dispute(&oracle, &market_id);
    assert_eq!(client.get_market(&market_id).status, 2); // Back to Resolving

    // Finalize
    env.ledger().set_timestamp(resolution_time + dispute_window + 1);
    client.finalize_market(&market_id);
    assert_eq!(client.get_market(&market_id).status, 4); // Finalized

    // Claims
    // Alice: 5000 / 8000 * 10000 = 6250
    // Charlie: 3000 / 8000 * 10000 = 3750
    // Bob: cannot claim (on losing side)
    assert_eq!(client.claim_reward(&alice, &market_id), 6250);
    assert_eq!(client.claim_reward(&charlie, &market_id), 3750);

    // Verify Bob still has his NO position (can't claim)
    let (yes, no) = client.get_position(&bob, &market_id);
    assert_eq!(yes, 0);
    assert_eq!(no, 2000);
}
