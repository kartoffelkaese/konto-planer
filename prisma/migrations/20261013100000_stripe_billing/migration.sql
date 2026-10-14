-- AlterTable
ALTER TABLE `users` ADD COLUMN `planCancelAtPeriodEnd` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `planInterval` ENUM('MONTHLY', 'YEARLY') NULL,
    ADD COLUMN `stripeCustomerId` VARCHAR(191) NULL,
    ADD COLUMN `stripeSubscriptionId` VARCHAR(191) NULL,
    ADD COLUMN `stripeSubscriptionStatus` VARCHAR(32) NULL;

-- CreateTable
CREATE TABLE `stripe_events` (
    `id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `users_stripeCustomerId_key` ON `users`(`stripeCustomerId`);

