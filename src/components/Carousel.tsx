import { Component, VNode, toChildArray, createRef } from 'preact';
import {useLocation} from 'wouter-preact';
import {Props, CList} from './types';
import {noDefault} from './lib';

export default class Carousel extends Component<Props<{}, CList<VNode>>> {
	state = {
		scroll: 0,
	};

	list = createRef();

	public render({children}: Props<{}, CList<VNode>>): VNode {
		const count = toChildArray(children).length;

		return (
			<div class='carousel'>
				<div ref={this.list} class='carousel-list'>
					<div class='carousel-list-scroll' style={`width: ${27 * count + 1}vw`}>
						{children}
					</div>
				</div>
				<button
					onClick={() => this.setState({scroll: Math.max(0, this.state.scroll - 3)})}
					class='carousel-left'
				>❮</button>
				<button
					onClick={() => this.setState({scroll: Math.min(count - 3, this.state.scroll + 3)})}
					class='carousel-right'
				>❯</button>
			</div>
		);
	}

	public componentDidUpdate() {
		const scroll = Math.min(toChildArray(this.props.children).length - 3, Math.max(0, this.state.scroll - 0.3));

		this.list.current.scrollLeft = scroll * 0.27 * window.innerWidth;
	}
}

type CarouselElementProps = {
	title?: string;
	subtitle?: string;
	image?: string;
	redirect?: string;
	buttons?: {text: string, click: () => void, cssClass?: string, selected?: boolean}[];
};

export class CarouselElement extends Component<CarouselElementProps> {
	public render({title, subtitle, image, redirect, buttons = []}: Props<CarouselElementProps>): VNode {
		const [location, setLocation] = useLocation();

		return (
			<div onClick={noDefault(() => redirect && setLocation(redirect))} class='carousel-panel'>
				<div class='carousel-element'>
					<img class='carousel-image' src={image} />
					<div class='carousel-body'>
						<p class='carousel-title'>{title}</p>
						<p class='carousel-subtitle'>{subtitle}</p>
						{buttons.map(({text, click, cssClass, selected}, i) => (
							<p
								class={`carousel-button ${selected ? 'carousel-selected' : ''} ${cssClass}`}
								onClick={noDefault(click)}
								style={`right: ${1 + 2 * i}vw`}
							>
								{text}
							</p>
						))}
					</div>
				</div>
			</div>
		);
	}
}
