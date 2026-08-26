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
	/** Monthly recurring revenue at which the 9-5 gets handed back. */
	mrr_target: number | null;
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

/**
 * A category's planned amount for a month: the saved finance_budgets row if
 * one exists, otherwise the category's configured default. Shared so
 * /finance/budget and the freedom dashboard can never disagree about what
 * "planned this month" means.
 */
export function budgetedFor(cat: FinanceCategory, budgetByCategoryId: Map<string, { amount: number }>): number {
	const saved = budgetByCategoryId.get(cat.id)?.amount;
	return saved != null ? Number(saved) : Number(cat.default_amount ?? 0);
}

/**
 * Rough HUF per USD, used only to render the familiar "$10k MRR" framing
 * next to the real HUF figures. Every stored number is HUF; this is display
 * sugar, never a stored or compared value.
 */
export const HUF_PER_USD = 365;

export interface FreedomSnapshot {
	/** MRR that covers planned monthly expenses. The survive line. */
	surviveMrr: number;
	/** MRR that matches planned monthly income. The replace-salary line. */
	replaceMrr: number;
	/** The MRR the user actually intends to quit at. */
	targetMrr: number;
	/** Sum of MRR across active projects. */
	currentMrr: number;
	/** Savings on hand, same definition as /finance. */
	savings: number;
	/** Months of planned expenses the savings cover with zero income. */
	runwayMonths: number | null;
	/** Months of runway each further month at the 9-5 buys. */
	leverage: number | null;
	/** Fraction of the way to targetMrr, clamped to 0..1 for the bar. */
	progress: number;
}

/**
 * The whole point of the app in one object: how far the projects are from
 * paying for the life, and how long the savings hold if they don't.
 */
export function freedomSnapshot(input: {
	plannedExpense: number;
	plannedIncome: number;
	targetMrr: number | null;
	currentMrr: number;
	savings: number;
}): FreedomSnapshot {
	const { plannedExpense, plannedIncome, currentMrr, savings } = input;
	// Fall back to the survive line so the dashboard still renders something
	// meaningful before a target has ever been set.
	const targetMrr = input.targetMrr ?? plannedExpense;

	const runwayMonths = plannedExpense > 0 ? savings / plannedExpense : null;
	const monthlySurplus = plannedIncome - plannedExpense;
	const leverage = plannedExpense > 0 && monthlySurplus > 0 ? monthlySurplus / plannedExpense : null;

	return {
		surviveMrr: plannedExpense,
		replaceMrr: plannedIncome,
		targetMrr,
		currentMrr,
		savings,
		runwayMonths,
		leverage,
		progress: targetMrr > 0 ? Math.min(Math.max(currentMrr / targetMrr, 0), 1) : 0,
	};
}
