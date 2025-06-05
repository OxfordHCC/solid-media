import { VNode } from 'preact';
import {Props} from './types';

export default function AddFriends({close, add}: {close: () => void, add: () => void}): VNode {
	return (
		<div class='add-popup'>
			<div class='add-logout-menu' style="height: 30vh">
				<button class='add-popup-close' onClick={close}>❌</button>
				<div class="add-friends-container">
					<h2>Add Friends</h2>
                    <h4>Enter the webID</h4>
                    <input id="friend"/>
					<input
						class="btn-primary"
						type='submit'
						onClick={add}
						value='Add'
                    />
				</div>
			</div>
		</div>
	);
}
