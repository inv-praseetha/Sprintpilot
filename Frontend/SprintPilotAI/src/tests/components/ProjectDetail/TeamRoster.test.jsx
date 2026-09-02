import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TeamRoster from '../../../components/ProjectDetail/TeamRoster';

describe('TeamRoster Component', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <TeamRoster 
        members={[]} 
        teamLead={{ user: { full_name: 'Lead' } }} 
      />
    );
    expect(container).toBeInTheDocument();
  });
});
