import { render, screen } from '@testing-library/react';

import { NodeRenderer } from './NodeRenderer';

describe('NodeRenderer travel_plan_form with initialValues', () => {
  it('pre-fills destination input when initialValues.destination is provided', () => {
    render(
      <NodeRenderer
        node={{
          type: 'travel_plan_form',
          fields: [
            { name: 'destination', label: 'Destination', required: true },
          ],
          submitted: false,
        }}
        callbacks={{
          initialValues: { destination: 'Kyoto' },
          onFormSubmit: vi.fn(),
        }}
      />,
    );
    expect(screen.getByLabelText(/destination/i)).toHaveValue('Kyoto');
  });
});
