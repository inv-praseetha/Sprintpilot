import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SprintNotesSection from '../../../components/Sprint/SprintNotesSection';
import SprintServices from '../../../services/SprintServices';
import { useToast } from '../../../context/ToastContext';
import { useConfirm } from '../../../context/ConfirmContext';

// Mock SprintServices
vi.mock('../../../services/SprintServices', () => ({
  default: {
    saveSprintNote: vi.fn(),
    getSprintNotes: vi.fn()
  }
}));

// Mock ToastContext
vi.mock('../../../context/ToastContext', () => ({
  useToast: vi.fn()
}));

// Mock ConfirmContext
vi.mock('../../../context/ConfirmContext', () => ({
  useConfirm: vi.fn()
}));

// Mock ReactQuill
vi.mock('react-quill-new', () => ({
  default: ({ value, onChange, placeholder }) => (
    <textarea
      data-testid="mock-rich-editor"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value, null, 'user')}
    />
  )
}));

describe('SprintNotesSection Component', () => {
  const mockToast = {
    error: vi.fn(),
    success: vi.fn()
  };
  const mockConfirm = vi.fn();

  const todayStr = new Date().toLocaleDateString('en-CA');

  const defaultProps = {
    sprintId: 10,
    notes: [
      { id: 1, date: todayStr, content: 'Note one content', attachment: null, updated_at: '2026-07-01T10:00:00Z' },
      { id: 2, date: '2026-07-02', content: 'Note two content', attachment: 'http://localhost/doc.pdf', updated_at: '2026-07-02T10:00:00Z' }
    ],
    setNotes: vi.fn(),
    todayNote: 'Note one content',
    setTodayNote: vi.fn(),
    selectedNoteDate: todayStr,
    setSelectedNoteDate: vi.fn(),
    isSavingNote: false,
    setIsSavingNote: vi.fn(),
    lastSavedNoteTime: '10:00:00 AM',
    setLastSavedNoteTime: vi.fn(),
    pdfPreviewToggle: null,
    setPdfPreviewToggle: vi.fn(),
    notesOffset: 2,
    setNotesOffset: vi.fn(),
    hasMoreNotes: true,
    setHasMoreNotes: vi.fn(),
    loadingMoreNotes: false,
    setLoadingMoreNotes: vi.fn(),
    lastSavedContentRef: { current: 'Note one content' },
    darkMode: false,
    pageLoading: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useToast.mockReturnValue(mockToast);
    useConfirm.mockReturnValue(mockConfirm);
  });

  it('renders notes content and historical timeline list', () => {
    render(<SprintNotesSection {...defaultProps} />);

    expect(screen.getByText('Daily Sprint MOM')).toBeInTheDocument();
    expect(screen.getByText('Chronological History')).toBeInTheDocument();
    
    // Notes content in timeline
    expect(screen.getAllByText('Note one content')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Note two content')[0]).toBeInTheDocument();
    expect(screen.getByText('doc.pdf')).toBeInTheDocument();
  });

  it('switches notes date when clicking a note from history timeline', () => {
    render(<SprintNotesSection {...defaultProps} />);

    // Click note two
    const noteTwoBtn = screen.getByText('Note two content').closest('button');
    fireEvent.click(noteTwoBtn);

    expect(defaultProps.setSelectedNoteDate).toHaveBeenCalledWith('2026-07-02');
    expect(defaultProps.setTodayNote).toHaveBeenCalledWith('Note two content');
    expect(defaultProps.setPdfPreviewToggle).toHaveBeenCalledWith(null);
  });

  it('uploads PDF attachment via input file field change', async () => {
    const savedNote = { id: 3, date: '2026-07-01', content: 'Note one content', attachment: 'new.pdf' };
    SprintServices.saveSprintNote.mockResolvedValue(savedNote);

    render(<SprintNotesSection {...defaultProps} />);

    // Find PDF file input
    const fileInput = screen.getByLabelText('Attach PDF').querySelector('input') || document.querySelector('input[type="file"]');
    const file = new File(['pdf-data'], 'test.pdf', { type: 'application/pdf' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(defaultProps.setIsSavingNote).toHaveBeenCalledWith(true);
      expect(SprintServices.saveSprintNote).toHaveBeenCalled();
    });
  });

  it('restricts non-pdf attachment uploads', () => {
    render(<SprintNotesSection {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['img-data'], 'test.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(mockToast.error).toHaveBeenCalledWith('Please upload a PDF file only.');
    expect(SprintServices.saveSprintNote).not.toHaveBeenCalled();
  });

  it('calls removeAttachment flow when delete attachment button is confirmed', async () => {
    mockConfirm.mockResolvedValue(true);
    SprintServices.saveSprintNote.mockResolvedValue({
      id: 2, date: '2026-07-02', content: 'Note two content', attachment: null
    });

    render(<SprintNotesSection {...defaultProps} selectedNoteDate="2026-07-02" todayNote="Note two content" />);

    // The delete attachment button uses title="Delete attachment"
    const removeBtn = screen.getByTitle('Delete attachment');
    await fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalled();
    });
  });

  it('calls loadMoreNotes when notes list container is scrolled to bottom', async () => {
    SprintServices.getSprintNotes.mockResolvedValue([
      { id: 3, date: '2026-07-03', content: 'Older note', attachment: null, updated_at: '2026-07-03T10:00:00Z' }
    ]);

    render(<SprintNotesSection {...defaultProps} />);

    // Find the scrollable overflow container inside chronological history column
    const allScrollable = document.querySelectorAll('[class*="overflow-y-auto"]');
    // The history list is the last such container (right-hand column)
    const historyContainer = allScrollable[allScrollable.length - 1];

    expect(historyContainer).toBeTruthy();

    Object.defineProperty(historyContainer, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(historyContainer, 'clientHeight', { value: 500, configurable: true });
    Object.defineProperty(historyContainer, 'scrollTop', { value: 490, configurable: true });

    fireEvent.scroll(historyContainer);

    await waitFor(() => {
      expect(SprintServices.getSprintNotes).toHaveBeenCalled();
    });
  });
});

