import {h, Component, VNode} from 'preact';
import {Props} from './types';

export default class AddFriends extends Component<{close: () => void, add: () => void}> {
	
	public render({close, add}: Props<{close: () => void, add: () => void}>): VNode {
		return (
			<div class='add-popup'>
				<div class='add-popup-menu'>
					<button class='add-popup-close' onClick={close}>❌</button>
					<div>
						<h2>Add Friends</h2>
                        <h4>Enter the webID</h4>
                        <input id="friend"/>
                        <button class='' onClick={add}>Add</button>
					</div>
				</div>
			</div>
		);
	}
}
