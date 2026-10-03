import type { Transaction } from '@prisma/client'

export type RecurringTemplate = Pick<
  Transaction,
  | 'description'
  | 'merchant'
  | 'merchantId'
  | 'amount'
  | 'categoryId'
  | 'isTransfer'
  | 'transferTargetAccountId'
>

/** Felder für eine neue Instanz aus der Vorlage (Betrag zum Erstellzeitpunkt). */
export function buildRecurringInstanceData(
  template: RecurringTemplate,
  dueDate: Date,
  accountId: string,
  parentTransactionId: string
) {
  return {
    accountId,
    parentTransactionId,
    description: template.description,
    merchant: template.merchant,
    merchantId: template.merchantId,
    categoryId: template.categoryId,
    amount: template.amount,
    date: dueDate,
    isConfirmed: false,
    isRecurring: false,
    isTransfer: template.isTransfer,
    transferTargetAccountId: template.transferTargetAccountId,
  }
}

/** Vorlage + Kalendertag (Ortszeit): je Vorlage und Tag gibt es höchstens eine Instanz */
export function recurringInstanceKey(templateId: string, date: Date): string {
  return `${templateId}:${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}
