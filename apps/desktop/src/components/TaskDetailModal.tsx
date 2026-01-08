import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  Clock,
  Flag,
  FileText,
  Save,
  Trash2,
  AlertCircle,
  CheckCircle,
  Pause,
  Play,
} from "lucide-react";
import { db, type Task, type Milestone } from "../lib/database-api";

interface TaskDetailModalProps {
  task?: Task;
  planId?: string;
  milestones: Milestone[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (updatedTask: Task) => void;
  onCreate?: (newTask: Task) => void;
  onDelete?: (taskId: string) => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  planId,
  milestones,
  isOpen,
  onClose,
  onUpdate,
  onCreate,
  onDelete,
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "TODO",
    priority: "MEDIUM",
    estimatedHours: 0,
    actualHours: 0,
    dueDate: "",
    milestoneId: "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const statusOptions = [
    { value: "TODO", label: "To Do", icon: FileText, color: "text-gray-600" },
    {
      value: "IN_PROGRESS",
      label: "In Progress",
      icon: Play,
      color: "text-blue-600",
    },
    { value: "PAUSED", label: "Paused", icon: Pause, color: "text-yellow-600" },
    {
      value: "COMPLETED",
      label: "Completed",
      icon: CheckCircle,
      color: "text-green-600",
    },
  ];

  const priorityOptions = [
    { value: "LOW", label: "Low", color: "bg-green-100 text-green-700" },
    {
      value: "MEDIUM",
      label: "Medium",
      color: "bg-yellow-100 text-yellow-700",
    },
    { value: "HIGH", label: "High", color: "bg-red-100 text-red-700" },
  ];

  useEffect(() => {
    if (isOpen) {
      if (task) {
        setFormData({
          title: task.title,
          description: task.description || "",
          status: task.status,
          priority: task.priority,
          estimatedHours: task.estimatedHours || 0,
          actualHours: task.actualHours || 0,
          dueDate: task.dueDate
            ? new Date(task.dueDate).toISOString().split("T")[0]
            : "",
          milestoneId: task.milestoneId || "",
        });
      } else {
        setFormData({
          title: "",
          description: "",
          status: "TODO",
          priority: "MEDIUM",
          estimatedHours: 0,
          actualHours: 0,
          dueDate: "",
          milestoneId: "",
        });
      }
      setError(null);
      setShowDeleteConfirm(false);
    }
  }, [task, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError("Task title is required");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (task) {
        const updatedTask = await db.updateTask(task.id, {
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          status: formData.status as Task["status"],
          priority: formData.priority as Task["priority"],
          estimatedHours: formData.estimatedHours || undefined,
          actualHours: formData.actualHours || undefined,
          dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
          milestoneId: formData.milestoneId || undefined,
        });

        if (onUpdate) onUpdate(updatedTask);
      } else if (planId) {
        const newTask = await db.createTask({
          planId,
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          priority: formData.priority as Task["priority"],
          estimatedHours: formData.estimatedHours || undefined,
          dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
          milestoneId: formData.milestoneId || undefined,
          order: 0, // Default order
        });

        if (onCreate) onCreate(newTask);
      }

      onClose();
    } catch (err) {
      console.error("Failed to save task:", err);
      setError("Failed to save task. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task || !onDelete) return;

    setIsDeleting(true);
    setError(null);

    try {
      await db.deleteTask(task.id);
      onDelete(task.id);
      onClose();
    } catch (err) {
      console.error("Failed to delete task:", err);
      setError("Failed to delete task. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const getStatusIcon = (status: string) => {
    const statusOption = statusOptions.find((opt) => opt.value === status);
    return statusOption ? statusOption.icon : FileText;
  };

  const getStatusColor = (status: string) => {
    const statusOption = statusOptions.find((opt) => opt.value === status);
    return statusOption ? statusOption.color : "text-gray-600";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              {React.createElement(getStatusIcon(formData.status), {
                className: `h-6 w-6 ${getStatusColor(formData.status)}`,
              })}
              <h2 className="text-2xl font-bold text-foreground">
                Task Details
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Task Title *
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                className="w-full p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter task title..."
                disabled={isSaving}
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                rows={3}
                className="w-full p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                placeholder="Describe what needs to be done..."
                disabled={isSaving}
              />
            </div>

            {/* Status and Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="status"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Status
                </label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => handleInputChange("status", e.target.value)}
                  className="w-full p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={isSaving}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="priority"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Priority
                </label>
                <select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) =>
                    handleInputChange("priority", e.target.value)
                  }
                  className="w-full p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={isSaving}
                >
                  {priorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Time Estimates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="estimatedHours"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  <Clock className="inline h-4 w-4 mr-1" />
                  Estimated Hours
                </label>
                <input
                  type="number"
                  id="estimatedHours"
                  value={formData.estimatedHours}
                  onChange={(e) =>
                    handleInputChange(
                      "estimatedHours",
                      parseInt(e.target.value) || 0
                    )
                  }
                  min="0"
                  step="0.5"
                  className="w-full p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={isSaving}
                />
              </div>

              <div>
                <label
                  htmlFor="actualHours"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  <Clock className="inline h-4 w-4 mr-1" />
                  Actual Hours
                </label>
                <input
                  type="number"
                  id="actualHours"
                  value={formData.actualHours}
                  onChange={(e) =>
                    handleInputChange(
                      "actualHours",
                      parseInt(e.target.value) || 0
                    )
                  }
                  min="0"
                  step="0.5"
                  className="w-full p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={isSaving}
                />
              </div>
            </div>

            {/* Due Date and Milestone */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="dueDate"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Due Date
                </label>
                <input
                  type="date"
                  id="dueDate"
                  value={formData.dueDate}
                  onChange={(e) => handleInputChange("dueDate", e.target.value)}
                  className="w-full p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={isSaving}
                />
              </div>

              <div>
                <label
                  htmlFor="milestoneId"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  <Flag className="inline h-4 w-4 mr-1" />
                  Milestone
                </label>
                <select
                  id="milestoneId"
                  value={formData.milestoneId}
                  onChange={(e) =>
                    handleInputChange("milestoneId", e.target.value)
                  }
                  className="w-full p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={isSaving}
                >
                  <option value="">No milestone</option>
                  {milestones.map((milestone) => (
                    <option key={milestone.id} value={milestone.id}>
                      {milestone.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center space-x-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-destructive">{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="flex items-center space-x-3">
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex items-center space-x-2"
                    disabled={isSaving || isDeleting}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 disabled:opacity-50 transition-colors flex items-center space-x-2"
                    >
                      {isDeleting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-destructive-foreground border-t-transparent rounded-full animate-spin" />
                          <span>Deleting...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          <span>Confirm Delete</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                      disabled={isDeleting}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 border border-border rounded-lg text-foreground hover:bg-accent transition-colors"
                  disabled={isSaving || isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isDeleting || !formData.title.trim()}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailModal;
