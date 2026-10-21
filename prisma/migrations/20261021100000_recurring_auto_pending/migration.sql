-- AlterTable
ALTER TABLE `accounts` ADD COLUMN `recurringAutoMode` ENUM('SALARY_MONTH', 'ON_DUE_DATE', 'OFF') NOT NULL DEFAULT 'SALARY_MONTH';

-- AlterTable
ALTER TABLE `transactions` ADD COLUMN `autoPendingUntil` DATETIME(3) NULL;
