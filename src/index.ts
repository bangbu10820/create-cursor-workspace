#!/usr/bin/env node

import prompts from "prompts";
import { resolve, basename, dirname, join as pathJoin } from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import { red, green, bold, cyan, yellow } from "picocolors";

// Helpers
import { validateNpmName } from "./helpers/validate-pkg";
import { isWriteable } from "./helpers/is-writeable";
import { isFolderEmpty } from "./helpers/is-folder-empty";
import { isGitInstalled } from "./helpers/is-git-installed";

// Core
import { createAppWorkspace, RepoType } from "./core/create-app";

// Handles prompt cancellation (e.g., Ctrl+C)
const onCancel = () => {
	console.log(cyan("Project creation cancelled."));
	process.exit(0);
};

async function main() {
	console.log("Initializing new Cursor workspace...");

	let projectNameFromPrompt: string | undefined;
	let repoTypeFromPrompt: RepoType | undefined;

	try {
		// 1. Get Project Name
		const nameResponse = await prompts(
			[
				{
					type: "text",
					name: "projectName",
					message: "What is your project named?",
					initial: "my-app",
					validate: (value: string) => {
						const trimmedValue = value.trim();
						if (trimmedValue.length === 0) {
							return "Project name cannot be empty.";
						}
						return true;
					},
				},
			],
			{
				onCancel,
			}
		);
		projectNameFromPrompt = nameResponse.projectName;

		if (typeof projectNameFromPrompt === "undefined") {
			// onCancel or Esc on first prompt
			console.log(
				cyan("Project creation aborted or no project name received.")
			);
			process.exit(0);
		}

		// 2. Get Repository Type
		const repoTypeResponse = await prompts(
			[
				{
					type: "select",
					name: "repoType",
					message: "Choose the type of repository for your workspace:",
					choices: [
						{
							title: "Git Submodule (recommended for multi-repo projects)",
							value: "submodule",
						},
						// { title: "Raw Folder (copy files directly)", value: "raw" }, // Commented out as per previous request
					],
					initial: 0,
				},
			],
			{
				onCancel,
			}
		);

		if (typeof repoTypeResponse.repoType === "undefined") {
			console.log(red("Repository type selection cancelled. Exiting."));
			process.exit(0);
		}
		const repoType = repoTypeResponse.repoType as RepoType;

		// Early exit if Git is required but not installed
		if (repoType === "submodule" && !isGitInstalled()) {
			console.error(
				red(
					"Git is required for 'Git Submodule' repository type, but it's not installed."
				)
			);
			console.error(
				yellow(
					"Please install Git and try again. https://git-scm.com/downloads"
				)
			);
			process.exit(1);
		}

		repoTypeFromPrompt = repoType;
	} catch (error) {
		console.error(red("An unexpected error occurred during prompting:"), error);
		process.exit(1);
	}

	// At this point, projectNameFromPrompt and repoTypeFromPrompt should be defined if not cancelled
	const projectNameInput = projectNameFromPrompt.trim();
	const projectPath = resolve(projectNameInput);
	const appName = basename(projectPath);
	const originalDirectory = process.cwd();

	// 1. Validate project name (more thoroughly)
	const validationResult = validateNpmName(appName);
	if (!validationResult.valid) {
		console.error(
			`Could not create a project called ${red(
				bold(`"${appName}"`)
			)} because of npm naming restrictions:`
		);
		validationResult.problems.forEach((p) =>
			console.error(`  ${red(bold("*"))} ${p}`)
		);
		process.exit(1);
	}

	// 2. Check if the target directory is writeable
	const projectParentDir = dirname(projectPath);
	if (!existsSync(projectParentDir)) {
		// Ensure parent directory exists before checking write-ability
		try {
			mkdirSync(projectParentDir, { recursive: true });
		} catch (e) {
			console.error(
				red(`Failed to create parent directory ${projectParentDir}:`),
				e
			);
			process.exit(1);
		}
	}

	if (!(await isWriteable(projectParentDir))) {
		console.error(
			red(
				"The application path is not writable, please check folder permissions and try again."
			)
		);
		console.error(
			red(
				"It is likely you do not have write permissions for this folder or its parent directory."
			)
		);
		process.exit(1);
	}

	// 3. Create project directory and check if it's empty
	// try {
	//   mkdirSync(projectPath, { recursive: true });
	// } catch (e) {
	//   console.error(red(`Failed to create project directory ${projectPath}:`), e);
	//   process.exit(1);
	// }

	// if (!isFolderEmpty(projectPath, appName)) {
	//   // isFolderEmpty will print details, so we just exit
	//   process.exit(1);
	// }

	// --- Create App Workspace ---
	await createAppWorkspace({
		appName,
		projectPath,
		repoType: repoTypeFromPrompt,
	});

	// --- Final Messages ---
	console.log(
		green(`
Success! Created ${bold(appName)} at ${cyan(projectPath)}`)
	);
	console.log(
		`Workspace type: ${cyan(
			repoTypeFromPrompt === "submodule" ? "Git Submodule" : "Raw Folder"
		)}`
	);
	console.log("Inside that directory, you can start working on your project.");
	console.log("We suggest that you begin by typing:");
	console.log();

	let cdpath: string;
	if (pathJoin(originalDirectory, appName) === projectPath) {
		cdpath = appName;
	} else {
		cdpath = projectPath;
	}

	console.log(cyan(`  cd ${cdpath}`));
	// Add other relevant commands for Cursor if any, e.g., how to open with Cursor
	console.log(cyan("  code .") + " (or open with your preferred editor)");
	console.log();
}

main().catch((e) => {
	console.error(red("An unexpected error occurred in the application:"), e);
	process.exit(1);
});
