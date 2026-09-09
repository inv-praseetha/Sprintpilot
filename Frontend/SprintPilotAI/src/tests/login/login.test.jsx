import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Login from '../../pages/auth/login';
import { useAuth } from '../../context/AuthContext';

// Mock dependencies
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock components
vi.mock('../../components/login/BrandHeader', () => ({
  default: () => <div data-testid="brand-header">BrandHeader</div>
}));
vi.mock('../../components/login/ErrorAlert', () => ({
  default: ({ error }) => error ? <div data-testid="error-alert">{error}</div> : null
}));
vi.mock('../../components/login/GoogleButtonSkeleton', () => ({
  default: ({ onClick }) => <button data-testid="google-skeleton" onClick={onClick}>Fallback Button</button>
}));
vi.mock('../../components/login/LoginIllustration', () => ({
  default: () => <div data-testid="login-illustration">Illustration</div>
}));
vi.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader">Loading...</div>
}));

describe('Login Page', () => {
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ login: mockLogin });
    localStorage.clear();
    
    // Reset global google mock
    window.google = undefined;
    
    // Clean up any existing script tags to prevent state leak between tests
    const existingScript = document.getElementById('google-gsi-script');
    if (existingScript) existingScript.remove();
  });
  
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
  };

  it('redirects to dashboard if already authenticated with token in localStorage', () => {
    localStorage.setItem('access_token', 'fake-token');
    renderComponent();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('renders login layout and components correctly initially', () => {
    renderComponent();
    
    expect(screen.getByText(/Ready to conquer/i)).toBeInTheDocument();
    expect(screen.getByTestId('brand-header')).toBeInTheDocument();
    expect(screen.getByTestId('login-illustration')).toBeInTheDocument();
    expect(screen.getByTestId('google-skeleton')).toBeInTheDocument();
  });

  it('initializes Google SDK and renders button if google object exists', async () => {
    // Mock the Google SDK
    const mockInitialize = vi.fn();
    const mockRenderButton = vi.fn();
    
    window.google = {
      accounts: {
        id: {
          initialize: mockInitialize,
          renderButton: mockRenderButton,
          prompt: vi.fn(),
        }
      }
    };

    renderComponent();
    
    // Simulate script load
    const script = document.getElementById('google-gsi-script');
    if (script && script.onload) script.onload();

    await waitFor(() => {
      expect(mockInitialize).toHaveBeenCalled();
      expect(mockRenderButton).toHaveBeenCalled();
    });
  });

  it('handles Google credential response successfully and redirects to dashboard', async () => {
    mockLogin.mockResolvedValueOnce(true);
    
    renderComponent();
    
    // Simulate google SDK callback
    await act(async () => {
      if (window.handleGoogleCredentialResponse) {
        await window.handleGoogleCredentialResponse({ credential: 'fake-id-token' });
      }
    });
    
    expect(mockLogin).toHaveBeenCalledWith('fake-id-token');
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('handles Google credential response failure and displays standard error message', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Auth failed'));
    
    renderComponent();
    
    // Simulate google SDK callback
    await act(async () => {
      if (window.handleGoogleCredentialResponse) {
        await window.handleGoogleCredentialResponse({ credential: 'fake-id-token' });
      }
    });
    
    expect(mockLogin).toHaveBeenCalledWith('fake-id-token');
    expect(screen.getByTestId('error-alert')).toBeInTheDocument();
    expect(screen.getByText('Auth failed')).toBeInTheDocument();
  });
  
  it('handles Google credential response failure with specific API error response', async () => {
    const apiError = new Error();
    apiError.response = { data: { detail: 'Specific server error' } };
    mockLogin.mockRejectedValueOnce(apiError);
    
    renderComponent();
    
    // Simulate google SDK callback
    await act(async () => {
      if (window.handleGoogleCredentialResponse) {
        await window.handleGoogleCredentialResponse({ credential: 'fake-id-token' });
      }
    });
    
    expect(screen.getByTestId('error-alert')).toBeInTheDocument();
    expect(screen.getByText('Specific server error')).toBeInTheDocument();
  });

  it('handles Google credential response failure with network error', async () => {
    const apiError = new Error();
    apiError.request = {}; // Indicates network error in axios
    mockLogin.mockRejectedValueOnce(apiError);
    
    renderComponent();
    
    await act(async () => {
      if (window.handleGoogleCredentialResponse) {
        await window.handleGoogleCredentialResponse({ credential: 'fake-id-token' });
      }
    });
    
    expect(screen.getByTestId('error-alert')).toBeInTheDocument();
    expect(screen.getByText('Network error. Please check your connection and try again.')).toBeInTheDocument();
  });

  it('calls google prompt on fallback button click', () => {
    const mockPrompt = vi.fn();
    
    window.google = {
      accounts: {
        id: {
          initialize: vi.fn(),
          renderButton: vi.fn().mockImplementation(() => { throw new Error('Render failed'); }),
          prompt: mockPrompt,
        }
      }
    };
    
    renderComponent();
    
    // Simulate script load so it tries to render and fails, keeping the skeleton
    const script = document.getElementById('google-gsi-script');
    if (script && script.onload) script.onload();
    
    const fallbackBtn = screen.getByTestId('google-skeleton');
    fireEvent.click(fallbackBtn);
    
    expect(mockPrompt).toHaveBeenCalled();
  });
});
