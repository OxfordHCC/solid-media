import { VNode } from 'preact';
import { useState, useEffect } from 'preact/hooks';

export default function Loading({render}: {render?: () => Promise<VNode>}): VNode {
	const [contents, setContents] = useState<VNode | null>(null);

	useEffect(() => {
		// Reset contents when render prop changes
		setContents(null);
	}, [render]);

	useEffect(() => {
		if (contents === null && render !== undefined) {
			render()
				.then(setContents);
		}
	}, [contents, render]);

	if (contents !== null) {
		return contents;
	}

	return (
		<div>
			Loading...
		</div>
	);
}
