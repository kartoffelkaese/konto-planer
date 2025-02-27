-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `salaryDay` INTEGER NOT NULL,
    `accountName` VARCHAR(191) NULL DEFAULT 'Mein Konto',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transactions` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `merchant` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10,2) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `isConfirmed` BOOLEAN NOT NULL DEFAULT false,
    `isRecurring` BOOLEAN NOT NULL DEFAULT false,
    `recurringInterval` VARCHAR(191) NULL,
    `lastConfirmedDate` DATETIME(3) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `parentTransactionId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_parentTransactionId_fkey` FOREIGN KEY (`parentTransactionId`) REFERENCES `transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE; 