import { VNode, createRef } from 'preact';
import { useState, useRef } from 'preact/hooks';
import {Props} from './types';
import Loading from './Loading';
import {search, MediaData} from '../media';

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
	year: 'numeric',
	month: 'long',
};

export default function AddPopup({close, save, watch}: {close: () => void, save: (media: MediaData) => Promise<any>, watch: (media: MediaData, date?: Date) => Promise<any>}): VNode {
	const [subPopup, setSubPopup] = useState<null | 'netflix'>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	return (
		<div class='add-popup'>
			<div class='add-popup-menu'>
				<button class='add-popup-close' onClick={close}>❌</button>
				{subPopup === 'netflix' ? (<div>
					<h2>Import from Netflix</h2>
					<ol>
						<li>Open Netflix</li>
						<li>Under 'Account -&gt; Profile &amp; parental controls' click on 'Viewing activity'</li>
						<li>Click on 'Download all'</li>
						<li>Save the file, then import it below:</li>
					</ol>
					<input type='file' onChange={async () => {
						const files = fileInputRef.current?.files;
						if (files && files[0]) {
							const file = files[0];
							const data = await file.text();
							const [, ...lines] = data.split('\n').slice(0, -1);
							for (const line of lines) {
								// const [, name, watched] = line.match(/([^"]*),([^"]*)/); // for benchmarking data
								const match = line.match(/"([^"]*)","([^"]*)"/);
								if (match) {
									const [, name, watched] = match;
									if (!name.includes(": Season ")) {
										const movies = await search(name);
										const movie = movies.find(x => x.title === name);
										if (movie) {
											watch(movie, new Date(watched));
										}
									}
								}
							}
							close();
						}
					}} ref={fileInputRef} />
				</div>) : (<div>
					<h2>Add movies:</h2>
					<AddPopupSearchList close={close} save={save} watch={watch}></AddPopupSearchList>
					<div class='add-popup-option' onClick={() => {
						setSubPopup('netflix');
					}}>Import from Netflix</div>
				</div>)}
			</div>
		</div>
	);
}

function AddPopupSearchList({close, save, watch}: {close: () => void, save: (media: MediaData) => Promise<any>, watch: (media: MediaData) => Promise<any>}): VNode {
	const [results, setResults] = useState<VNode>(<div />);
	const searchInputRef = useRef<HTMLInputElement>(null);

	return (
		<div>
			<input type='text' class='add-popup-search-box' ref={searchInputRef} />
			<input type='button' class='add-popup-search-button' value='Search' onClick={() => {
				setResults(
					<Loading render={async () => {
						const searchValue = searchInputRef.current?.value || '';
						const results = await search(searchValue);
						return (
							<div>
								{results.map(r => {
									return (
										<div class='add-popup-search-result'>
											<div class='add-popup-search-results-text'>
												{`${r.title} - ${r.released.toLocaleDateString('en-GB', DATE_FORMAT)}`}
											</div>
											<div class='add-popup-search-result-buttons'>
												<div class='add-popup-search-result-watch' onClick={() => {
													watch(r); // adds to watched movies
													close();
												}}>✔️</div>
												<div class='add-popup-search-result-save' onClick={() => {
													save(r); // adds to wishlist
													close();
												}}>➕</div>
											</div>
										</div>
									);
								})}
							</div>
						);
					}} />
				);
			}} />
			<div class='add-popup-search-results'>{results}</div>
		</div>
	);
}
