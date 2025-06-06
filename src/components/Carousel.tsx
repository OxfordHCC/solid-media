import { VNode, toChildArray, ComponentChildren } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { useLocation } from 'wouter-preact';
import { noDefault } from '../utils/routing';

export default function Carousel({children}: {children?: ComponentChildren}): VNode {
	const [scroll, setScroll] = useState(0);
	const listRef = useRef<HTMLDivElement>(null);
	const count = toChildArray(children).length;

	useEffect(() => {
		if (listRef.current) {
			const scrollValue = Math.min(count - 3, Math.max(0, scroll - 0.3));
			listRef.current.scrollLeft = scrollValue * 0.27 * window.innerWidth;
		}
	}, [scroll, count]);

	return (
		<div class='carousel'>
			<div ref={listRef} class='carousel-list'>
				<div class='carousel-list-scroll' style={`width: ${27 * count + 1}vw`}>
					{children}
				</div>
			</div>
			<button
				onClick={() => setScroll(Math.max(0, scroll - 3))}
				class='carousel-left'
			>❮</button>
			<button
				onClick={() => setScroll(Math.min(count - 3, scroll + 3))}
				class='carousel-right'
			>❯</button>
		</div>
	);
}

type CarouselElementProps = {
	title?: string;
	subtitle?: string;
	image?: string;
	redirect?: string;
	buttons?: {text: string, click: () => void, cssClass?: string, selected?: boolean}[];
};

export function CarouselElement({title, subtitle, image, redirect, buttons = []}: CarouselElementProps): VNode {
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
