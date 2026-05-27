import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TripDetailsForm, type TripField } from './TripDetailsForm';

const FIELDS: TripField[] = [{ type: 'trip_type', label: 'Trip Type' }];

describe('TripDetailsForm trip_type buttons', () => {
  it('sets aria-pressed true on the selected trip type button', async () => {
    render(<TripDetailsForm fields={FIELDS} onSubmit={vi.fn()} />);
    const roundTripBtn = screen.getByRole('button', { name: /round trip/i });
    const oneWayBtn = screen.getByRole('button', { name: /one way/i });
    expect(roundTripBtn).toHaveAttribute('aria-pressed', 'true');
    expect(oneWayBtn).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(oneWayBtn);
    expect(oneWayBtn).toHaveAttribute('aria-pressed', 'true');
    expect(roundTripBtn).toHaveAttribute('aria-pressed', 'false');
  });
});
