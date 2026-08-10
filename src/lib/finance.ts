export { requireUser } from './auth';

export type FinanceType = 'income' | 'expense' | 'saving';

export interface FinanceCategory {
	id: string;
	user_id: string;
	name: string;
	type: FinanceType;
	// Default planned monthly amount, used to seed a month's budget planning
	// view when no month-specific finance_budgets row exists yet.
	default_amount: number;
	// Monthly interest rate as a percent (e.g. 0.5 = 0.5%/month), only
	// meaningful for type === 'saving'. Null/0 means no interest.
	interest_rate: number | null;
	created_at: string;
}

export interface FinanceTransaction {
	id: string;
	user_id: string;
	category_id: string | null;
	type: FinanceType;
	amount: number;
	note: string | null;
	occurred_on: string;
	created_at: string;
}

export interface FinanceLimits {
	id: string;
	user_id: string;
	daily_limit: number | null;
	weekly_limit: number | null;
	starting_savings_balance: number;
	updated_at: string;
}

export interface FinanceBudget {
	id: string;
	user_id: string;
	category_id: string;
	month: string;
	amount: number;
	created_at: string;
	updated_at: string;
}
