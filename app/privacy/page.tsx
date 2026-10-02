import type { Metadata } from 'next';
import { LEGAL_CONTACT, LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = { title: 'Privacy policy — KAED' };

export default function PrivacyPage() {
	return (
		<LegalPage title="Privacy policy.">
			<div>
				<h2>Who this is</h2>
				<p>
					KAED (kaed.hu) is a personal application built and operated by Marton Deak for his own use. It is not
					offered to the public, has no customers, and is used by its owner and one other member of his household.
				</p>
			</div>

			<div>
				<h2>What data is processed</h2>
				<ul className="list-disc pl-5 [&>li]:mt-1.5">
					<li>Account login details (email address) for the people who use the app.</li>
					<li>Personal finance records the owner enters by hand: transactions, budgets, categories, savings.</li>
					<li>
						Bank account information, read-only, when the owner connects a bank through the Enable Banking
						service: account names and IBANs, balances, and booked transactions (date, amount, currency,
						counterparty name, payment reference). Nothing is ever paid or transferred through the app.
					</li>
				</ul>
			</div>

			<div>
				<h2>Why and on what basis</h2>
				<p>
					The data is processed only to give the owner a private overview of his own spending and savings. The
					owner has himself given consent for each bank connection, and can withdraw it at any time.
				</p>
			</div>

			<div>
				<h2>Where it is stored and who it is shared with</h2>
				<p>
					Data is stored in a Supabase (PostgreSQL) database and served by Vercel. Bank data is fetched through
					Enable Banking (Enable Banking Oy), a licensed account information service provider. Data is not sold,
					not used for advertising, and not shared with anyone else.
				</p>
			</div>

			<div>
				<h2>How long it is kept</h2>
				<p>
					Bank data is kept for as long as the owner keeps using the app. A bank connection can be removed at any
					time, which revokes the access given to the app; previously imported transactions can be deleted on request.
				</p>
			</div>

			<div>
				<h2>Your rights and contact</h2>
				<p>
					You may ask for access to, correction of, or deletion of your data, or object to its processing, by
					writing to <a href={`mailto:${LEGAL_CONTACT}`}>{LEGAL_CONTACT}</a>. You may also complain to the
					Hungarian data protection authority (NAIH).
				</p>
			</div>
		</LegalPage>
	);
}
