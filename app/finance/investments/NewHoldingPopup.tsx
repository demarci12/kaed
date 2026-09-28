'use client';

import { Popup, PopupActions } from '@/components/Popup';
import { btn, input, label } from '@/components/ui';

/**
 * Popup takes render-prop children, which cannot cross the server/client
 * boundary -- so the trigger and form live in this client wrapper.
 */
export function NewHoldingPopup() {
	return (
		<Popup title="Add holding" trigger={(open) => (
			<button type="button" className={btn} onClick={open}>+ Add holding</button>
		)}>
			{(close) => (
				<form method="post" action="/api/finance/investments/create">
					<label className={label} htmlFor="symbol">Symbol</label>
					<input id="symbol" name="symbol" type="text" required maxLength={20} placeholder="ONDO" className={input} />

					<label className={label} htmlFor="cmc_slug">CoinMarketCap slug (optional)</label>
					<input id="cmc_slug" name="cmc_slug" type="text" maxLength={60} placeholder="sigma-sol" className={input} />

					<label className={label} htmlFor="quantity">Quantity</label>
					<input id="quantity" name="quantity" type="number" step="any" min="0" required className={input} />

					<label className={label} htmlFor="cost_basis_huf">Invested (HUF)</label>
					<input id="cost_basis_huf" name="cost_basis_huf" type="number" step="any" min="0" required className={input} />

					<label className={label} htmlFor="goal_price_usd">Goal price (USD)</label>
					<input id="goal_price_usd" name="goal_price_usd" type="number" step="any" min="0" className={input} />

					<PopupActions onCancel={close} submitLabel="Add holding" />
				</form>
			)}
		</Popup>
	);
}
