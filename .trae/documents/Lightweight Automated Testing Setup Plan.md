### Lightweight Automated Testing Plan

**Goal:** prevent logic bugs (like the API key issue) and ensure app stability without manual testing.

**1. Tools & Setup (apps/desktop)**
*   **Engine:** **Vitest** (Fast, zero-config for Vite).
*   **Environment:** `jsdom` (Simulates browser), `@testing-library/react` (Tests UI components).
*   **Config:** Create `vitest.config.ts` and `test/setup.ts` to mock Electron features (`ipcRenderer`, `window.ai`, `keytar`).

**2. Key Test Scenarios (The "Must Haves")**
*   **Backend Logic (`ai-manager.test.ts`):**
    *   **Scenario:** Simulates "Service Not Initialized" but "Key Exists in Storage". Verifies that the system automatically detects the key, initializes, and proceeds successfully.
*   **Frontend Logic (`ai-service.test.ts`):**
    *   **Scenario:** Simulates running in a browser (no Electron). Verifies the app gracefully handles missing features instead of crashing with "undefined" errors.

**3. Execution**
*   Add `npm test` script.
*   Run tests to verify the current codebase passes.