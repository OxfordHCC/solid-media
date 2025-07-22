import { VNode } from 'preact';
import Carousel from '../../components/Carousel';
import { HistoryCarouselElement } from './HistoryCarouselElement';
import { useHistoryStore } from './historyStore';

export interface HistorySectionProps {
  title: string;
}

export default function HistoryCarouselSection({
  title,
}: HistorySectionProps): VNode | null {
  console.log('HistoryCarouselSection::render called with title:', title);

  const historyStore = useHistoryStore();

  const items = Array.from(historyStore.history.values());

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 style="margin-left: 2%;">{title}</h3>
      <Carousel>
        {Array.from(items)
          .map(resolvedHistoryItem => (
            <HistoryCarouselElement
              resolvedHistoryItem={resolvedHistoryItem}
            />
          ))}
      </Carousel>
    </div>
  );
}
