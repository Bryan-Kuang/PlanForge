import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock Electron's ipcRenderer exposed via preload
const ipcRendererMock = {
  invoke: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
  send: vi.fn(),
};

// Expose on window object
Object.defineProperty(window, 'ipcRenderer', {
  writable: true,
  value: ipcRendererMock,
});

// Mock window.ai (default to undefined to simulate browser/unsupported env)
Object.defineProperty(window, 'ai', {
  writable: true,
  value: undefined,
});

// Mock keytar globally since it's a native module
vi.mock('keytar', () => ({
  default: {
    getPassword: vi.fn(),
    setPassword: vi.fn(),
    deletePassword: vi.fn(),
  },
}));
