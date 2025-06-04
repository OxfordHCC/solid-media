import { Component, VNode } from 'preact';
import {Props} from './types';
import Loading from './Loading';
import {loadData} from '../media';
import {useLocation} from 'wouter-preact';

import {HOMEPAGE} from '../env';

export default class ViewScreen extends Component<{url: string | null}> {
	public render({url}: Props<{url: string | null}>): VNode {
		const [location, setLocation] = useLocation();

		return (
			<Loading render={async () => {
				const {title, description, released, image, backdrop} = await loadData(url!);

				return (
					<div class='view'>
						<img class='view-background' src={backdrop} />
						<img class='view-image' src={image} />
						<div class='view-body'>
							<h1 class='view-title'>{title}</h1>
							<p class='view-description'>{description}</p>
						</div>
						<button class='back-button' onClick={() => setLocation(`${HOMEPAGE}/`)}>◀</button>
						<div class='view-background-colour'></div>
					</div>
				);
			}} />
		);
	}
}
