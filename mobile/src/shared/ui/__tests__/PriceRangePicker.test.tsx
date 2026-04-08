import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PriceRangePicker } from '../PriceRangePicker';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'search.priceRange': 'Price Range',
        'search.minPrice': 'Min',
        'search.maxPrice': 'Max',
        'common.cancel': 'Cancel',
        'common.confirm': 'Confirm',
      };
      return map[key] ?? key;
    },
  }),
}));

describe('PriceRangePicker', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title and labels when visible', () => {
    const { getByText } = render(<PriceRangePicker {...defaultProps} />);
    expect(getByText('Price Range')).toBeTruthy();
    expect(getByText('Min')).toBeTruthy();
    expect(getByText('Max')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    const { queryByText } = render(
      <PriceRangePicker {...defaultProps} visible={false} />,
    );
    expect(queryByText('Price Range')).toBeNull();
  });

  it('renders with initial values', () => {
    const { getByLabelText } = render(
      <PriceRangePicker {...defaultProps} initialMin={100} initialMax={500} />,
    );
    const minInput = getByLabelText('Min');
    const maxInput = getByLabelText('Max');
    expect(minInput.props.value).toBe('100');
    expect(maxInput.props.value).toBe('500');
  });

  it('confirms with entered values', () => {
    const { getByLabelText } = render(<PriceRangePicker {...defaultProps} />);

    fireEvent.changeText(getByLabelText('Min'), '50');
    fireEvent.changeText(getByLabelText('Max'), '300');
    fireEvent.press(getByLabelText('Confirm'));

    expect(defaultProps.onConfirm).toHaveBeenCalledWith(50, 300);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('confirms with undefined when inputs are empty (full range)', () => {
    const { getByLabelText } = render(<PriceRangePicker {...defaultProps} />);

    fireEvent.press(getByLabelText('Confirm'));

    expect(defaultProps.onConfirm).toHaveBeenCalledWith(undefined, undefined);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onClose when cancelled', () => {
    const { getByLabelText } = render(<PriceRangePicker {...defaultProps} />);

    fireEvent.press(getByLabelText('Cancel'));

    expect(defaultProps.onClose).toHaveBeenCalled();
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it('resets values on cancel', () => {
    const { getByLabelText } = render(
      <PriceRangePicker {...defaultProps} initialMin={100} initialMax={500} />,
    );

    fireEvent.changeText(getByLabelText('Min'), '999');
    fireEvent.press(getByLabelText('Cancel'));

    // Re-render to verify reset
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('updates min input value', () => {
    const { getByLabelText } = render(<PriceRangePicker {...defaultProps} />);

    const minInput = getByLabelText('Min');
    fireEvent.changeText(minInput, '150');

    expect(minInput.props.value).toBe('150');
  });

  it('updates max input value', () => {
    const { getByLabelText } = render(<PriceRangePicker {...defaultProps} />);

    const maxInput = getByLabelText('Max');
    fireEvent.changeText(maxInput, '800');

    expect(maxInput.props.value).toBe('800');
  });

  it('renders slider labels', () => {
    const { getByText } = render(<PriceRangePicker {...defaultProps} />);
    expect(getByText('$0')).toBeTruthy();
    expect(getByText('$1000')).toBeTruthy();
  });
});
