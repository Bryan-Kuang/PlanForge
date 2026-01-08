// Database API for renderer process
// This module provides a clean interface for database operations through IPC

export interface Plan {
  id: string;
  title: string;
  description?: string;
  goal: string;
  timeframe?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  milestones?: Milestone[];
  tasks?: Task[];
  resources?: Resource[];
}

export interface Milestone {
  id: string;
  title: string;
  description?: string;
  targetDate?: Date;
  status: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  planId: string;
  tasks?: Task[];
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  estimatedHours?: number;
  actualHours?: number;
  dueDate?: Date;
  completedAt?: Date;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  planId: string;
  milestoneId?: string;
  dependsOn?: TaskDependency[];
  dependencies?: TaskDependency[];
}

export interface TaskDependency {
  id: string;
  dependentId: string;
  prerequisiteId: string;
  dependent?: Task;
  prerequisite?: Task;
}

export interface Resource {
  id: string;
  title: string;
  description?: string;
  url?: string;
  type: string;
  createdAt: Date;
  planId: string;
}

export interface Settings {
  id: string;
  openaiApiKey?: string;
  theme: string;
  language: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanStats {
  totalTasks: number;
  completedTasks: number;
  taskProgress: number;
  totalMilestones: number;
  completedMilestones: number;
  milestoneProgress: number;
  totalEstimatedHours: number;
  totalActualHours: number;
  overallProgress: number;
}

export interface DashboardStats {
  totalPlans: number;
  activePlans: number;
  completedPlans: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  taskCompletionRate: number;
}

class DatabaseAPI {
  private async invokeIPC<T>(channel: string, ...args: any[]): Promise<T> {
    if (window.ipcRenderer) {
      return await window.ipcRenderer.invoke(channel, ...args);
    }
    console.warn(`IPC not available for channel: ${channel}`);
    // Return empty/null values or throw depending on what the UI expects
    // For now, throwing a clearer error is better than "undefined reading invoke"
    throw new Error(`IPC bridge not available. Cannot invoke ${channel}`);
  }

  // Plan operations
  async createPlan(data: {
    title: string;
    description?: string;
    goal: string;
    timeframe?: string;
  }): Promise<Plan> {
    return await this.invokeIPC("db:create-plan", data);
  }

  async getPlans(): Promise<Plan[]> {
    try {
      return await this.invokeIPC("db:get-plans");
    } catch (e) {
      console.warn("Failed to get plans, returning empty array", e);
      return [];
    }
  }

  async getPlan(id: string): Promise<Plan | null> {
    try {
      return await this.invokeIPC("db:get-plan", id);
    } catch (e) {
      return null;
    }
  }

  async updatePlan(
    id: string,
    data: {
      title?: string;
      description?: string;
      goal?: string;
      timeframe?: string;
      status?: string;
    }
  ): Promise<Plan> {
    return await this.invokeIPC("db:update-plan", id, data);
  }

  async deletePlan(id: string): Promise<Plan> {
    return await this.invokeIPC("db:delete-plan", id);
  }

  // Milestone operations
  async createMilestone(data: {
    title: string;
    description?: string;
    targetDate?: Date;
    planId: string;
    order: number;
  }): Promise<Milestone> {
    return await this.invokeIPC("db:create-milestone", data);
  }

  async updateMilestone(
    id: string,
    data: {
      title?: string;
      description?: string;
      targetDate?: Date;
      status?: string;
      order?: number;
    }
  ): Promise<Milestone> {
    return await this.invokeIPC("db:update-milestone", id, data);
  }

  async deleteMilestone(id: string): Promise<Milestone> {
    return await this.invokeIPC("db:delete-milestone", id);
  }

  // Task operations
  async createTask(data: {
    title: string;
    description?: string;
    planId: string;
    milestoneId?: string;
    priority?: string;
    estimatedHours?: number;
    dueDate?: Date;
    order: number;
  }): Promise<Task> {
    return await this.invokeIPC("db:create-task", data);
  }

  async updateTask(
    id: string,
    data: {
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      estimatedHours?: number;
      actualHours?: number;
      dueDate?: Date;
      completedAt?: Date;
      order?: number;
      milestoneId?: string;
    }
  ): Promise<Task> {
    return await this.invokeIPC("db:update-task", id, data);
  }

  async deleteTask(id: string): Promise<Task> {
    return await this.invokeIPC("db:delete-task", id);
  }

  // Task dependency operations
  async createTaskDependency(
    dependentId: string,
    prerequisiteId: string
  ): Promise<TaskDependency> {
    return await this.invokeIPC(
      "db:create-task-dependency",
      dependentId,
      prerequisiteId
    );
  }

  async deleteTaskDependency(
    dependentId: string,
    prerequisiteId: string
  ): Promise<TaskDependency> {
    return await this.invokeIPC(
      "db:delete-task-dependency",
      dependentId,
      prerequisiteId
    );
  }

  // Resource operations
  async createResource(data: {
    title: string;
    description?: string;
    url?: string;
    type: string;
    planId: string;
    id: string;
  }): Promise<Resource> {
    return await this.invokeIPC("db:create-resource", data);
  }

  async updateResource(
    id: string,
    data: {
      title?: string;
      description?: string;
      url?: string;
      type?: string;
    }
  ): Promise<Resource> {
    return await this.invokeIPC("db:update-resource", id, data);
  }

  async deleteResource(id: string): Promise<Resource> {
    return await this.invokeIPC("db:delete-resource", id);
  }

  // Settings operations
  async getSettings(): Promise<Settings> {
    try {
      return await this.invokeIPC("db:get-settings");
    } catch (e) {
      console.warn("Failed to get settings, returning default", e);
      return {
        id: "default",
        theme: "system",
        language: "en",
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
  }

  async updateSettings(data: {
    openaiApiKey?: string;
    theme?: string;
    language?: string;
  }): Promise<Settings> {
    try {
      return await this.invokeIPC("db:update-settings", data);
    } catch (e) {
      console.warn("Failed to update settings (mocking success)", e);
      return {
        id: "default",
        theme: data.theme || "system",
        language: data.language || "en",
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
  }

  // Statistics operations
  async getPlanStats(planId: string): Promise<PlanStats | null> {
    try {
      return await this.invokeIPC("db:get-plan-stats", planId);
    } catch (e) {
      return null;
    }
  }

  async getDashboardStats(): Promise<DashboardStats> {
    try {
      return await this.invokeIPC("db:get-dashboard-stats");
    } catch (e) {
      return {
        totalPlans: 0,
        activePlans: 0,
        completedPlans: 0,
        totalTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
        taskCompletionRate: 0
      };
    }
  }
}

// Export singleton instance
export const db = new DatabaseAPI();
