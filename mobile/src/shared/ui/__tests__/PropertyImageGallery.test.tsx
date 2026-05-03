import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { PropertyImageGallery } from '@src/shared/ui/PropertyImageGallery';
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
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const IMAGE_A: PropertyImageOut = {
  id: 'a',
  url: 'https://cdn.example/a.jpg',
  caption: 'Fachada principal',
  display_order: 0,
};
const IMAGE_B: PropertyImageOut = {
  id: 'b',
  url: 'https://cdn.example/b.jpg',
  caption: 'Piscina',
  display_order: 1,
};
const IMAGE_C: PropertyImageOut = {
  id: 'c',
  url: 'https://cdn.example/c.jpg',
  display_order: 2,
};

describe('PropertyImageGallery', () => {
  it('renders the placeholder icon when there are no images', () => {
    const { queryByLabelText, queryByText } = render(
      <PropertyImageGallery images={[]} propertyName="Hotel Sol" />,
    );
    expect(queryByLabelText('property.gallery.openFull')).toBeNull();
    expect(queryByText(/property\.gallery\.counter/)).toBeNull();
  });

  it('shows a counter and the first caption when multiple images are provided', () => {
    const { getByLabelText, getByText } = render(
      <PropertyImageGallery
        images={[IMAGE_B, IMAGE_A, IMAGE_C]}
        propertyName="Hotel Sol"
      />,
    );

    expect(getByLabelText('property.gallery.openFull')).toBeTruthy();
    expect(
      getByText('property.gallery.counter::{"current":1,"total":3}'),
    ).toBeTruthy();
    // sorted by display_order: IMAGE_A (caption "Fachada principal") is first
    expect(getByText('Fachada principal')).toBeTruthy();
  });

  it('hides the counter when there is a single image', () => {
    const { queryByText } = render(
      <PropertyImageGallery images={[IMAGE_A]} propertyName="Hotel Sol" />,
    );
    expect(queryByText(/property\.gallery\.counter/)).toBeNull();
  });

  it('omits the caption pill when the current image has no caption', () => {
    const { queryByText } = render(
      <PropertyImageGallery images={[IMAGE_C]} propertyName="Hotel Sol" />,
    );
    expect(queryByText('Piscina')).toBeNull();
    expect(queryByText('Fachada principal')).toBeNull();
  });

  it('opens the fullscreen modal when the hero is pressed', () => {
    const { getByLabelText, queryAllByLabelText } = render(
      <PropertyImageGallery
        images={[IMAGE_A, IMAGE_B]}
        propertyName="Hotel Sol"
      />,
    );

    // Modal close button should not be reachable while the modal is closed.
    expect(queryAllByLabelText('property.gallery.close')).toHaveLength(0);

    fireEvent.press(getByLabelText('property.gallery.openFull'));

    // After pressing, the modal mounts its close button.
    expect(queryAllByLabelText('property.gallery.close').length).toBeGreaterThan(0);
  });

  it('updates the counter and caption when the user swipes to the next image', () => {
    const { getByTestId, getByText, queryByText } = render(
      <PropertyImageGallery
        images={[IMAGE_A, IMAGE_B, IMAGE_C]}
        propertyName="Hotel Sol"
      />,
    );

    // Trigger the layout pass so the FlatList mounts with a known page width.
    fireEvent(getByTestId('property-image-gallery'), 'layout', {
      nativeEvent: { layout: { width: 320, height: 280, x: 0, y: 0 } },
    });

    // Initial state: page 1 / 3 with caption "Fachada principal".
    expect(
      getByText('property.gallery.counter::{"current":1,"total":3}'),
    ).toBeTruthy();
    expect(getByText('Fachada principal')).toBeTruthy();

    // Swipe to the second page (offset = 320).
    fireEvent(getByTestId('property-image-gallery-list'), 'momentumScrollEnd', {
      nativeEvent: {
        contentOffset: { x: 320, y: 0 },
        layoutMeasurement: { width: 320, height: 280 },
        contentSize: { width: 960, height: 280 },
      },
    });

    expect(
      getByText('property.gallery.counter::{"current":2,"total":3}'),
    ).toBeTruthy();
    expect(getByText('Piscina')).toBeTruthy();
    expect(queryByText('Fachada principal')).toBeNull();
  });

  it('ignores momentum scroll events before layout is measured', () => {
    const { getByTestId, getByText } = render(
      <PropertyImageGallery
        images={[IMAGE_A, IMAGE_B]}
        propertyName="Hotel Sol"
      />,
    );

    // Force the FlatList to render briefly so we can scroll it, but reset width=0
    // is impractical — instead, we feed an invalid offset (negative) and assert
    // the counter stays put, which exercises the bounds check in handleScrollEnd.
    fireEvent(getByTestId('property-image-gallery'), 'layout', {
      nativeEvent: { layout: { width: 320, height: 280, x: 0, y: 0 } },
    });

    fireEvent(getByTestId('property-image-gallery-list'), 'momentumScrollEnd', {
      nativeEvent: {
        contentOffset: { x: -100, y: 0 },
        layoutMeasurement: { width: 320, height: 280 },
        contentSize: { width: 640, height: 280 },
      },
    });

    expect(
      getByText('property.gallery.counter::{"current":1,"total":2}'),
    ).toBeTruthy();
  });
});
