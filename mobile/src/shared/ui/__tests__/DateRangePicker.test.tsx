import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DateRangePicker } from '../DateRangePicker';

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'home.selectDates': 'Select dates',
        'home.checkIn': 'Check-in',
        'home.checkOut': 'Check-out',
        'common.cancel': 'Cancel',
        'common.confirm': 'Confirm',
      };
      return map[key] ?? key;
    },
    i18n: { language: 'en' },
  }),
}));

// Use a fixed "today" for deterministic tests
const FIXED_TODAY = new Date(2026, 2, 28); // March 28, 2026

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(FIXED_TODAY);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('DateRangePicker', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title and month/year header', () => {
    const { getByText } = render(<DateRangePicker {...defaultProps} />);
    expect(getByText('Select dates')).toBeTruthy();
    expect(getByText('March 2026')).toBeTruthy();
  });

  it('renders weekday headers', () => {
    const { getByText } = render(<DateRangePicker {...defaultProps} />);
    expect(getByText('Sun')).toBeTruthy();
    expect(getByText('Mon')).toBeTruthy();
    expect(getByText('Sat')).toBeTruthy();
  });

  it('renders day numbers for the current month', () => {
    const { getByText } = render(<DateRangePicker {...defaultProps} />);
    expect(getByText('1')).toBeTruthy();
    expect(getByText('15')).toBeTruthy();
    expect(getByText('31')).toBeTruthy();
  });

  it('navigates to next month', () => {
    const { getByLabelText, getByText } = render(
      <DateRangePicker {...defaultProps} />,
    );
    fireEvent.press(getByLabelText('Next month'));
    expect(getByText('April 2026')).toBeTruthy();
  });

  it('does not navigate before current month', () => {
    const { getByLabelText, getByText } = render(
      <DateRangePicker {...defaultProps} />,
    );
    // Should still show March 2026 after pressing prev
    fireEvent.press(getByLabelText('Previous month'));
    expect(getByText('March 2026')).toBeTruthy();
  });

  it('selects check-in on first tap', () => {
    const { getByLabelText, getByText } = render(
      <DateRangePicker {...defaultProps} />,
    );
    fireEvent.press(getByLabelText('29 March'));
    // Should show the date in summary
    expect(getByText('2026-03-29')).toBeTruthy();
  });

  it('selects check-out on second tap (after check-in)', () => {
    const { getByLabelText, getByText } = render(
      <DateRangePicker {...defaultProps} />,
    );
    fireEvent.press(getByLabelText('29 March'));
    fireEvent.press(getByLabelText('31 March'));
    expect(getByText('2026-03-29')).toBeTruthy();
    expect(getByText('2026-03-31')).toBeTruthy();
  });

  it('resets when tapping a date before check-in during checkout phase', () => {
    const { getByLabelText, getByText, queryByText } = render(
      <DateRangePicker {...defaultProps} />,
    );
    // Navigate to April to pick future dates
    fireEvent.press(getByLabelText('Next month'));
    fireEvent.press(getByLabelText('5 April'));
    // Now tap a date before April 5
    fireEvent.press(getByLabelText('3 April'));
    // April 3 becomes new check-in, April 5 is cleared
    expect(getByText('2026-04-03')).toBeTruthy();
    expect(queryByText('2026-04-05')).toBeNull();
  });

  it('confirm button is disabled until both dates are selected', () => {
    const { getByLabelText } = render(
      <DateRangePicker {...defaultProps} />,
    );
    const confirmBtn = getByLabelText('Confirm');
    expect(confirmBtn.props.accessibilityState?.disabled ?? confirmBtn.props.disabled).toBeTruthy();
  });

  it('calls onConfirm with ISO strings when confirmed', () => {
    const { getByLabelText } = render(
      <DateRangePicker {...defaultProps} />,
    );
    fireEvent.press(getByLabelText('29 March'));
    fireEvent.press(getByLabelText('31 March'));
    fireEvent.press(getByLabelText('Confirm'));

    expect(defaultProps.onConfirm).toHaveBeenCalledWith(
      '2026-03-29',
      '2026-03-31',
    );
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onClose when cancelled', () => {
    const { getByLabelText } = render(
      <DateRangePicker {...defaultProps} />,
    );
    fireEvent.press(getByLabelText('Cancel'));
    expect(defaultProps.onClose).toHaveBeenCalled();
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it('initializes with provided dates', () => {
    const { getByText } = render(
      <DateRangePicker
        {...defaultProps}
        initialCheckin="2026-04-10"
        initialCheckout="2026-04-15"
      />,
    );
    // Should show April since initialCheckin is in April
    expect(getByText('April 2026')).toBeTruthy();
    expect(getByText('2026-04-10')).toBeTruthy();
    expect(getByText('2026-04-15')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    const { queryByText } = render(
      <DateRangePicker {...defaultProps} visible={false} />,
    );
    expect(queryByText('Select dates')).toBeNull();
  });
});
