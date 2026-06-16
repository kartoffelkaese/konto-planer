-- Split-Budget Modul

CREATE TABLE `split_lists` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `archivedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`),
    INDEX `split_lists_createdById_idx`(`createdById`),
    CONSTRAINT `split_lists_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `split_list_members` (
    `id` VARCHAR(191) NOT NULL,
    `splitListId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('OWNER', 'MEMBER') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `split_list_members_splitListId_userId_key`(`splitListId`, `userId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `split_list_members_splitListId_fkey` FOREIGN KEY (`splitListId`) REFERENCES `split_lists`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `split_list_members_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `split_participants` (
    `id` VARCHAR(191) NOT NULL,
    `splitListId` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `sortOrder` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `split_participants_splitListId_displayName_key`(`splitListId`, `displayName`),
    PRIMARY KEY (`id`),
    INDEX `split_participants_userId_idx`(`userId`),
    CONSTRAINT `split_participants_splitListId_fkey` FOREIGN KEY (`splitListId`) REFERENCES `split_lists`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `split_participants_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `split_categories` (
    `id` VARCHAR(191) NOT NULL,
    `splitListId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NULL,
    `sortOrder` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `split_categories_splitListId_name_key`(`splitListId`, `name`),
    PRIMARY KEY (`id`),
    CONSTRAINT `split_categories_splitListId_fkey` FOREIGN KEY (`splitListId`) REFERENCES `split_lists`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `split_expenses` (
    `id` VARCHAR(191) NOT NULL,
    `splitListId` VARCHAR(191) NOT NULL,
    `paidByParticipantId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    INDEX `split_expenses_splitListId_idx`(`splitListId`),
    INDEX `split_expenses_categoryId_idx`(`categoryId`),
    CONSTRAINT `split_expenses_splitListId_fkey` FOREIGN KEY (`splitListId`) REFERENCES `split_lists`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `split_expenses_paidByParticipantId_fkey` FOREIGN KEY (`paidByParticipantId`) REFERENCES `split_participants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `split_expenses_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `split_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `split_expenses_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `split_expense_shares` (
    `expenseId` VARCHAR(191) NOT NULL,
    `participantId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`expenseId`, `participantId`),
    CONSTRAINT `split_expense_shares_expenseId_fkey` FOREIGN KEY (`expenseId`) REFERENCES `split_expenses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `split_expense_shares_participantId_fkey` FOREIGN KEY (`participantId`) REFERENCES `split_participants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `split_settlements` (
    `id` VARCHAR(191) NOT NULL,
    `splitListId` VARCHAR(191) NOT NULL,
    `fromParticipantId` VARCHAR(191) NOT NULL,
    `toParticipantId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `settledAt` DATETIME(3) NOT NULL,
    `settledById` VARCHAR(191) NOT NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    INDEX `split_settlements_splitListId_idx`(`splitListId`),
    CONSTRAINT `split_settlements_splitListId_fkey` FOREIGN KEY (`splitListId`) REFERENCES `split_lists`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `split_settlements_fromParticipantId_fkey` FOREIGN KEY (`fromParticipantId`) REFERENCES `split_participants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `split_settlements_toParticipantId_fkey` FOREIGN KEY (`toParticipantId`) REFERENCES `split_participants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `split_settlements_settledById_fkey` FOREIGN KEY (`settledById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `split_list_invites` (
    `id` VARCHAR(191) NOT NULL,
    `splitListId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `participantId` VARCHAR(191) NULL,
    `invitedByUserId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'REVOKED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `split_list_invites_splitListId_email_key`(`splitListId`, `email`),
    PRIMARY KEY (`id`),
    INDEX `split_list_invites_participantId_idx`(`participantId`),
    CONSTRAINT `split_list_invites_splitListId_fkey` FOREIGN KEY (`splitListId`) REFERENCES `split_lists`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `split_list_invites_participantId_fkey` FOREIGN KEY (`participantId`) REFERENCES `split_participants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `split_list_invites_invitedByUserId_fkey` FOREIGN KEY (`invitedByUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
