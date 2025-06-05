import { Component, VNode } from 'preact';
import {Props} from './types';
import DiscoverPane from './DiscoverPane';

export default class HomeScreen extends Component<{globalState: {state: any, setState: (updater: ((prevState: any) => Partial<any>) | Partial<any>) => void}}> {
	public render({globalState}: Props<{globalState: {state: any, setState: (updater: ((prevState: any) => Partial<any>) | Partial<any>) => void}}>): VNode {
		return (
			<div>
				<DiscoverPane globalState={globalState}/>
			</div>
		);
	}
}
