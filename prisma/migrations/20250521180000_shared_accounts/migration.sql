-- Shared accounts: migrate user-scoped data to accounts

CREATE TABLE `accounts` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `salaryDay` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `account_members` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('OWNER', 'MEMBER') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `account_members_accountId_userId_key`(`accountId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `account_invites` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `invitedByUserId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'REVOKED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `account_invites_accountId_email_key`(`accountId`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `_migration_user_account` (
    `userId` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `_migration_user_account` (`userId`, `accountId`)
SELECT `id`, UUID() FROM `users`;

INSERT INTO `accounts` (`id`, `name`, `salaryDay`, `createdAt`)
SELECT
    m.`accountId`,
    COALESCE(u.`accountName`, 'Mein Konto'),
    u.`salaryDay`,
    u.`createdAt`
FROM `users` u
INNER JOIN `_migration_user_account` m ON m.`userId` = u.`id`;

INSERT INTO `account_members` (`id`, `accountId`, `userId`, `role`, `createdAt`)
SELECT UUID(), m.`accountId`, m.`userId`, 'OWNER', u.`createdAt`
FROM `_migration_user_account` m
INNER JOIN `users` u ON u.`id` = m.`userId`;

ALTER TABLE `transactions` ADD COLUMN `accountId` VARCHAR(191) NULL;
ALTER TABLE `merchants` ADD COLUMN `accountId` VARCHAR(191) NULL;
ALTER TABLE `categories` ADD COLUMN `accountId` VARCHAR(191) NULL;

UPDATE `transactions` t
INNER JOIN `_migration_user_account` m ON m.`userId` = t.`userId`
SET t.`accountId` = m.`accountId`;

UPDATE `merchants` mer
INNER JOIN `_migration_user_account` m ON m.`userId` = mer.`userId`
SET mer.`accountId` = m.`accountId`;

UPDATE `categories` c
INNER JOIN `_migration_user_account` m ON m.`userId` = c.`userId`
SET c.`accountId` = m.`accountId`;

ALTER TABLE `transactions` DROP FOREIGN KEY `transactions_userId_fkey`;
ALTER TABLE `merchants` DROP FOREIGN KEY `merchants_userId_fkey`;
ALTER TABLE `categories` DROP FOREIGN KEY `categories_userId_fkey`;

DROP INDEX `merchants_userId_name_key` ON `merchants`;
DROP INDEX `categories_userId_name_key` ON `categories`;

ALTER TABLE `transactions` DROP COLUMN `userId`;
ALTER TABLE `merchants` DROP COLUMN `userId`;
ALTER TABLE `categories` DROP COLUMN `userId`;

ALTER TABLE `users` DROP COLUMN `salaryDay`;
ALTER TABLE `users` DROP COLUMN `accountName`;

ALTER TABLE `transactions` MODIFY `accountId` VARCHAR(191) NOT NULL;
ALTER TABLE `merchants` MODIFY `accountId` VARCHAR(191) NOT NULL;
ALTER TABLE `categories` MODIFY `accountId` VARCHAR(191) NOT NULL;

CREATE UNIQUE INDEX `merchants_accountId_name_key` ON `merchants`(`accountId`, `name`);
CREATE UNIQUE INDEX `categories_accountId_name_key` ON `categories`(`accountId`, `name`);

ALTER TABLE `account_members` ADD CONSTRAINT `account_members_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `account_members` ADD CONSTRAINT `account_members_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `account_invites` ADD CONSTRAINT `account_invites_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `account_invites` ADD CONSTRAINT `account_invites_invitedByUserId_fkey` FOREIGN KEY (`invitedByUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `transactions` ADD CONSTRAINT `transactions_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `merchants` ADD CONSTRAINT `merchants_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `categories` ADD CONSTRAINT `categories_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE `_migration_user_account`;
