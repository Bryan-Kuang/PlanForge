import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Edit,
  Target,
  Clock,
  CheckCircle,
  Circle,
  PlayCircle,
  PauseCircle,
  AlertCircle,
  Calendar,
  ExternalLink,
  Plus,
  MoreHorizontal,
  Sparkles,
  Lightbulb,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { db, type Plan, type Task, type Milestone } from "../lib/database-api";
import { aiService } from "../lib/ai-service";
import TaskDetailModal from "../components/TaskDetailModal";
import CreateMilestoneModal from "../components/CreateMilestoneModal";
import Tooltip from "../components/Tooltip";

const PlanDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState(false);
  const [planTitle, setPlanTitle] = useState("");
  const [planDescription, setPlanDescription] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Task Modal State
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const [showGenerateSettings, setShowGenerateSettings] = useState(false);
  const [tasksToGenerate, setTasksToGenerate] = useState<number | undefined>(
    undefined
  );

  // Milestone Modal State
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadPlan(id);
    }
  }, [id]);

  const loadPlan = async (planId: string, background = false) => {
    try {
      if (!background) setLoading(true);
      setError(null);
      const planData = await db.getPlan(planId);

      if (!planData) {
        setError("Plan not found");
        return;
      }

      setPlan(planData);
      setPlanTitle(planData.title);
      setPlanDescription(planData.description || "");
    } catch (err) {
      console.error("Failed to load plan:", err);
      setError("Failed to load plan details");
    } finally {
      if (!background) setLoading(false);
    }
  };

  const handleSavePlan = async () => {
    if (!plan || !id) return;

    try {
      const updatedPlan = await db.updatePlan(id, {
        title: planTitle,
        description: planDescription,
      });
      setPlan(updatedPlan);
      setEditingPlan(false);
    } catch (err) {
      console.error("Failed to update plan:", err);
      setError("Failed to update plan");
    }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await db.updateTask(taskId, { status: newStatus });
      // Reload plan to get updated data
      if (id) {
        await loadPlan(id, true);
      }
    } catch (err) {
      console.error("Failed to update task status:", err);
      setError("Failed to update task status");
    }
  };

  const loadAISuggestions = async () => {
    if (!plan) return;

    setLoadingSuggestions(true);
    setSuggestionsError(null);

    try {
      // Check if AI is available
      if (!aiService.isInitialized()) {
        const settings = await db.getSettings();
        if (!settings.openaiApiKey) {
          setSuggestionsError(
            "AI features require OpenAI API key. Please configure in Settings."
          );
          return;
        }
        await aiService.initialize(settings.openaiApiKey);
      }

      const completedTasks =
        plan.tasks
          ?.filter((task) => task.status === "COMPLETED")
          .map((task) => task.title) || [];
      const remainingTasks =
        plan.tasks
          ?.filter((task) => task.status !== "COMPLETED")
          .map((task) => task.title) || [];

      const suggestions = await aiService.suggestNextSteps(
        plan.title,
        completedTasks,
        remainingTasks
      );

      setAiSuggestions(suggestions);
      setShowSuggestions(true);
    } catch (err) {
      console.error("Failed to load AI suggestions:", err);
      setSuggestionsError(
        err instanceof Error ? err.message : "Failed to generate suggestions"
      );
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleCreateTask = () => {
    setSelectedTask(undefined);
    setShowTaskModal(true);
  };

  const handleMilestoneCreated = () => {
    if (id) {
      loadPlan(id, true);
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this milestone? All tasks within it will also be deleted."
      )
    ) {
      return;
    }

    try {
      await db.deleteMilestone(milestoneId);
      if (id) {
        loadPlan(id, true);
      }
    } catch (err) {
      console.error("Failed to delete milestone:", err);
      setError("Failed to delete milestone");
    }
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const handleTaskCreated = (newTask: Task) => {
    if (plan) {
      setPlan({
        ...plan,
        tasks: [...(plan.tasks || []), newTask],
      });
    }
    if (id) loadPlan(id);
  };

  const handleTaskUpdated = (updatedTask: Task) => {
    if (plan && plan.tasks) {
      setPlan({
        ...plan,
        tasks: plan.tasks.map((t) =>
          t.id === updatedTask.id ? updatedTask : t
        ),
      });
    }
  };

  const handleTaskDeleted = (taskId: string) => {
    if (plan && plan.tasks) {
      setPlan({
        ...plan,
        tasks: plan.tasks.filter((t) => t.id !== taskId),
      });
    }
  };

  const handleGenerateTasks = async () => {
    if (!plan) return;

    // Close settings if open
    setShowGenerateSettings(false);

    setIsGeneratingTasks(true);
    try {
      if (!aiService.isInitialized()) {
        const settings = await db.getSettings();
        if (!settings.openaiApiKey) {
          alert(
            "Please configure OpenAI API Key in Settings to use AI features."
          );
          return;
        }
        await aiService.initialize(settings.openaiApiKey);
      }

      const existingTaskTitles = plan.tasks?.map((t) => t.title) || [];
      const existingMilestoneTitles =
        plan.milestones?.map((m) => m.title) || [];

      const generatedTasks = await aiService.generateTasks(
        plan.title,
        plan.goal,
        existingTaskTitles,
        existingMilestoneTitles,
        tasksToGenerate
      );

      // Keep track of milestones locally to handle newly created ones in the same batch
      const currentMilestones = [...(plan.milestones || [])];

      // Create tasks in DB
      for (const task of generatedTasks) {
        let milestoneId: string | undefined = undefined;

        if (task.milestoneName) {
          const existing = currentMilestones.find(
            (m) => m.title.toLowerCase() === task.milestoneName!.toLowerCase()
          );

          if (existing) {
            milestoneId = existing.id;
          } else {
            // Create new milestone
            const newMilestone = await db.createMilestone({
              title: task.milestoneName,
              planId: plan.id,
              order: currentMilestones.length + 1,
            });
            milestoneId = newMilestone.id;
            currentMilestones.push(newMilestone);
          }
        }

        await db.createTask({
          planId: plan.id,
          title: task.title,
          description: task.description,
          priority: task.priority,
          estimatedHours: task.estimatedHours,
          order: task.order,
          milestoneId: milestoneId,
        });
      }

      // Reload plan to show new tasks
      await loadPlan(plan.id, true);
    } catch (err) {
      console.error("Failed to generate tasks:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      alert(`Failed to generate tasks: ${errorMessage}`);
    } finally {
      setIsGeneratingTasks(false);
      // Reset count after generation
      setTasksToGenerate(undefined);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "IN_PROGRESS":
        return <PlayCircle className="h-4 w-4 text-blue-600" />;
      case "PAUSED":
        return <PauseCircle className="h-4 w-4 text-yellow-600" />;
      case "TODO":
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "text-green-600 bg-green-100";
      case "IN_PROGRESS":
        return "text-blue-600 bg-blue-100";
      case "PAUSED":
        return "text-yellow-600 bg-yellow-100";
      case "TODO":
        return "text-gray-600 bg-gray-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "text-red-600 bg-red-100";
      case "MEDIUM":
        return "text-yellow-600 bg-yellow-100";
      case "LOW":
        return "text-green-600 bg-green-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  // Calculate dynamic plan status based on task completion
  const calculateDynamicPlanStatus = (): string => {
    if (!plan) return "ACTIVE";

    // If plan is manually set to CANCELLED or PAUSED, keep that status
    if (plan.status === "CANCELLED" || plan.status === "PAUSED") {
      return plan.status;
    }

    // If no tasks, use the original status
    if (!plan.tasks || plan.tasks.length === 0) {
      return plan.status;
    }

    // Check if all tasks are completed
    const completedTasks = plan.tasks.filter(
      (task) => task.status === "COMPLETED"
    ).length;

    if (completedTasks === plan.tasks.length) {
      return "COMPLETED";
    } else if (completedTasks > 0) {
      return "ACTIVE";
    } else {
      return "ACTIVE";
    }
  };

  const calculateProgress = () => {
    // If no tasks, show 0%
    if (!plan?.tasks || plan.tasks.length === 0) return 0;

    const completedTasks = plan.tasks.filter(
      (task) => task.status === "COMPLETED"
    ).length;
    return Math.round((completedTasks / plan.tasks.length) * 100);
  };

  const groupTasksByMilestone = () => {
    if (!plan) return { withMilestone: [], withoutMilestone: [] };

    const withMilestone: { milestone: Milestone; tasks: Task[] }[] = [];
    const withoutMilestone: Task[] = [];

    // Group tasks by milestone
    plan.milestones?.forEach((milestone) => {
      const milestoneTasks =
        plan.tasks?.filter((task) => task.milestoneId === milestone.id) || [];
      withMilestone.push({ milestone, tasks: milestoneTasks });
    });

    // Tasks without milestone
    const tasksWithoutMilestone =
      plan.tasks?.filter((task) => !task.milestoneId) || [];
    withoutMilestone.push(...tasksWithoutMilestone);

    return { withMilestone, withoutMilestone };
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {error || "Plan not found"}
          </h2>
          <button
            onClick={() => navigate("/")}
            className="text-primary hover:text-primary/80"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { withMilestone, withoutMilestone } = groupTasksByMilestone();

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate("/")}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Plan Details</h1>
            <p className="text-muted-foreground">
              Manage your plan, milestones, and tasks
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Link
            to={`/tasks?plan=${plan.id}`}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Task Board
          </Link>
          <Tooltip text="Edit Plan Details">
            <button
              onClick={() => setEditingPlan(!editingPlan)}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <Edit className="h-5 w-5" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Plan Overview */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            {editingPlan ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Plan Title
                  </label>
                  <input
                    type="text"
                    value={planTitle}
                    onChange={(e) => setPlanTitle(e.target.value)}
                    className="w-full p-3 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Description
                  </label>
                  <textarea
                    value={planDescription}
                    onChange={(e) => setPlanDescription(e.target.value)}
                    rows={3}
                    className="w-full p-3 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleSavePlan}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingPlan(false)}
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center space-x-3 mb-3">
                  <h2 className="text-xl font-semibold text-foreground">
                    {plan.title}
                  </h2>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      calculateDynamicPlanStatus()
                    )}`}
                  >
                    {calculateDynamicPlanStatus()}
                  </span>
                </div>
                <p className="text-muted-foreground mb-4">{plan.description}</p>
                <div className="flex items-center space-x-2 text-sm text-foreground">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="font-medium">Goal:</span>
                  <span>{plan.goal}</span>
                </div>
                {plan.timeframe && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-2">
                    <Clock className="h-4 w-4" />
                    <span>Timeframe: {plan.timeframe}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Progress Stats */}
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground">
                {calculateProgress()}%
              </div>
              <div className="text-sm text-muted-foreground">Complete</div>
            </div>
            <div className="w-full bg-secondary rounded-full h-3">
              <div
                className="bg-primary h-3 rounded-full transition-all duration-300"
                style={{ width: `${calculateProgress()}%` }}
              />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tasks:</span>
                <span className="text-foreground">
                  {plan.tasks?.filter((t) => t.status === "COMPLETED").length ||
                    0}{" "}
                  / {plan.tasks?.length || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Milestones:</span>
                <span className="text-foreground">
                  {plan.milestones?.filter((m) => m.status === "COMPLETED")
                    .length || 0}{" "}
                  / {plan.milestones?.length || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Milestones and Tasks */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Tasks by Milestone */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">
              Tasks by Milestone
            </h3>
            <div className="flex items-center space-x-2 relative">
              {showGenerateSettings && (
                <div className="absolute top-12 right-0 bg-popover text-popover-foreground rounded-lg shadow-lg border border-border p-4 w-64 z-50">
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Generate Tasks</h4>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">
                        Number of tasks (Auto if empty)
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Auto"
                        value={tasksToGenerate || ""}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (isNaN(val)) {
                            setTasksToGenerate(undefined);
                          } else if (val > 0) {
                            setTasksToGenerate(val);
                          }
                        }}
                        className="w-full p-2 text-sm border border-border rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      {tasksToGenerate && tasksToGenerate > 10 && (
                        <div className="flex items-start space-x-2 text-yellow-600 dark:text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded text-xs">
                          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span>
                            Generating many tasks may take longer and consume
                            more tokens.
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end space-x-2 pt-2">
                      <button
                        onClick={() => setShowGenerateSettings(false)}
                        className="px-3 py-1 text-xs hover:bg-accent rounded"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleGenerateTasks}
                        disabled={isGeneratingTasks}
                        className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
                      >
                        Generate
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <Tooltip text="Generate Tasks with AI">
                <button
                  onClick={() => setShowGenerateSettings(!showGenerateSettings)}
                  disabled={isGeneratingTasks}
                  className="p-2 hover:bg-accent rounded-lg transition-colors text-primary"
                >
                  {isGeneratingTasks ? (
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="h-5 w-5" />
                  )}
                </button>
              </Tooltip>
              <Tooltip text="Add Task">
                <button
                  onClick={handleCreateTask}
                  className="p-2 hover:bg-accent rounded-lg transition-colors"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </Tooltip>
              <Tooltip text="Add Milestone">
                <button
                  onClick={() => setShowMilestoneModal(true)}
                  className="p-2 hover:bg-accent rounded-lg transition-colors"
                >
                  <Target className="h-5 w-5" />
                </button>
              </Tooltip>
            </div>
          </div>

          {withMilestone.map(({ milestone, tasks }) => (
            <div
              key={milestone.id}
              className="bg-card p-4 rounded-lg border border-border"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(milestone.status)}
                  <h4 className="font-medium text-foreground">
                    {milestone.title}
                  </h4>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      milestone.status
                    )}`}
                  >
                    {milestone.status}
                  </span>
                  <Tooltip text="Delete Milestone">
                    <button
                      onClick={() => handleDeleteMilestone(milestone.id)}
                      className="p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </Tooltip>
                </div>
              </div>

              {milestone.description && (
                <p className="text-sm text-muted-foreground mb-3">
                  {milestone.description}
                </p>
              )}

              {milestone.targetDate && (
                <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-3">
                  <Calendar className="h-3 w-3" />
                  <span>
                    Due: {new Date(milestone.targetDate).toLocaleDateString()}
                  </span>
                </div>
              )}

              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-2 bg-background rounded border"
                  >
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          const newStatus =
                            task.status === "COMPLETED" ? "TODO" : "COMPLETED";
                          handleTaskStatusChange(task.id, newStatus);
                        }}
                      >
                        {getStatusIcon(task.status)}
                      </button>
                      <span
                        className={`text-sm ${
                          task.status === "COMPLETED"
                            ? "line-through text-muted-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {task.priority && (
                        <span
                          className={`px-1 py-0.5 rounded text-xs ${getPriorityColor(
                            task.priority
                          )}`}
                        >
                          {task.priority}
                        </span>
                      )}
                      <Tooltip text="Edit Task" position="left">
                        <button
                          onClick={() => handleEditTask(task)}
                          className="p-1 hover:bg-accent rounded"
                        >
                          <MoreHorizontal className="h-3 w-3" />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Tasks without milestone */}
          {withoutMilestone.length > 0 && (
            <div className="bg-card p-4 rounded-lg border border-border">
              <h4 className="font-medium text-foreground mb-3">Other Tasks</h4>
              <div className="space-y-2">
                {withoutMilestone.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-2 bg-background rounded border"
                  >
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          const newStatus =
                            task.status === "COMPLETED" ? "TODO" : "COMPLETED";
                          handleTaskStatusChange(task.id, newStatus);
                        }}
                      >
                        {getStatusIcon(task.status)}
                      </button>
                      <span
                        className={`text-sm ${
                          task.status === "COMPLETED"
                            ? "line-through text-muted-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {task.priority && (
                        <span
                          className={`px-1 py-0.5 rounded text-xs ${getPriorityColor(
                            task.priority
                          )}`}
                        >
                          {task.priority}
                        </span>
                      )}
                      <button
                        onClick={() => handleEditTask(task)}
                        className="p-1 hover:bg-accent rounded"
                      >
                        <MoreHorizontal className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Resources */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Resources</h3>
            <Tooltip text="Add Resource">
              <button className="p-2 hover:bg-accent rounded-lg transition-colors">
                <Plus className="h-4 w-4" />
              </button>
            </Tooltip>
          </div>

          {plan.resources && plan.resources.length > 0 ? (
            <div className="space-y-3">
              {plan.resources.map((resource) => (
                <div
                  key={resource.id}
                  className="bg-card p-4 rounded-lg border border-border"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">
                        {resource.title}
                      </h4>
                      {resource.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {resource.description}
                        </p>
                      )}
                      <span className="inline-block mt-2 px-2 py-1 rounded-full text-xs bg-secondary text-secondary-foreground">
                        {resource.type}
                      </span>
                    </div>
                    {resource.url && (
                      <Tooltip text="Open Link" position="left">
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-accent rounded-lg transition-colors inline-block"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Tooltip>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-card rounded-lg border border-border">
              <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No resources added yet</p>
              <button className="text-primary hover:text-primary/80 text-sm mt-2">
                Add your first resource
              </button>
            </div>
          )}
        </div>
      </div>

      {/* AI Suggestions */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Sparkles className="h-6 w-6 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">
              AI Suggestions
            </h3>
          </div>
          <button
            onClick={loadAISuggestions}
            disabled={loadingSuggestions}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {loadingSuggestions ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Lightbulb className="h-4 w-4" />
                <span>Get AI Suggestions</span>
              </>
            )}
          </button>
        </div>

        {suggestionsError && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg mb-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{suggestionsError}</span>
            </div>
            {suggestionsError.includes("API key") && (
              <Link
                to="/settings"
                className="text-primary hover:text-primary/80 underline text-sm mt-2 inline-block"
              >
                Configure API Key in Settings →
              </Link>
            )}
          </div>
        )}

        {showSuggestions && aiSuggestions.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground mb-3">
              Based on your current progress, here are some AI-powered
              recommendations:
            </div>
            {aiSuggestions.map((suggestion, index) => (
              <div
                key={index}
                className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
              >
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      {suggestion}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            <div className="text-xs text-muted-foreground mt-4 flex items-center space-x-1">
              <Sparkles className="h-3 w-3" />
              <span>Suggestions powered by AI based on your plan progress</span>
            </div>
          </div>
        )}

        {showSuggestions &&
          aiSuggestions.length === 0 &&
          !loadingSuggestions &&
          !suggestionsError && (
            <div className="text-center py-8">
              <Lightbulb className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">
                No suggestions available at this time
              </p>
              <p className="text-sm text-muted-foreground">
                Try again after completing more tasks
              </p>
            </div>
          )}

        {!showSuggestions && !loadingSuggestions && !suggestionsError && (
          <div className="text-center py-8">
            <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">
              Get personalized recommendations for your plan
            </p>
            <p className="text-sm text-muted-foreground">
              AI will analyze your progress and suggest next steps
            </p>
          </div>
        )}
      </div>

      {/* Task Modal */}
      <TaskDetailModal
        task={selectedTask}
        planId={plan.id}
        milestones={plan.milestones || []}
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onUpdate={handleTaskUpdated}
        onCreate={handleTaskCreated}
        onDelete={handleTaskDeleted}
      />

      {/* Milestone Modal */}
      <CreateMilestoneModal
        planId={plan.id}
        isOpen={showMilestoneModal}
        onClose={() => setShowMilestoneModal(false)}
        onCreate={handleMilestoneCreated}
        nextOrder={(plan.milestones?.length || 0) + 1}
      />
    </div>
  );
};

export default PlanDetail;
