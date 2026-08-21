import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import NotFound from '../../pages/public/NotFound';

describe('NotFound Component', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <NotFound />
      </BrowserRouter>
    );
    expect(container).toBeInTheDocument();
  });
});
