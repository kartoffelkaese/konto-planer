-- AlterTable
ALTER TABLE `email_verification_tokens` MODIFY `purpose` ENUM('SIGNUP', 'EMAIL_CHANGE', 'PASSWORD_RESET', 'CANCEL_SUBSCRIPTION') NOT NULL;

