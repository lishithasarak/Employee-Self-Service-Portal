-- Run once for databases created before the reimbursement workflow was added.
ALTER TABLE reimbursements ADD COLUMN expense_date DATE NOT NULL AFTER amount;
