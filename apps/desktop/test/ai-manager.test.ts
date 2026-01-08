import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIServiceManager } from '../electron/ai-manager';
import keytar from 'keytar';

// Mock OpenAI
const mockChatCreate = vi.fn();
const mockModelsList = vi.fn();

vi.mock('openai', () => {
  return {
    default: class OpenAI {
      chat = {
        completions: {
          create: mockChatCreate,
        },
      };
      models = {
        list: mockModelsList,
      };
    },
  };
});

describe('AIServiceManager Logic', () => {
  let aiManager: AIServiceManager;

  beforeEach(() => {
    vi.clearAllMocks();
    aiManager = new AIServiceManager();
    
    // Default mock implementation for models list (used during initialization)
    mockModelsList.mockResolvedValue({ data: [{ id: 'gpt-4' }] });
  });

  it('should auto-initialize and succeed if service is uninitialized but key exists in storage', async () => {
    // 1. Setup: Keytar has a valid key
    // @ts-ignore - keytar is mocked in setup.ts
    vi.mocked(keytar.getPassword).mockResolvedValue('sk-valid-key-from-storage');
    
    // 2. Setup: OpenAI mock returns a valid plan
    const mockPlan = {
      title: "Test Plan",
      description: "Test Description",
      milestones: [],
      tasks: [],
      estimatedTimeframe: "1 week",
      tips: []
    };
    mockChatCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockPlan) } }]
    });

    // 3. Action: Call generatePlan without calling initialize() first
    // This triggers the specific logic we fixed: 
    // "if (!this.openai) { ... getApiKey() ... initialize() ... }"
    const result = await aiManager.generatePlan('Test Goal');

    // 4. Verification
    // It should have checked storage
    expect(keytar.getPassword).toHaveBeenCalled();
    // It should have initialized (which calls models.list)
    expect(mockModelsList).toHaveBeenCalled();
    // It should have called OpenAI completion
    expect(mockChatCreate).toHaveBeenCalled();
    // It should return the correct plan
    expect(result).toEqual(mockPlan);
  });

  it('should throw correct error if key is missing from storage', async () => {
    // 1. Setup: Keytar returns null
    // @ts-ignore
    vi.mocked(keytar.getPassword).mockResolvedValue(null);

    // 2. Action & Assert
    await expect(aiManager.generatePlan('Test Goal'))
      .rejects.toThrow("AI features require OpenAI API key");
  });
});
