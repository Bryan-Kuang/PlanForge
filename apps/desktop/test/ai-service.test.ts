import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiService } from '../src/lib/ai-service';

describe('AIService Frontend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset defaults
    Object.defineProperty(window, 'ai', { value: undefined, writable: true });
    Object.defineProperty(window, 'ipcRenderer', { value: undefined, writable: true });
  });

  it('should use window.ai if available (Preferred)', async () => {
    // Setup: window.ai exists
    const mockInitialize = vi.fn().mockResolvedValue(true);
    Object.defineProperty(window, 'ai', { 
      value: { initialize: mockInitialize }, 
      writable: true 
    });

    await aiService.initialize('sk-test');
    expect(mockInitialize).toHaveBeenCalledWith('sk-test');
  });

  it('should fallback to IPC if window.ai is missing but ipcRenderer exists', async () => {
    // Setup: window.ai is undefined
    Object.defineProperty(window, 'ai', { value: undefined, writable: true });
    
    // Setup: ipcRenderer is available
    const invokeMock = vi.fn().mockResolvedValue(true);
    Object.defineProperty(window, 'ipcRenderer', { 
      value: { invoke: invokeMock }, 
      writable: true 
    });

    // Action
    await aiService.initialize('sk-test');

    // Assert
    expect(invokeMock).toHaveBeenCalledWith('ai:initialize', 'sk-test');
  });

  it('should use Mock Mode (return true) if in Browser (neither available)', async () => {
    // Setup: Both missing
    Object.defineProperty(window, 'ai', { value: undefined, writable: true });
    Object.defineProperty(window, 'ipcRenderer', { value: undefined, writable: true });

    // Action
    const result = await aiService.initialize('sk-test');

    // Assert: Should return true (Mock success)
    expect(result).toBe(true);
  });

  it('should throw error if in Electron (ipcRenderer exists) but call fails', async () => {
    // This simulates the user seeing "Invalid" if the backend rejects the key
    Object.defineProperty(window, 'ai', { value: undefined, writable: true });
    
    const invokeMock = vi.fn().mockRejectedValue(new Error("Invalid API Key"));
    Object.defineProperty(window, 'ipcRenderer', { 
      value: { invoke: invokeMock }, 
      writable: true 
    });

    await expect(aiService.initialize('invalid-key'))
      .rejects.toThrow("Invalid API Key");
  });
});
