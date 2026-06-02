-- AlterTable
ALTER TABLE `accounts` ADD COLUMN `transferSenderName` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `transactions` ADD COLUMN `transferTargetMerchant` VARCHAR(191) NULL;
