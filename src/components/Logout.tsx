import { VNode } from 'preact';

export default function Logout(): VNode {
	return (
		<div class='add-popup'>
			<div class='add-logout-menu'>
				{/* <button class='add-popup-close' onClick={close}>❌</button> */}
				<div>
					<h2 style="text-align: center">Logging out...</h2>
				</div>
			</div>
		</div>
	);
}
