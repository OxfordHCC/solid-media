import { Component, VNode } from 'preact';
import {Props} from './types';

export default class Logout extends Component<{close: () => void, add: () => void}> {

	public render({close, add}: Props<{close: () => void, add: () => void}>): VNode {
		return (
			<div class='add-popup'>
				<div class='add-logout-menu'>
					{/* <button class='add-popup-close' onClick={close}>❌</button> */}
					<div>
						<h2 style="text-align: center">Logout Successful</h2>
                        <div class="btn">
                            <input
                                class="btn-primary"
                                type='submit'
                                onClick={close}
                                value='Return to Login'
                            />
						</div>
					</div>
				</div>
			</div>
		);
	}
}
