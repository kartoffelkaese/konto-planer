-- Erstelle die Datenbank
CREATE DATABASE IF NOT EXISTS konto_planer;
USE konto_planer;

-- Erstelle die users Tabelle
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    passwordHash VARCHAR(255) NOT NULL,
    salaryDay INT NOT NULL,
    accountName VARCHAR(255) DEFAULT 'Mein Konto',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Erstelle die categories Tabelle
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(36) PRIMARY KEY,
    userId VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#A7C7E7',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_category_name_per_user (userId, name)
);

-- Erstelle die merchants Tabelle
CREATE TABLE IF NOT EXISTS merchants (
    id VARCHAR(36) PRIMARY KEY,
    userId VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    categoryId VARCHAR(36),
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL,
    UNIQUE KEY unique_merchant_name_per_user (userId, name)
);

-- Erstelle die transactions Tabelle
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(36) PRIMARY KEY,
    userId VARCHAR(36) NOT NULL,
    description TEXT,
    merchant VARCHAR(255) NOT NULL,
    merchantId VARCHAR(36),
    amount DECIMAL(10,2) NOT NULL,
    date DATETIME NOT NULL,
    isConfirmed BOOLEAN NOT NULL DEFAULT FALSE,
    isRecurring BOOLEAN NOT NULL DEFAULT FALSE,
    recurringInterval VARCHAR(50),
    lastConfirmedDate DATETIME,
    version INT NOT NULL DEFAULT 1,
    parentTransactionId VARCHAR(36),
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (merchantId) REFERENCES merchants(id) ON DELETE SET NULL,
    FOREIGN KEY (parentTransactionId) REFERENCES transactions(id) ON DELETE SET NULL
);

-- Erstelle Indizes für bessere Performance
CREATE INDEX idx_transactions_user_date ON transactions(userId, date);
CREATE INDEX idx_transactions_merchant ON transactions(merchantId);
CREATE INDEX idx_transactions_parent ON transactions(parentTransactionId);
CREATE INDEX idx_merchants_user ON merchants(userId);
CREATE INDEX idx_categories_user ON categories(userId); 