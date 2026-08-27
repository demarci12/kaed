/**
 * Encodes the option list for a `[data-editable="select"]` cell.
 *
 * Labels are user-supplied (project titles, actor names), so they contain
 * commas and colons. The previous "value:label,value:label" encoding split on
 * both and silently truncated such options -- a project titled
 * "OPL: Open Point List" rendered as "OPL". JSON has no such ambiguity.
 */
export function selectOptions(pairs: Array<[value: string, label: string]>): string {
	return JSON.stringify(pairs);
}

/** Convenience for `Record<value, label>` enums. */
export function selectOptionsFromLabels(
	labels: Record<string, string>,
	leading?: [value: string, label: string],
): string {
	const pairs: Array<[string, string]> = Object.entries(labels);
	return selectOptions(leading ? [leading, ...pairs] : pairs);
}
