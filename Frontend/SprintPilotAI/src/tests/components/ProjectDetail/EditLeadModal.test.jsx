import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import EditLeadModal from '../../../components/ProjectDetail/EditLeadModal';

describe('EditLeadModal Component', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <EditLeadModal 
        show={true} 
        onClose={vi.fn()} 
        currentLead={{ id: 1, user: { full_name: 'Lead' } }} 
        availableLeads={[]}
      />
    );
    expect(container).toBeInTheDocument();
  });
});
