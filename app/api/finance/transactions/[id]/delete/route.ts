import { deleteRow } from '@/lib/mutation-route';

export const POST = deleteRow('finance_transactions', '/finance', false);
