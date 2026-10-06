-- AlterTable
ALTER TABLE `users` ADD COLUMN `isAdmin` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `keptAccountId` VARCHAR(191) NULL,
    ADD COLUMN `plan` ENUM('BASIC', 'FULL') NOT NULL DEFAULT 'BASIC',
    ADD COLUMN `planExpiresAt` DATETIME(3) NULL,
    ADD COLUMN `planSource` ENUM('LEGACY', 'TRIAL', 'MANUAL', 'STRIPE') NULL;

-- CreateTable
CREATE TABLE `plan_changes` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `fromPlan` ENUM('BASIC', 'FULL') NOT NULL,
    `toPlan` ENUM('BASIC', 'FULL') NOT NULL,
    `source` ENUM('LEGACY', 'TRIAL', 'MANUAL', 'STRIPE') NOT NULL,
    `expiresAt` DATETIME(3) NULL,
    `changedById` VARCHAR(191) NULL,
    `note` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `plan_changes_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `plan_changes` ADD CONSTRAINT `plan_changes_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `plan_changes` ADD CONSTRAINT `plan_changes_changedById_fkey` FOREIGN KEY (`changedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;


-- Bestehende Nutzer behalten dauerhaft das Level „Komplett“
UPDATE `users` SET `plan` = 'FULL', `planSource` = 'LEGACY';
