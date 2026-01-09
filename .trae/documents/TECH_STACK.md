# PlanForge: Under the Hood (Simplified)

This document explains the "engine" that powers PlanForge. Think of building an app like building a house—you need a foundation, a frame, plumbing, electricity, and interior design. Here are the tools we used to build ours.

---

## 1. The Foundation: Electron
**Role:** The Chassis
**Analogy:** If PlanForge were a car, Electron is the body and wheels.

Electron allows us to build a desktop application (that you can install on Mac, Windows, or Linux) using the same technologies used to build websites. It means we don't have to write three different apps for three different computers. It wraps our "website" in a dedicated window so it feels like a real, native program.

## 2. The Interior Design: React & Tailwind CSS
**Role:** The User Interface (UI)
**Analogy:** The paint, furniture, and layout of the rooms.

*   **React:** This is the tool that handles the "interactive" parts. When you click a button and a new menu slides out, or you drag a task and it snaps into a new column, React is doing that work. It ensures the screen updates instantly without needing to reload.
*   **Tailwind CSS:** This is our "style guide." Instead of hand-painting every button, Tailwind gives us a pre-mixed palette of professional colors, spacing, and fonts. It ensures the app looks consistent and beautiful (no mismatched margins or clashing colors).

## 3. The Plumbing: Prisma & SQLite
**Role:** Data Storage
**Analogy:** The filing cabinet where you keep your important documents.

*   **SQLite:** This is a tiny, self-contained database that lives *inside* the app on your computer. It stores all your projects, tasks, and settings locally. This is why PlanForge works offline and is super fast—it doesn't need to call a server halfway across the world to remember your grocery list.
*   **Prisma:** Think of Prisma as the "translator." Our code speaks JavaScript, but the database speaks SQL. Prisma translates our request ("Give me all high-priority tasks") into the complex commands the database understands, ensuring we never accidentally ask for something that doesn't exist.

## 4. The Intelligence: OpenAI (GPT)
**Role:** The Smart Assistant
**Analogy:** A helpful consultant sitting at the desk next to you.

We use OpenAI to power the "AI" features. When you ask PlanForge to "Break down this project into steps," we send that request to OpenAI's super-smart brain. It thinks for a second and sends back a list of tasks, which we then automatically create for you. It's like having a project manager on speed dial.

## 5. The Security Guard: Keytar
**Role:** Password Protection
**Analogy:** A safe inside the house.

When you enter your API keys (passwords for the AI), we don't just write them on a sticky note. We use **Keytar** to lock them in your operating system's native secure vault (like "Keychain" on Mac or "Credential Manager" on Windows). This means even if someone stole your laptop files, they couldn't easily read your private keys.

## 6. The Construction Crew: Vite & Electron-Builder
**Role:** The Assembly Line
**Analogy:** The robots that assemble the car parts into a finished vehicle.

*   **Vite:** This is our "high-speed workbench." It lets us make changes to the code and see them update on the screen in milliseconds while we are building the app.
*   **Electron-Builder:** This is the "packaging machine." When we are done coding, it takes all our loose files, compresses them, optimizes them, and wraps them up into a neat `.dmg` or `.exe` file that you can double-click to install.
