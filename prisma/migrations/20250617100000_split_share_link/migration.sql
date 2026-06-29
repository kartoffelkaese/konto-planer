-- AlterTable
ALTER TABLE `split_lists` ADD COLUMN `shareEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `shareTokenHash` VARCHAR(191) NULL,
    ADD COLUMN `shareEnabledAt` DATETIME(3) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `split_lists_shareTokenHash_key` ON `split_lists`(`shareTokenHash`);
