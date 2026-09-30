'use client';

import type { ReactNode } from 'react';

/** Submit button for a form elsewhere on the page (`form` attr) that asks for confirmation first. */
export function ConfirmSubmit({ form, className, message, children }: {
	form: string; className?: string; message: string; children: ReactNode;
}) {
	return (
		<button
			type="submit"
			form={form}
			className={className}
			onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}
		>
			{children}
		</button>
	);
}
