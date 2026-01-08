import OpenAI from "openai";
import keytar from "keytar";
import { DatabaseService } from "./database.js";

const SERVICE_NAME = "PlanForge";
const ACCOUNT_NAME = "OpenAI_API_Key";

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

export class AIServiceManager {
  private openai: OpenAI | null = null;
  private settings: AISettings | null = null;
  private db: DatabaseService | null = null;

  setDatabase(db: DatabaseService) {
    this.db = db;
  }

  async initialize(apiKey: string) {
    if (!apiKey) {
      // Try to load from keytar if not provided
      const storedKey = await this.getApiKey();
      if (storedKey) {
        apiKey = storedKey;
      } else {
        throw new Error("OpenAI API key is required");
      }
    }

    if (!apiKey.startsWith("sk-")) {
      throw new Error(
        "Invalid API key format. OpenAI API keys should start with 'sk-'"
      );
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
    });

    this.settings = {
      apiKey,
      model: "gpt-4",
      temperature: 0.7,
    };

    // Test the API key
    try {
      console.log("Testing OpenAI API key...");
      const models = await this.openai.models.list();
      console.log(
        `✅ API key valid. Found ${models.data.length} available models.`
      );
      return true;
    } catch (error) {
      console.error("Failed to initialize OpenAI:", error);

      if (error instanceof Error) {
        if (error.message.includes("401")) {
          throw new Error(
            "Invalid API key. Please check your OpenAI API key and try again."
          );
        } else if (error.message.includes("429")) {
          throw new Error("API rate limit exceeded. Please try again later.");
        } else if (error.message.includes("insufficient_quota")) {
          throw new Error(
            "Insufficient quota. Please check your OpenAI account billing."
          );
        } else {
          throw new Error(`OpenAI API error: ${error.message}`);
        }
      }

      throw new Error("Invalid OpenAI API key or connection failed");
    }
  }

  async getApiKey(): Promise<string | null> {
    try {
      console.log(
        `[Keytar] Attempting to retrieve password for ${SERVICE_NAME}/${ACCOUNT_NAME}`
      );
      const key = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
      console.log(
        `[Keytar] Retrieval result: ${key ? "Success (*****)" : "Null/Empty"}`
      );
      if (key) return key;
    } catch (error) {
      console.error(
        "[Keytar] Failed to get API key from secure storage:",
        error
      );
    }

    // Fallback to database
    if (this.db) {
      try {
        console.log("[Database] Attempting to retrieve API key from settings");
        const settings = await this.db.getSettings();
        if (settings?.openaiApiKey) {
          console.log("[Database] Retrieval result: Success (*****)");
          return settings.openaiApiKey;
        }
      } catch (error) {
        console.error("[Database] Failed to get API key from settings:", error);
      }
    }

    return null;
  }

  async setApiKey(apiKey: string): Promise<void> {
    try {
      console.log(
        `[Keytar] Attempting to save password for ${SERVICE_NAME}/${ACCOUNT_NAME}`
      );
      await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, apiKey);
      console.log(`[Keytar] Password saved successfully`);
    } catch (error) {
      console.error(
        "[Keytar] Failed to save API key to secure storage:",
        error
      );
      // Don't throw here immediately, try database first
    }

    // Backup to database
    if (this.db) {
      try {
        console.log("[Database] Saving API key to settings");
        await this.db.updateSettings({ openaiApiKey: apiKey });
        console.log("[Database] API key saved to settings");
      } catch (error) {
        console.error("[Database] Failed to save API key to settings:", error);
        // If both failed, then we have a problem
        // But we can't easily check if keytar failed above unless we track it
      }
    }
  }

  async deleteApiKey(): Promise<void> {
    try {
      await keytar.deletePassword(SERVICE_NAME, ACCOUNT_NAME);
    } catch (error) {
      console.error("Failed to delete API key from secure storage:", error);
    }

    if (this.db) {
      try {
        await this.db.updateSettings({ openaiApiKey: "" });
      } catch (error) {
        console.error("Failed to delete API key from settings:", error);
      }
    }
  }

  async generatePlan(
    goal: string,
    timeframe?: string
  ): Promise<AIGeneratedPlan> {
    if (!this.openai) {
      console.log(
        "AI service not initialized. Attempting auto-initialization..."
      );
      // Try to auto-initialize if key is available
      const key = await this.getApiKey();
      console.log(
        `Retrieved API key from storage: ${
          key ? "Yes (length: " + key.length + ")" : "No"
        }`
      );

      if (key) {
        await this.initialize(key);
      } else {
        throw new Error(
          "AI features require OpenAI API key. Please configure in Settings."
        );
      }
    }

    // Double check initialization
    if (!this.openai) {
      throw new Error("AI service could not be initialized.");
    }

    const timeframeText = timeframe
      ? `within ${timeframe}`
      : "with no specific timeframe";

    const prompt = `You are an expert project manager and goal-setting coach. Create a detailed, actionable plan for the following goal: "${goal}" ${timeframeText}.

Please provide a comprehensive plan in the following JSON format:

{
  "title": "A concise, actionable title for the plan (max 60 characters)",
  "description": "A brief description of what this plan will accomplish (2-3 sentences)",
  "milestones": [
    {
      "title": "Milestone title",
      "description": "What this milestone achieves",
      "order": 1,
      "estimatedDuration": "e.g., 2 weeks, 1 month"
    }
  ],
  "tasks": [
    {
      "title": "Specific, actionable task title",
      "description": "Detailed description of what needs to be done",
      "priority": "HIGH|MEDIUM|LOW",
      "estimatedHours": 8,
      "milestoneIndex": 0,
      "order": 1,
      "prerequisites": ["Optional array of prerequisite task titles"]
    }
  ],
  "estimatedTimeframe": "Overall estimated timeframe",
  "tips": ["Helpful tips and advice for success"]
}

Guidelines:
- Create 3-5 logical milestones that build upon each other
- Generate 8-15 specific, actionable tasks
- Distribute tasks across milestones logically
- Use realistic time estimates
- Include both high-level strategy and specific actions
- Consider dependencies between tasks
- Provide practical, actionable advice in tips
- Make sure the plan is achievable and well-structured

Focus on creating a plan that is specific, measurable, achievable, relevant, and time-bound (SMART).`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.settings!.model,
        messages: [
          {
            role: "system",
            content:
              "You are an expert project manager and goal-setting coach. Always respond with valid JSON only, no additional text or explanations.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: this.settings!.temperature,
        max_tokens: 3000,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error("No response from OpenAI");
      }

      const cleanedResponse = response
        .trim()
        .replace(/^```json\n?/, "")
        .replace(/\n?```$/, "");

      try {
        const plan: AIGeneratedPlan = JSON.parse(cleanedResponse);

        if (!plan.title || !plan.milestones || !plan.tasks) {
          throw new Error("Invalid plan structure from AI");
        }

        return plan;
      } catch (parseError) {
        console.error("Failed to parse AI response:", response);
        throw new Error("Failed to parse AI response as JSON");
      }
    } catch (error) {
      console.error("OpenAI API error:", error);
      if (error instanceof Error) {
        throw new Error(`AI generation failed: ${error.message}`);
      }
      throw new Error("AI generation failed with unknown error");
    }
  }

  async enhanceTask(
    taskTitle: string,
    context: string
  ): Promise<{
    description: string;
    estimatedHours: number;
    tips: string[];
  }> {
    if (!this.openai) {
      // Try to auto-initialize
      const key = await this.getApiKey();
      if (key) {
        await this.initialize(key);
      } else {
        throw new Error("AI service not initialized");
      }
    }

    if (!this.openai) {
      throw new Error("AI service not initialized");
    }

    const prompt = `Enhance this task with more details:

Task: "${taskTitle}"
Context: "${context}"

Provide a JSON response with:
{
  "description": "Detailed description of what needs to be done (2-3 sentences)",
  "estimatedHours": 8,
  "tips": ["Practical tips for completing this task effectively"]
}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.settings!.model,
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant. Respond with valid JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.5,
        max_tokens: 500,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error("No response from OpenAI");
      }

      const cleanedResponse = response
        .trim()
        .replace(/^```json\n?/, "")
        .replace(/\n?```$/, "");
      return JSON.parse(cleanedResponse);
    } catch (error) {
      console.error("Task enhancement error:", error);
      throw new Error("Failed to enhance task with AI");
    }
  }

  async suggestNextSteps(
    planTitle: string,
    completedTasks: string[],
    remainingTasks: string[]
  ): Promise<string[]> {
    if (!this.openai) {
      // Try to auto-initialize
      const key = await this.getApiKey();
      if (key) {
        await this.initialize(key);
      } else {
        throw new Error("AI service not initialized");
      }
    }

    if (!this.openai) {
      throw new Error("AI service not initialized");
    }

    const prompt = `Given the following plan progress, suggest 3-5 next steps or recommendations:

Plan: "${planTitle}"
Completed Tasks: ${completedTasks.join(", ")}
Remaining Tasks: ${remainingTasks.join(", ")}

Provide a JSON array of actionable suggestions:
["Suggestion 1", "Suggestion 2", "Suggestion 3"]`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.settings!.model,
        messages: [
          {
            role: "system",
            content:
              "You are a helpful project advisor. Respond with a JSON array only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error("No response from OpenAI");
      }

      const cleanedResponse = response
        .trim()
        .replace(/^```json\n?/, "")
        .replace(/\n?```$/, "");
      return JSON.parse(cleanedResponse);
    } catch (error) {
      console.error("Next steps suggestion error:", error);
      throw new Error("Failed to get AI suggestions");
    }
  }

  async generateTasks(
    planTitle: string,
    planGoal: string,
    existingTasks: string[]
  ): Promise<AIGeneratedTask[]> {
    if (!this.openai) {
      const key = await this.getApiKey();
      if (key) {
        await this.initialize(key);
      } else {
        throw new Error("AI service not initialized");
      }
    }

    if (!this.openai) {
      throw new Error("AI service not initialized");
    }

    const prompt = `Generate 3-5 specific, actionable tasks for the following plan:

Plan Title: "${planTitle}"
Plan Goal: "${planGoal}"
Existing Tasks: ${existingTasks.join(", ")}

Provide a JSON array of tasks in this format:
[
  {
    "title": "Task title",
    "description": "Task description",
    "priority": "HIGH|MEDIUM|LOW",
    "estimatedHours": 2,
    "order": 1
  }
]
Focus on tasks that are missing or would be logical next steps.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.settings!.model,
        messages: [
          {
            role: "system",
            content:
              "You are an expert project manager. Respond with valid JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error("No response from OpenAI");
      }

      const cleanedResponse = response
        .trim()
        .replace(/^```json\n?/, "")
        .replace(/\n?```$/, "");
      return JSON.parse(cleanedResponse);
    } catch (error) {
      console.error("Task generation error:", error);
      throw new Error("Failed to generate tasks");
    }
  }

  isInitialized(): boolean {
    return this.openai !== null;
  }
}
