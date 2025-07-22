import { VNode } from 'preact';
import { CarouselElement } from '../../components/Carousel';
import { ResolvedHistoryItem } from './types';

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
};

export interface HistoryCarouselElementProps {
  resolvedHistoryItem: ResolvedHistoryItem;
}

export const HistoryCarouselElement = ({
  resolvedHistoryItem,
}: HistoryCarouselElementProps): VNode => {
  const { videoID, title, description, thumbnail, uploadedAt, liked } = resolvedHistoryItem;

  const buttons: any[] = [];

  // buttons.push(
  //   {
  //     text: '👎',
  //     cssClass: 'carousel-dislike',
  //     selected: liked === false,
  //     click: async () => await myToggleLike(liked === false ? null : false)
  //   },
  //   {
  //     text: '👍',
  //     cssClass: 'carousel-like',
  //     selected: liked === true,
  //     click: async () => await myToggleLike(liked === true ? null : true)
  //   }
  // );
  // buttons.push({
  //   text: '❌',
  //   cssClass: 'carousel-remove',
  //   click: async () => {
  //     try {
  //       await movieActions.removeMovie(movieData);
  //     } catch (error) {
  //       console.error('Failed to remove movie:', error);
  //     }
  //   }
  // });

  let subtitle = '';
  // subtitle += uploadedAt?.toLocaleDateString('en-GB', DATE_FORMAT) ?? '';
  // if (subtitle) {
  //   subtitle += ' - ';
  // }
  // subtitle += description || '';
  subtitle = description;

  return (
    <CarouselElement
      title={title}
      subtitle={subtitle}
      image={thumbnail || undefined}
      // redirect={`${BASE_URL}view?url=${movie}`}
      buttons={buttons}
    />
  );
};
