import { VNode } from 'preact';
import Loading from '../components/ui/Loading';
import { loadData } from '../apis/tmdb';
import { useLocation } from 'wouter-preact';

import { BASE_URL } from '../env';

export default function ViewScreen({url}: {url: string | null}): VNode {
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
					<button class='back-button' onClick={() => setLocation(`${BASE_URL}`)}>◀</button>
					<div class='view-background-colour'></div>
				</div>
			);
		}} />
	);
}
