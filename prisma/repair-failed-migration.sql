-- Einmalig auf der Produktions-DB ausführen, falls migrate deploy wegen
-- fehlgeschlagener Migration 20250602195000_transaction_categories blockiert:
--
--   npx prisma migrate resolve --rolled-back 20250602195000_transaction_categories
--
-- Alternativ:
DELETE FROM `_prisma_migrations`
WHERE `migration_name` = '20250602195000_transaction_categories'
  AND `finished_at` IS NULL;
