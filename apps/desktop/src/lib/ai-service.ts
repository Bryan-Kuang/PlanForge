export interface AIGeneratedPlan {
  title: string;
  description: string;
  milestones: AIGeneratedMilestone[];
  tasks: AIGeneratedTask[];
  estimatedTimeframe: string;
  tips: string[];
}

export interface AIGeneratedMilestone {
  title: string;
  description: string;
  order: number;
  estimatedDuration: string;
}

export interface AIGeneratedTask {
  title: string;
  description: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  estimatedHours: number;
  milestoneIndex?: number;
  order: number;
  prerequisites?: string[];
}

export interface AISettings {
  apiKey: string;
  model: string;
  temperature: number;
}

class AIService {
  private initialized = false;

  private isElectron(): boolean {
    return (
      typeof window !== "undefined" && (!!window.ai || !!window.ipcRenderer)
    );
  }

  private async invokeAI(
    method: keyof typeof window.ai | string,
    ...args: any[]
  ) {
    // 1. Try window.ai (Preferred)
    if (window.ai && typeof (window.ai as any)[method] === "function") {
      return await (window.ai as any)[method](...args);
    }

    // 2. Try ipcRenderer (Fallback)
    if (window.ipcRenderer) {
      const channelMap: Record<string, string> = {
        initialize: "ai:initialize",
        generatePlan: "ai:generate-plan",
        enhanceTask: "ai:enhance-task",
        suggestNextSteps: "ai:suggest-next-steps",
        generateTasks: "ai:generate-tasks",
        getApiKey: "ai:get-api-key",
        setApiKey: "ai:set-api-key",
        deleteApiKey: "ai:delete-api-key",
      };
      const channel = channelMap[method as string];
      if (channel) {
        return await window.ipcRenderer.invoke(channel, ...args);
      }
    }

    throw new Error(`AI provider not available for ${String(method)}`);
  }

  /**
   * Initialize the AI service in the main process
   */
  async initialize(apiKey: string): Promise<boolean> {
    if (!this.isElectron()) {
      console.warn(
        "AI service not available in browser. Using mock implementation."
      );
      this.initialized = true;
      return true;
    }
    try {
      this.initialized = await this.invokeAI("initialize", apiKey);
      return this.initialized;
    } catch (error) {
      console.error("Failed to initialize AI service:", error);
      throw error;
    }
  }

  /**
   * Generate a full plan for a given goal
   */
  async generatePlan(
    goal: string,
    timeframe?: string
  ): Promise<AIGeneratedPlan> {
    if (!this.isElectron()) {
      // Return mock plan for testing/preview
      return {
        title: `Plan for: ${goal}`,
        description: "This is a mock plan generated in the browser preview.",
        estimatedTimeframe: timeframe || "1 month",
        milestones: [
          {
            title: "Phase 1: Planning",
            description: "Initial planning phase",
            order: 1,
            estimatedDuration: "1 week",
          },
        ],
        tasks: [
          {
            title: "Research requirements",
            description: "Gather necessary information",
            priority: "HIGH",
            estimatedHours: 4,
            order: 1,
            milestoneIndex: 0,
          },
        ],
        tips: ["This is a mock tip."],
      };
    }

    try {
      return await this.invokeAI("generatePlan", goal, timeframe);
    } catch (error) {
      console.error("Plan generation error:", error);
      throw error;
    }
  }

  /**
   * Enhance a specific task with more details
   */
  async enhanceTask(
    taskTitle: string,
    context: string
  ): Promise<{
    description: string;
    estimatedHours: number;
    tips: string[];
  }> {
    if (!this.isElectron()) {
      return {
        description: `Enhanced description for ${taskTitle}`,
        estimatedHours: 4,
        tips: ["Mock tip for task enhancement"],
      };
    }

    try {
      return await this.invokeAI("enhanceTask", taskTitle, context);
    } catch (error) {
      console.error("Task enhancement error:", error);
      throw error;
    }
  }

  async suggestNextSteps(
    planGoal: string,
    completedTasks: string[],
    pendingTasks: string[]
  ): Promise<string[]> {
    if (this.isElectron()) {
      return await this.invokeAI(
        "suggestNextSteps",
        planGoal,
        completedTasks,
        pendingTasks
      );
    }
    // Mock data for web
    return [
      "Review project requirements",
      "Set up development environment",
      "Create initial project structure",
    ];
  }

  async generateTasks(
    planTitle: string,
    planGoal: string,
    existingTasks: string[],
    count?: number
  ): Promise<AIGeneratedTask[]> {
    if (this.isElectron()) {
      return await this.invokeAI(
        "generateTasks",
        planTitle,
        planGoal,
        existingTasks,
        count
      );
    }
    // Mock data for web
    return [
      {
        title: "Research competitors",
        description: "Analyze top 3 competitors in the market",
        priority: "HIGH",
        estimatedHours: 4,
        order: 1,
      },
      {
        title: "Define user personas",
        description: "Create detailed user personas for target audience",
        priority: "MEDIUM",
        estimatedHours: 3,
        order: 2,
      },
    ];
  }

  async getApiKey(): Promise<string | null> {
    if (!this.isElectron()) {
      return null;
    }
    return await this.invokeAI("getApiKey");
  }

  async setApiKey(apiKey: string): Promise<void> {
    if (!this.isElectron()) {
      this.initialized = true;
      return;
    }
    await this.invokeAI("setApiKey", apiKey);
    // Also re-initialize if key is set
    await this.initialize(apiKey);
  }

  async deleteApiKey(): Promise<void> {
    if (!this.isElectron()) {
      this.initialized = false;
      return;
    }
    await this.invokeAI("deleteApiKey");
    this.initialized = false;
  }

  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const aiService = new AIService();
export default aiService;
