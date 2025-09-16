-- schema.sql
-- WARNING: DROP statements included for fresh local setup. Remove them if you don't want to drop existing tables.
SET FOREIGN_KEY_CHECKS=0;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS disputes;
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS tournament_participants;
DROP TABLE IF EXISTS tournament_prizes;
DROP TABLE IF EXISTS tournaments;
DROP TABLE IF EXISTS games;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS=1;

-- 1) users
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    wallet_balance DECIMAL(10,2) DEFAULT 0.00,
    role ENUM('user','admin') DEFAULT 'user',
    is_verified BOOLEAN DEFAULT FALSE,
    is_banned BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) games
CREATE TABLE games (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    logo_url VARCHAR(512),
    status ENUM('active','inactive') DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3) tournaments
CREATE TABLE tournaments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    game_id INT NOT NULL,
    format ENUM('single_elimination','double_elimination','round_robin') DEFAULT 'single_elimination',
    entry_fee DECIMAL(10,2) NOT NULL,
    total_slots INT NOT NULL,
    current_slots INT DEFAULT 0,
    status ENUM('open','locked','live','completed','cancelled') DEFAULT 'open',
    visibility ENUM('public','private') DEFAULT 'public',
    rules TEXT NULL,
    created_by INT NOT NULL,
    start_time DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tournaments_game_id (game_id),
    INDEX idx_tournaments_status (status),
    FOREIGN KEY (game_id) REFERENCES games(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4) tournament_prizes
CREATE TABLE tournament_prizes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tournament_id INT NOT NULL,
    position INT NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    UNIQUE KEY unique_prize (tournament_id, position),
    INDEX idx_prizes_tournament_id (tournament_id),
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5) tournament_participants
CREATE TABLE tournament_participants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tournament_id INT NOT NULL,
    user_id INT NOT NULL,
    gamer_tag VARCHAR(255) NULL,
    final_standing INT NULL,
    checked_in BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_participants_tournament_id (tournament_id),
    INDEX idx_participants_user_id (user_id),
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6) matches
CREATE TABLE matches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tournament_id INT NOT NULL,
    round_number INT NOT NULL,
    participant1_id INT NOT NULL,
    participant2_id INT NOT NULL,
    participant1_score INT DEFAULT 0,
    participant2_score INT DEFAULT 0,
    status ENUM('scheduled','completed','disputed') DEFAULT 'scheduled',
    scheduled_time DATETIME NULL,
    reported_by_user_id INT NULL,
    winner_id INT NULL, -- references tournament_participants.id
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_matches_tournament_id (tournament_id),
    INDEX idx_matches_participant1 (participant1_id),
    INDEX idx_matches_participant2 (participant2_id),
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (participant1_id) REFERENCES tournament_participants(id),
    FOREIGN KEY (participant2_id) REFERENCES tournament_participants(id),
    FOREIGN KEY (reported_by_user_id) REFERENCES users(id),
    FOREIGN KEY (winner_id) REFERENCES tournament_participants(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7) disputes
CREATE TABLE disputes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    match_id INT NOT NULL,
    raised_by_user_id INT NOT NULL,
    reason TEXT NOT NULL,
    evidence_url VARCHAR(512) NULL,
    status ENUM('open','under_review','resolved') DEFAULT 'open',
    resolution_details TEXT NULL,
    resolved_by_admin_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP NULL,
    INDEX idx_disputes_match_id (match_id),
    INDEX idx_disputes_raised_by (raised_by_user_id),
    FOREIGN KEY (match_id) REFERENCES matches(id),
    FOREIGN KEY (raised_by_user_id) REFERENCES users(id),
    FOREIGN KEY (resolved_by_admin_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8) transactions
CREATE TABLE transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('deposit','withdrawal','tournament_entry','prize_won','refund') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    balance_before DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    status ENUM('pending','completed','failed') DEFAULT 'pending',
    pesapal_transaction_id VARCHAR(255) NULL,
    transaction_reference VARCHAR(255) NULL UNIQUE,
    currency VARCHAR(10) DEFAULT 'TZS',
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_transactions_user_created (user_id, created_at),
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

