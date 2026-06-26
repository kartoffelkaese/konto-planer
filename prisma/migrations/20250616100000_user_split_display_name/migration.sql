-- Benutzerweiter Anzeigename für Split (unabhängig vom aktiven Konto)
ALTER TABLE `users` ADD COLUMN `splitDisplayName` VARCHAR(191) NULL;
