import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import JiraCallback from '../../pages/public/JiraCallback';

describe('JiraCallback Component', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <JiraCallback />
      </BrowserRouter>
    );
    expect(container).toBeInTheDocument();
  });
});
