import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { ImageGalleryModal } from '@src/shared/ui/ImageGalleryModal';
import type { PropertyImageOut } from '@src/types/catalog';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) => {
      if (!values) return key;
      return `${key}::${JSON.stringify(values)}`;
    },
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }),
}));

const IMAGES: PropertyImageOut[] = [
  { id: 'a', url: 'https://cdn.example/a.jpg', caption: 'Fachada', display_order: 0 },
  { id: 'b', url: 'https://cdn.example/b.jpg', display_order: 1 },
  { id: 'c', url: 'https://cdn.example/c.jpg', caption: 'Playa', display_order: 2 },
];

describe('ImageGalleryModal', () => {
  it('renders the counter using the initial index', () => {
    const { getByText } = render(
      <ImageGalleryModal
        visible
        onClose={jest.fn()}
        images={IMAGES}
        initialIndex={0}
        propertyName="Hotel Sol"
      />,
    );
    expect(
      getByText('property.gallery.counter::{"current":1,"total":3}'),
    ).toBeTruthy();
  });

  it('shows the caption of the initially selected image', () => {
    const { getByText, queryByText } = render(
      <ImageGalleryModal
        visible
        onClose={jest.fn()}
        images={IMAGES}
        initialIndex={0}
        propertyName="Hotel Sol"
      />,
    );
    expect(getByText('Fachada')).toBeTruthy();
    expect(queryByText('Playa')).toBeNull();
  });

  it('hides the caption bar when the current image has no caption', () => {
    const { queryByText } = render(
      <ImageGalleryModal
        visible
        onClose={jest.fn()}
        images={IMAGES}
        initialIndex={1}
        propertyName="Hotel Sol"
      />,
    );
    // Image at index 1 has no caption — neither caption from other images should render.
    expect(queryByText('Fachada')).toBeNull();
    expect(queryByText('Playa')).toBeNull();
  });

  it('invokes onClose when the close button is pressed', () => {
    const onClose = jest.fn();
    const { getByLabelText } = render(
      <ImageGalleryModal
        visible
        onClose={onClose}
        images={IMAGES}
        initialIndex={0}
        propertyName="Hotel Sol"
      />,
    );
    fireEvent.press(getByLabelText('property.gallery.close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('updates the counter and reports index changes after a swipe', () => {
    const onIndexChange = jest.fn();
    const { getByTestId, getByText } = render(
      <ImageGalleryModal
        visible
        onClose={jest.fn()}
        images={IMAGES}
        initialIndex={0}
        propertyName="Hotel Sol"
        onIndexChange={onIndexChange}
      />,
    );

    // Layout the modal so the inner FlatList mounts.
    fireEvent(getByTestId('image-gallery-modal'), 'layout', {
      nativeEvent: { layout: { width: 400, height: 800, x: 0, y: 0 } },
    });

    // Swipe to the third image (index 2 → caption "Playa").
    fireEvent(getByTestId('image-gallery-modal-list'), 'momentumScrollEnd', {
      nativeEvent: {
        contentOffset: { x: 800, y: 0 },
        layoutMeasurement: { width: 400, height: 800 },
        contentSize: { width: 1200, height: 800 },
      },
    });

    expect(
      getByText('property.gallery.counter::{"current":3,"total":3}'),
    ).toBeTruthy();
    expect(getByText('Playa')).toBeTruthy();
    expect(onIndexChange).toHaveBeenCalledWith(2);
  });
});
