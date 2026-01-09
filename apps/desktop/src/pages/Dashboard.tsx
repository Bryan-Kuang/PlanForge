import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Target, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { db, type Plan, type DashboardStats } from "../lib/database-api";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [plansData, statsData] = await Promise.all([
        db.getPlans(),
        db.getDashboardStats(),
      ]);

      setPlans(plansData);
      setStats(statsData);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Calculate dynamic plan status based on task completion
  const calculateDynamicPlanStatus = (plan: Plan): string => {
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

  const calculatePlanProgress = (plan: Plan) => {
    // If no tasks, show 0%
    if (!plan.tasks || plan.tasks.length === 0) return 0;

    const completedTasks = plan.tasks.filter(
      (task) => task.status === "COMPLETED"
    ).length;
    return Math.round((completedTasks / plan.tasks.length) * 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "text-blue-600 bg-blue-100";
      case "COMPLETED":
        return "text-green-600 bg-green-100";
      case "PAUSED":
        return "text-yellow-600 bg-yellow-100";
      case "CANCELLED":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between theme-transition-top">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Track your goals and manage your plans
          </p>
        </div>
        <Link
          to="/new-plan"
          className="inline-flex items-center space-x-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Plan</span>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 theme-transition-middle">
        <div className="bg-card p-6 rounded-lg border border-border">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Plans</p>
              <p className="text-2xl font-bold text-foreground">
                {stats?.activePlans || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border border-border">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed Tasks</p>
              <p className="text-2xl font-bold text-foreground">
                {stats?.completedTasks || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border border-border">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Tasks</p>
              <p className="text-2xl font-bold text-foreground">
                {stats ? stats.totalTasks - stats.completedTasks : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Loading and Error States */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading dashboard...</p>
        </div>
      )}

      {error && (
        <div className="text-center py-12 bg-card rounded-lg border border-border">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-600">{error}</p>
          </div>
          <button
            onClick={loadDashboardData}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Plans List */}
      {!loading && !error && (
        <div className="space-y-4 theme-transition-bottom">
          <h2 className="text-xl font-semibold text-foreground">Your Plans</h2>

          {plans.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg border border-border">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No plans yet
              </h3>
              <p className="text-muted-foreground mb-4">
                Create your first plan to get started with AI-powered goal
                planning
              </p>
              <Link
                to="/new-plan"
                className="inline-flex items-center space-x-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Create Your First Plan</span>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {plans.map((plan) => {
                const dynamicStatus = calculateDynamicPlanStatus(plan);
                const progress = calculatePlanProgress(plan);

                return (
                  <div
                    key={plan.id}
                    className="bg-card p-6 rounded-lg border border-border hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => navigate(`/plan/${plan.id}`)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-foreground">
                            {plan.title}
                          </h3>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              dynamicStatus
                            )}`}
                          >
                            {dynamicStatus}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-sm mb-2">
                          {plan.description}
                        </p>
                        <p className="text-sm text-foreground font-medium">
                          Goal: {plan.goal}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-foreground">
                          {progress}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          complete
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-muted-foreground mb-1">
                        <span>Progress</span>
                        <span>
                          {plan.tasks?.filter(
                            (task) => task.status === "COMPLETED"
                          ).length || 0}{" "}
                          of {plan.tasks?.length || 0} tasks
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        Created {new Date(plan.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
