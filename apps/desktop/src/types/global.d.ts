export interface IElectronAPI {
  on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
  off: (channel: string, listener?: (...args: any[]) => void) => void;
  send: (channel: string, ...args: any[]) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
}

export interface IAIAPI {
  initialize: (apiKey: string) => Promise<boolean>;
  generatePlan: (goal: string, timeframe?: string) => Promise<any>;
  enhanceTask: (
    taskTitle: string,
    context: string
  ) => Promise<{
    description: string;
    estimatedHours: number;
    tips: string[];
  }>;
  suggestNextSteps: (
    planTitle: string,
    completedTasks: string[],
    remainingTasks: string[]
  ) => Promise<string[]>;
  getApiKey: () => Promise<string | null>;
  setApiKey: (apiKey: string) => Promise<void>;
  deleteApiKey: () => Promise<void>;
}

declare global {
  interface Window {
    ipcRenderer: IElectronAPI;
    ai: IAIAPI;
  }
}
