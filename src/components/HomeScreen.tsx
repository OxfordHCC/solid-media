import {h, Component, VNode} from 'preact';
import {Props} from './types';
import DiscoverPane from './DiscoverPane';

export default class HomeScreen extends Component<{globalState: {state: any}}> {
	public render({globalState}: Props<{globalState: {state: any}}>): VNode {
		return (
			<div>
				<DiscoverPane globalState={globalState}/>
			</div>
		);
	}
}
