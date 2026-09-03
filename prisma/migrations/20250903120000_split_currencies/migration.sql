-- AlterTable
ALTER TABLE `split_expenses`
    ADD COLUMN `originalAmount` DECIMAL(12, 4) NULL,
    ADD COLUMN `originalCurrencyCode` VARCHAR(3) NULL,
    ADD COLUMN `exchangeRate` DECIMAL(12, 6) NULL,
    ADD COLUMN `exchangeRateDate` DATE NULL;

-- CreateTable
CREATE TABLE `split_list_currencies` (
    `id` VARCHAR(191) NOT NULL,
    `splitListId` VARCHAR(191) NOT NULL,
    `currencyCode` VARCHAR(3) NOT NULL,
    `sortOrder` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `split_list_currencies_splitListId_currencyCode_key`(`splitListId`, `currencyCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `split_list_currencies` ADD CONSTRAINT `split_list_currencies_splitListId_fkey` FOREIGN KEY (`splitListId`) REFERENCES `split_lists`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
