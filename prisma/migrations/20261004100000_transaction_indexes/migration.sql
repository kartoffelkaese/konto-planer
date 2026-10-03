-- CreateIndex
CREATE INDEX `transactions_accountId_date_idx` ON `transactions`(`accountId`, `date`);

-- CreateIndex
CREATE INDEX `transactions_parentTransactionId_date_idx` ON `transactions`(`parentTransactionId`, `date`);
