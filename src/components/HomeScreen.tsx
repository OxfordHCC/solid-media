import { VNode } from 'preact';
import {Props} from './types';
import DiscoverPane from './DiscoverPane';

export default function HomeScreen({globalState}: {globalState: {state: any, setState: (updater: ((prevState: any) => Partial<any>) | Partial<any>) => void}}): VNode {
	return (
		<div>
			<DiscoverPane globalState={globalState}/>
		</div>
	);
}
