import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import NotFound from '../../../pages/public/NotFound';

vi.mock('../../../components/layout/MainLayouut', () => ({
  useTheme: () => ({ darkMode: false })
}));

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
