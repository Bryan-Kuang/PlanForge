import React, { useState } from "react";
import { X, Save, AlertCircle } from "lucide-react";
import { db, type Milestone } from "../lib/database-api";

interface CreateMilestoneModalProps {
  planId: string;
  isOpen: boolean;
  onClose: () => void;
  onCreate: (milestone: Milestone) => void;
  nextOrder: number;
}

const CreateMilestoneModal: React.FC<CreateMilestoneModalProps> = ({
  planId,
  isOpen,
  onClose,
  onCreate,
  nextOrder,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const newMilestone = await db.createMilestone({
        title: title.trim(),
        description: description.trim(),
        planId,
        order: nextOrder,
      });
      onCreate(newMilestone);
      handleClose();
    } catch (err) {
      console.error("Failed to create milestone:", err);
      setError("Failed to create milestone. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">
            Create New Milestone
          </h2>
          <button
            onClick={handleClose}
            className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-600">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g., Phase 1: Research"
              required
            />
          </div>

          <div className="mb-6">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-24 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Optional description..."
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
            >
              <Save size={16} />
              {isSubmitting ? "Creating..." : "Create Milestone"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateMilestoneModal;
