import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SprintNotesSection from '../../../components/Sprint/SprintNotesSection';
import SprintServices from '../../../services/SprintServices';
import { useToast } from '../../../context/ToastContext';
import { useConfirm } from '../../../context/ConfirmContext';
import apiClient from '../../../api/apiClient';
import { useAuth } from '../../../context/AuthContext';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('../../../services/SprintServices', () => ({
  default: {
    saveSprintNote: vi.fn(),
    getSprintNotes: vi.fn()
  }
}));

vi.mock('../../../context/ToastContext', () => ({
  useToast: vi.fn()
}));

vi.mock('../../../context/ConfirmContext', () => ({
  useConfirm: vi.fn()
}));

vi.mock('../../../api/apiClient', () => ({
  default: {
    defaults: { baseURL: 'http://localhost:8000/api/' }
  }
}));

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
      { id: 2, date: '2026-07-02', content: 'Note two content', attachment: '/media/attachments/doc.pdf', updated_at: '2026-07-02T10:00:00Z' },
      { id: 3, date: '2026-07-03', content: '', attachment: 'http://localhost/empty.pdf', updated_at: '2026-07-03T10:00:00Z' }
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
    notesOffset: 3,
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
    useAuth.mockReturnValue({ user: { role: 'PROJECT_MANAGER' } });
  });

  it('renders read-only view for Team Lead / non-PM users', () => {
    useAuth.mockReturnValue({ user: { role: 'TEAM_LEAD' } });
    render(<SprintNotesSection {...defaultProps} selectedNoteDate="2026-07-02" />);

    expect(screen.getByText('Read-Only View')).toBeInTheDocument();
    expect(screen.queryByTitle('Delete attachment')).not.toBeInTheDocument();
    expect(screen.queryByText('Attach PDF')).not.toBeInTheDocument();
    expect(screen.queryByText('Replace')).not.toBeInTheDocument();
  });

  it('renders notes content and historical timeline list including PDF only notes', () => {
    render(<SprintNotesSection {...defaultProps} />);

    expect(screen.getByText('Daily Sprint MOM')).toBeInTheDocument();
    expect(screen.getByText('Chronological History')).toBeInTheDocument();
    expect(screen.getAllByText('Note one content')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Note two content')[0]).toBeInTheDocument();
    expect(screen.getByText('doc.pdf')).toBeInTheDocument();
    expect(screen.getByText('empty.pdf')).toBeInTheDocument();
  });

  it('handles relative path attachment URLs correctly', () => {
    render(<SprintNotesSection {...defaultProps} selectedNoteDate="2026-07-02" />);

    const downloadBtn = screen.getByText('Download');
    expect(downloadBtn).toHaveAttribute('href', 'http://127.0.0.1:8000/media/attachments/doc.pdf');
  });

  it('handles clicking download PDF links in timeline with stopPropagation', () => {
    render(<SprintNotesSection {...defaultProps} />);

    const pdfLinks = screen.getAllByTitle('Download PDF attachment');
    expect(pdfLinks.length).toBeGreaterThan(0);

    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    const spy = vi.spyOn(clickEvent, 'stopPropagation');

    fireEvent(pdfLinks[0], clickEvent);
    expect(spy).toHaveBeenCalled();
  });

  it('renders empty notes state when notes array is empty', () => {
    render(<SprintNotesSection {...defaultProps} notes={[]} />);
    expect(screen.getByText('No logs recorded yet')).toBeInTheDocument();
  });

  it('renders dark mode styling correctly', () => {
    const { container } = render(<SprintNotesSection {...defaultProps} darkMode={true} isSavingNote={true} />);
    expect(container.firstChild).toBeInTheDocument();
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('triggers setTodayNote when user types in ReactQuill editor', () => {
    render(<SprintNotesSection {...defaultProps} />);
    const editor = screen.getByTestId('mock-rich-editor');
    fireEvent.change(editor, { target: { value: 'Updated note text' } });
    expect(defaultProps.setTodayNote).toHaveBeenCalledWith('Updated note text');
  });

  it('switches notes date when clicking a note from history timeline', () => {
    render(<SprintNotesSection {...defaultProps} />);

    const noteTwoBtn = screen.getByText('Note two content').closest('button');
    fireEvent.click(noteTwoBtn);

    expect(defaultProps.setSelectedNoteDate).toHaveBeenCalledWith('2026-07-02');
    expect(defaultProps.setTodayNote).toHaveBeenCalledWith('Note two content');
    expect(defaultProps.setPdfPreviewToggle).toHaveBeenCalledWith(null);
  });

  it('switches to today when Switch to Today button is clicked', () => {
    render(<SprintNotesSection {...defaultProps} selectedNoteDate="2026-07-02" />);

    const switchBtn = screen.getByText('Switch to Today');
    fireEvent.click(switchBtn);

    expect(defaultProps.setSelectedNoteDate).toHaveBeenCalledWith(todayStr);
    expect(defaultProps.setPdfPreviewToggle).toHaveBeenCalledWith(null);
  });

  it('uploads PDF attachment via input file field change', async () => {
    const savedNote = { id: 1, date: todayStr, content: 'Note one content', attachment: 'new.pdf' };
    SprintServices.saveSprintNote.mockResolvedValue(savedNote);

    const setNotesMock = vi.fn((updateFn) => {
      const prev = defaultProps.notes;
      const next = updateFn(prev);
      expect(next[0].attachment).toBe('new.pdf');
    });

    render(<SprintNotesSection {...defaultProps} setNotes={setNotesMock} />);

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['pdf-data'], 'test.pdf', { type: 'application/pdf' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(defaultProps.setIsSavingNote).toHaveBeenCalledWith(true);
      expect(SprintServices.saveSprintNote).toHaveBeenCalled();
      expect(setNotesMock).toHaveBeenCalled();
    });
  });

  it('handles attachment upload error gracefully', async () => {
    SprintServices.saveSprintNote.mockRejectedValue(new Error('Upload failed'));

    render(<SprintNotesSection {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['pdf-data'], 'test.pdf', { type: 'application/pdf' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to upload PDF attachment. Please try again.');
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

  it('cancels removeAttachment flow when confirm returns false', async () => {
    mockConfirm.mockResolvedValue(false);

    render(<SprintNotesSection {...defaultProps} selectedNoteDate="2026-07-02" todayNote="Note two content" />);

    const removeBtn = screen.getByTitle('Delete attachment');
    await fireEvent.click(removeBtn);

    expect(SprintServices.saveSprintNote).not.toHaveBeenCalled();
  });

  it('calls removeAttachment flow when delete attachment button is confirmed', async () => {
    mockConfirm.mockResolvedValue(true);
    const savedNote = { id: 2, date: '2026-07-02', content: 'Note two content', attachment: null };
    SprintServices.saveSprintNote.mockResolvedValue(savedNote);

    const setNotesMock = vi.fn((updateFn) => {
      const prev = defaultProps.notes;
      const next = updateFn(prev);
      expect(next[1].attachment).toBeNull();
    });

    render(
      <SprintNotesSection
        {...defaultProps}
        selectedNoteDate="2026-07-02"
        todayNote="Note two content"
        setNotes={setNotesMock}
      />
    );

    const removeBtn = screen.getByTitle('Delete attachment');
    await fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalled();
      expect(SprintServices.saveSprintNote).toHaveBeenCalled();
      expect(setNotesMock).toHaveBeenCalled();
    });
  });

  it('handles removeAttachment error gracefully', async () => {
    mockConfirm.mockResolvedValue(true);
    SprintServices.saveSprintNote.mockRejectedValue(new Error('Delete error'));

    render(<SprintNotesSection {...defaultProps} selectedNoteDate="2026-07-02" todayNote="Note two content" />);

    const removeBtn = screen.getByTitle('Delete attachment');
    await fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to remove PDF attachment. Please try again.');
    });
  });

  it('renders PDF preview when shouldShowPdfPreview is true', () => {
    render(
      <SprintNotesSection
        {...defaultProps}
        selectedNoteDate="2026-07-02"
        pdfPreviewToggle="preview"
      />
    );

    expect(screen.getByTitle('PDF Attachment Preview')).toBeInTheDocument();
    expect(screen.getByText('Edit Text Note')).toBeInTheDocument();

    const editNoteBtn = screen.getByText('Edit Text Note');
    fireEvent.click(editNoteBtn);
    expect(defaultProps.setPdfPreviewToggle).toHaveBeenCalledWith('editor');
  });

  it('triggers autosave effect when todayNote changes from last saved ref for new date', async () => {
    const savedNote = { id: 99, date: '2026-07-10', content: 'Brand new note', attachment: null };
    SprintServices.saveSprintNote.mockResolvedValue(savedNote);

    const setNotesMock = vi.fn((updateFn) => {
      const updated = updateFn([]);
      expect(updated[0]).toEqual(savedNote);
    });

    render(
      <SprintNotesSection
        {...defaultProps}
        selectedNoteDate="2026-07-10"
        todayNote="Brand new note"
        lastSavedContentRef={{ current: 'Old content' }}
        setNotes={setNotesMock}
      />
    );

    await waitFor(() => {
      expect(SprintServices.saveSprintNote).toHaveBeenCalledWith(10, {
        date: '2026-07-10',
        content: 'Brand new note'
      });
      expect(setNotesMock).toHaveBeenCalled();
    }, { timeout: 3500 });
  });

  it('handles error during autosave effect gracefully', async () => {
    SprintServices.saveSprintNote.mockRejectedValue(new Error('Autosave failed'));

    render(
      <SprintNotesSection
        {...defaultProps}
        todayNote="Error text"
        lastSavedContentRef={{ current: 'Initial text' }}
      />
    );

    await waitFor(() => {
      expect(SprintServices.saveSprintNote).toHaveBeenCalled();
    }, { timeout: 3500 });
  });

  it('calls loadMoreNotes when notes list container is scrolled to bottom', async () => {
    SprintServices.getSprintNotes.mockResolvedValue([
      { id: 4, date: '2026-07-04', content: 'Older note', attachment: null, updated_at: '2026-07-04T10:00:00Z' }
    ]);

    render(<SprintNotesSection {...defaultProps} />);

    const allScrollable = document.querySelectorAll('[class*="overflow-y-auto"]');
    const historyContainer = allScrollable[allScrollable.length - 1];

    expect(historyContainer).toBeTruthy();

    Object.defineProperty(historyContainer, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(historyContainer, 'clientHeight', { value: 500, configurable: true });
    Object.defineProperty(historyContainer, 'scrollTop', { value: 490, configurable: true });

    fireEvent.scroll(historyContainer);

    await waitFor(() => {
      expect(SprintServices.getSprintNotes).toHaveBeenCalledWith(10, 5, 3);
    });
  });

  it('handles loadMoreNotes returning fewer than 5 items', async () => {
    SprintServices.getSprintNotes.mockResolvedValue([]);

    render(<SprintNotesSection {...defaultProps} />);

    const allScrollable = document.querySelectorAll('[class*="overflow-y-auto"]');
    const historyContainer = allScrollable[allScrollable.length - 1];

    Object.defineProperty(historyContainer, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(historyContainer, 'clientHeight', { value: 500, configurable: true });
    Object.defineProperty(historyContainer, 'scrollTop', { value: 490, configurable: true });

    fireEvent.scroll(historyContainer);

    await waitFor(() => {
      expect(defaultProps.setHasMoreNotes).toHaveBeenCalledWith(false);
    });
  });
});
