# create-cursor-workspace

A CLI tool to quickly scaffold a new project workspace, especially designed for projects utilizing Git submodules and managed within a VS Code/Cursor multi-root workspace.

## Purpose

`create-cursor-workspace` streamlines the setup of complex projects by:

-   **Automating Workspace Scaffolding**: Creates a new project directory with a recommended structure.
-   **Simplifying Git Submodule Integration**:
    -   Prompts for Git submodule URLs.
    -   Checks for Git installation and URL accessibility.
    -   Generates necessary configuration files to manage submodule URLs via environment variables.
-   **Generating VS Code Workspace Configuration**: Creates a `.code-workspace` file that includes the main project and all specified submodules as distinct root folders. It also configures the main project folder to ignore submodule paths in its file tree for a cleaner view.
-   **Providing Helper Scripts**: Generates a `setup-submodules.sh` script to automate the process of adding, initializing, and updating Git submodules based on an `.env` file.
-   **Dynamic Configuration Files**:
    -   `.env.example`: A template for environment variables, including submodule URLs.
    -   `.env`: Stores the actual submodule URLs (populated by the CLI based on user input).
    -   `.gitmodules.template`: Used by `setup-submodules.sh` with environment variable placeholders for submodule URLs.

## Usage

To create a new workspace, run:

```bash
npx create-cursor-workspace
```
The CLI will then prompt you for the project name and guide you through configuring Git submodules if you choose to use them.

## Generated Project Structure

A project created with `create-cursor-workspace` (e.g., `my-new-project`) will typically have the following structure:

```
my-new-project/
├── .cursor/
│   └── rules/
│       └── (standard rules from bmadcode/cursor-custom-agents-rules-generator)
├── .env
├── .env.example
├── .gitmodules.template
├── .gitignore
├── my-new-project.code-workspace
├── README.md
├── setup-submodules.sh
├── (Other template files from src/templates/)
└── submodule-repo-1/   # Populated after running setup-submodules.sh
└── submodule-repo-2/   # Populated after running setup-submodules.sh
```

**Key Files:**

-   **`<project-name>.code-workspace`**: The VS Code workspace file. Open this file in VS Code/Cursor to work with your project and its submodules as a multi-root workspace.
-   **`.env`**: Contains the actual Git URLs for your submodules (e.g., `SGM_SUBMODULE_REPO_1_URL=git@github.com:user/repo1.git`). **This file should be added to your `.gitignore` if it contains sensitive URLs.**
-   **`.env.example`**: An example of the `.env` file. Copy this to `.env` and fill in your submodule URLs if you didn't configure them via the CLI, or if you need to adjust them.
-   **`.gitmodules.template`**: A template for the `.gitmodules` file. The `setup-submodules.sh` script uses this with `envsubst` (or similar logic, current version uses direct `git submodule add`) to create the actual `.gitmodules` file using URLs from `.env`.
-   **`setup-submodules.sh`**: An executable script to manage your Git submodules. It sources URLs from `.env`, adds the submodules to your Git configuration, and clones their content.
-   **`README.md`**: A basic README for the generated project, providing instructions on next steps.
-   **`.gitignore`**: A standard Git ignore file.
-   **`submodule-repo-N/`**: Directories for your Git submodules. These will be populated when you run `setup-submodules.sh`.
-   **`.cursor/rules/`**: Contains a set of pre-configured Cursor rules to enhance AI behavior and enforce project conventions. These rules are sourced from the [bmadcode/cursor-custom-agents-rules-generator](https://github.com/bmadcode/cursor-custom-agents-rules-generator/tree/main) repository.

## Integrated Cursor Rules from bmadcode

This project benefits greatly from the foundational work on Cursor rules provided by the [bmadcode/cursor-custom-agents-rules-generator](https://github.com/bmadcode/cursor-custom-agents-rules-generator/tree/main) repository.

The rules integrated into the generated workspace aim to provide a robust starting point for leveraging Cursor's AI capabilities effectively, covering aspects like:

- Code generation standards
- Commenting best practices
- Commit message formatting
- And more, as defined by the bmadcode repository.

We highly recommend exploring the [bmadcode/cursor-custom-agents-rules-generator](https://github.com/bmadcode/cursor-custom-agents-rules-generator/tree/main) repository for a deeper understanding of these rules, how to customize them, and how to generate your own.

## Workflow After Creation

1.  Navigate to your new project directory:
    ```bash
    cd <project-name>
    ```
2.  **Configure Submodule URLs**:
    The CLI will have already populated `.env` with the submodule URLs you provided. If you need to make changes or add new ones, edit the `.env` file. Ensure it reflects the correct URLs for your submodule repositories.
3.  **Run the Setup Script**:
    Make the setup script executable (if it isn't already) and run it:
    ```bash
    chmod +x setup-submodules.sh
    ./setup-submodules.sh
    ```
    This script will:
    - Read submodule configurations from `.env`.
    - Run `git submodule add` for each submodule.
    - Run `git submodule update --init --recursive` to clone the submodule content.
    - Attempt to checkout the `main` or `master` branch in each submodule.
4.  **Open in VS Code/Cursor**:
    Open the `<project-name>.code-workspace` file.
5.  **Commit Your Workspace**:
    After the script completes successfully and you've verified the setup:
    ```bash
    git add .
    git commit -m "Initial project setup with submodules"
    ```

## Development (for `create-cursor-workspace` itself)

To contribute or run this tool from a local clone:

1.  Clone the repository:
    ```bash
    git clone <your-repo-url-for-create-cursor-workspace>
    cd create-cursor-workspace
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Build the TypeScript code:
    ```bash
    npm run build
    ```
4.  Run locally:
    The `bin` field in `package.json` points to `dist/index.js`.
    You can use `npm link` to make the command available globally for testing:
    ```bash
    npm link
    # Now you can run:
    create-cursor-workspace my-test-project
    ```
    Alternatively, run the compiled code directly:
    ```bash
    node dist/index.js my-test-project
    ```
    Or use the `start` script (which builds and runs):
    ```bash
    npm start my-test-project
    ```

This provides a more comprehensive overview for users of `create-cursor-workspace`. 