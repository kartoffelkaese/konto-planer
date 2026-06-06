-- Händler-Kategorien: n:m über merchant_categories
CREATE TABLE `merchant_categories` (
    `merchantId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`merchantId`, `categoryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `merchant_categories` (`merchantId`, `categoryId`)
SELECT `id`, `categoryId` FROM `merchants` WHERE `categoryId` IS NOT NULL;

ALTER TABLE `merchants` DROP FOREIGN KEY `merchants_categoryId_fkey`;

ALTER TABLE `merchants` DROP COLUMN `categoryId`;

ALTER TABLE `transactions` ADD COLUMN `categoryId` VARCHAR(191) NULL;

ALTER TABLE `merchant_categories` ADD CONSTRAINT `merchant_categories_merchantId_fkey` FOREIGN KEY (`merchantId`) REFERENCES `merchants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `merchant_categories` ADD CONSTRAINT `merchant_categories_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX `merchant_categories_categoryId_fkey` ON `merchant_categories`(`categoryId`);

ALTER TABLE `transactions` ADD CONSTRAINT `transactions_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX `transactions_categoryId_fkey` ON `transactions`(`categoryId`);
