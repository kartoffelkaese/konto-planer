-- Add READ_ONLY role for shared account members and store invite role

ALTER TABLE `account_members`
  MODIFY `role` ENUM('OWNER', 'MEMBER', 'READ_ONLY') NOT NULL;

ALTER TABLE `account_invites`
  ADD COLUMN `role` ENUM('OWNER', 'MEMBER', 'READ_ONLY') NOT NULL DEFAULT 'MEMBER';
