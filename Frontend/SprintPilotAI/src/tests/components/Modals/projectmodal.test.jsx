import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProjectModal from '../../../components/Modals/projectmodal';

vi.mock('lucide-react', () => ({
  X: () => <div data-testid="close-icon">X</div>,
}));

describe('ProjectModal Component', () => {
  const defaultProps = {
    show: true,
    onClose: vi.fn(),
    darkMode: false,
    title: 'Test Modal Title',
  };

  it('renders nothing when show is false', () => {
    const { container } = render(<ProjectModal {...defaultProps} show={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the modal with correct title and children when show is true', () => {
    render(
      <ProjectModal {...defaultProps}>
        <div data-testid="modal-child">Child Content</div>
      </ProjectModal>
    );

    expect(screen.getByText('Test Modal Title')).toBeInTheDocument();
    expect(screen.getByTestId('modal-child')).toBeInTheDocument();
    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<ProjectModal {...defaultProps} />);
    
    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);
    
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('applies dark mode classes when darkMode is true', () => {
    const { container } = render(<ProjectModal {...defaultProps} darkMode={true} />);
    const modalContainer = container.firstChild.firstChild;
    expect(modalContainer.className).toContain('bg-slate-900');
  });
});
