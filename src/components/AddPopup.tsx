import { Component, VNode, createRef } from 'preact';
import {Props} from './types';
import Loading from './Loading';
import {search, MediaData} from '../media';

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
	year: 'numeric',
	month: 'long',
};

export default class AddPopup extends Component<{close: () => void, save: (media: MediaData) => Promise<any>, watch: (media: MediaData, date?: Date) => Promise<any>}> {
	state: {subPopup: null | 'netflix'}
		= {subPopup: null};
	
	fileInput = createRef();
	
	public render({close, save, watch}: Props<{close: () => void, save: (media: MediaData) => Promise<any>, watch: (media: MediaData, date?: Date) => Promise<any>}>): VNode {
		return (
			<div class='add-popup'>
				<div class='add-popup-menu'>
					<button class='add-popup-close' onClick={close}>❌</button>
					{this.state.subPopup === 'netflix' ? (<div>
						<h2>Import from Netflix</h2>
						<ol>
							<li>Open Netflix</li>
							<li>Under 'Account -&gt; Profile &amp; parental controls' click on 'Viewing activity'</li>
							<li>Click on 'Download all'</li>
							<li>Save the file, then import it below:</li>
						</ol>
						<input type='file' onChange={async () => {
							const [file] = this.fileInput.current.files;
							if (file) {
								const data = await file.text();
								const [, ...lines] = data.split('\n').slice(0, -1);
								for (const line of lines) {
									// const [, name, watched] = line.match(/([^"]*),([^"]*)/); // for benchmarking data
									const [, name, watched] = line.match(/"([^"]*)","([^"]*)"/);
									if (!name.includes(": Season ")) {
										const movies = await search(name);
										const movie = movies.find(x => x.title === name);
										if (movie) {
											watch(movie, new Date(watched));
										}
									}
								}
								close();
							}
						}} ref={this.fileInput} />
					</div>) : (<div>
						<h2>Add movies:</h2>
						<AddPopupSearchList close={close} save={save} watch={watch} />
						<div class='add-popup-option' onClick={() => {
							this.setState({subPopup: 'netflix'});
						}}>Import from Netflix</div>
					</div>)}
				</div>
			</div>
		);
	}
}

class AddPopupSearchList extends Component<{close: () => void, save: (media: MediaData) => Promise<any>, watch: (media: MediaData) => Promise<any>}> {
	ref = createRef();
	
	state = {
		results: <div />,
	};
	
	public render({close, save, watch}: Props<{close: () => void, save: (media: MediaData) => Promise<any>, watch: (media: MediaData) => Promise<any>}>): VNode {
		return (
			<div>
				<input type='text' class='add-popup-search-box' ref={this.ref} />
				<input type='button' class='add-popup-search-button' value='Search' onClick={() => {
					this.setState({
						results: (
							<Loading render={async () => {
								const results = await search(this.ref.current.value);
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
						),
					});
				}} />
				<div class='add-popup-search-results'>{this.state.results}</div>
			</div>
		);
	}
}
