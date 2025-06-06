import { VNode } from 'preact';
import {Props} from './types';
import DiscoverPane from './DiscoverPane';

export default function HomeScreen(): VNode {
	return (
		<div>
			<DiscoverPane />
		</div>
	);
}
