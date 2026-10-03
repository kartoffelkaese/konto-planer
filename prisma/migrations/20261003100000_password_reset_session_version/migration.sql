-- AlterTable
ALTER TABLE `users` ADD COLUMN `sessionVersion` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `email_verification_tokens` MODIFY `purpose` ENUM('SIGNUP', 'EMAIL_CHANGE', 'PASSWORD_RESET') NOT NULL;
