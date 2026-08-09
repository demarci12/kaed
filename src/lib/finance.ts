export { requireUser } from './auth';

export type FinanceType = 'income' | 'expense';

export interface FinanceCategory {
	id: string;
	user_id: string;
	name: string;
	type: FinanceType;
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
