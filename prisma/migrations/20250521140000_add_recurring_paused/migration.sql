-- AlterTable
ALTER TABLE `transactions` ADD COLUMN `isRecurringPaused` BOOLEAN NOT NULL DEFAULT false;
