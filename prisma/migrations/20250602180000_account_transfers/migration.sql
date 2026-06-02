-- AlterTable
ALTER TABLE `transactions` ADD COLUMN `isTransfer` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `transferTargetAccountId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `transfer_pairs` (
    `id` VARCHAR(191) NOT NULL,
    `sourceTransactionId` VARCHAR(191) NOT NULL,
    `targetTransactionId` VARCHAR(191) NULL,
    `targetAccountId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `transfer_pairs_sourceTransactionId_key`(`sourceTransactionId`),
    UNIQUE INDEX `transfer_pairs_targetTransactionId_key`(`targetTransactionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_transferTargetAccountId_fkey` FOREIGN KEY (`transferTargetAccountId`) REFERENCES `accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transfer_pairs` ADD CONSTRAINT `transfer_pairs_sourceTransactionId_fkey` FOREIGN KEY (`sourceTransactionId`) REFERENCES `transactions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transfer_pairs` ADD CONSTRAINT `transfer_pairs_targetTransactionId_fkey` FOREIGN KEY (`targetTransactionId`) REFERENCES `transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transfer_pairs` ADD CONSTRAINT `transfer_pairs_targetAccountId_fkey` FOREIGN KEY (`targetAccountId`) REFERENCES `accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
