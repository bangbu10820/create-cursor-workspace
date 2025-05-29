import { join, resolve, basename } from "node:path";
import { green, cyan, red, yellow, bold } from "picocolors";
import prompts from "prompts";
import { mkdirSync, existsSync } from "node:fs";
import { readFile, writeFile, unlink, chmod, rename } from "node:fs/promises";
import { copy } from "../helpers/copy";
import { isGitInstalled } from "../helpers/is-git-installed";
import { checkGitUrlAccess } from "../helpers/check-git-url-access";
import { tryGitInit } from "../helpers/git";
import { isFolderEmpty } from "../helpers/is-folder-empty";

export type RepoType = "submodule" | "raw";

export interface SubmoduleInfo {
	url: string;
	path: string;
}

interface CreateAppWorkspaceParams {
	appName: string;
	projectPath: string;
	repoType: RepoType;
}

const onSubmodulePromptCancel = () => {
	throw new Error("submodule_prompt_cancelled");
};

// Helper to generate environment variable keys for submodules
const submodulePathToEnvKey = (
	submoduleName: string,
	prefix: string = "SGM"
): string => {
	const sanitizedName = submoduleName
		.replace(/[^a-zA-Z0-9_]/g, "_")
		.toUpperCase();
	return `${prefix}_${sanitizedName}_URL`;
};

export async function createAppWorkspace({
	appName,
	projectPath,
	repoType,
}: CreateAppWorkspaceParams): Promise<void> {
	const submodulesToGuide: SubmoduleInfo[] = [];
	let gitInitializedLate = false;
	const originalDirectory = process.cwd();
	const gitIsActuallyInstalled = isGitInstalled();

	if (repoType === "submodule") {
		if (!gitIsActuallyInstalled) {
			console.warn(
				yellow(
					`Git is not installed. Submodule URL checks will be skipped, and Git features disabled.`
				)
			);
		} else {
			console.log(cyan("Configuring Git submodules..."));

			let addingSubmodules = true;
			let isFirstSubmodule = true;

			while (addingSubmodules) {
				let submoduleUrl = "";
				let accessGranted = false;

				try {
					const urlPromptMessage = isFirstSubmodule
						? "Enter the Git submodule URL:"
						: "Enter the next Git submodule URL (or leave blank to finish):";

					const urlResponse = await prompts(
						[
							{
								type: "text",
								name: "url",
								message: urlPromptMessage,
								validate: (value: string) => {
									const trimmed = value.trim();
									if (isFirstSubmodule && trimmed.length === 0)
										return "At least one submodule URL is required.";
									if (
										trimmed.length > 0 &&
										!(
											trimmed.startsWith("https://") ||
											trimmed.startsWith("git@")
										)
									) {
										return "Please enter a valid Git URL (https:// or git@) or leave blank if not the first submodule.";
									}
									return true;
								},
							},
						],
						{ onCancel: onSubmodulePromptCancel }
					);

					if (typeof urlResponse.url === "undefined") {
						addingSubmodules = false;
						break;
					}
					submoduleUrl = urlResponse.url.trim();

					if (!submoduleUrl) {
						if (isFirstSubmodule) {
							console.error(
								red(
									"First submodule URL cannot be empty. Finishing submodule setup."
								)
							);
							addingSubmodules = false;
							break;
						}
						addingSubmodules = false;
						break;
					}

					if (gitIsActuallyInstalled) {
						console.log(cyan(`Checking Git URL access: ${submoduleUrl}...`));
						accessGranted = await checkGitUrlAccess(submoduleUrl);
					} else {
						console.log(
							yellow(
								`Git not installed, skipping access check for ${submoduleUrl}. Assuming it's valid.`
							)
						);
						accessGranted = true;
					}

					if (!accessGranted) {
						console.error(
							red(`Error: Unable to access Git URL: ${submoduleUrl}`)
						);
						console.warn(
							yellow(
								"Please check the URL and your network connection/permissions."
							)
						);

						const retryActionResponse = await prompts(
							[
								{
									type: "select",
									name: "action",
									message: "What would you like to do?",
									choices: [
										{
											title: "Try a different URL for this submodule",
											value: "retry",
										},
										{
											title: "Skip this submodule and continue (if not first)",
											value: "skip",
											disabled: isFirstSubmodule,
										},
										{ title: "Finish adding submodules", value: "finish" },
									],
									initial: 0,
								},
							],
							{ onCancel: onSubmodulePromptCancel }
						);

						if (typeof retryActionResponse.action === "undefined") {
							addingSubmodules = false;
							break;
						}

						if (retryActionResponse.action === "retry") continue;
						if (retryActionResponse.action === "skip" && !isFirstSubmodule) {
							// continue to the next potential submodule or finish if user wants
						} else if (retryActionResponse.action === "finish") {
							addingSubmodules = false;
							break;
						} else if (
							isFirstSubmodule &&
							retryActionResponse.action === "skip"
						) {
							console.log(
								cyan(
									"Cannot skip the first submodule if its URL is inaccessible. Finishing submodule setup."
								)
							);
							addingSubmodules = false;
							break;
						}
						if (isFirstSubmodule && retryActionResponse.action !== "retry") {
							addingSubmodules = false;
							break;
						}
					} else {
						const repoName = submoduleUrl
							.substring(submoduleUrl.lastIndexOf("/") + 1)
							.replace(".git", "");
						const submodulePath = repoName;

						submodulesToGuide.push({
							url: submoduleUrl,
							path: submodulePath,
						});
						console.log(
							green(
								`Submodule ${bold(submoduleUrl)} (to be added at ${cyan(
									submodulePath
								)}) is registered.`
							)
						);
						isFirstSubmodule = false;
					}

					if (addingSubmodules) {
						const addMoreResponse = await prompts(
							[
								{
									type: "select",
									name: "addMore",
									message: "Would you like to add another submodule?",
									choices: [
										{ title: "Yes", value: true },
										{ title: "No", value: false },
									],
									initial: 1,
								},
							],
							{ onCancel: onSubmodulePromptCancel }
						);

						if (
							typeof addMoreResponse.addMore === "undefined" ||
							!addMoreResponse.addMore
						) {
							addingSubmodules = false;
						}
					}
				} catch (e: any) {
					if (e.message === "submodule_prompt_cancelled") {
						console.log(cyan("Submodule addition cancelled by user."));
					} else {
						console.error(
							red("An unexpected error occurred during submodule input:"),
							e
						);
					}
					addingSubmodules = false;
					break;
				}
			}
		}
	}

	console.log(
		cyan(`
Creating project directory at ${green(projectPath)}...`)
	);
	try {
		mkdirSync(projectPath, { recursive: true });
		console.log(
			green(`Successfully created project directory: ${projectPath}`)
		);
	} catch (mkdirError) {
		console.error(
			red(`Failed to create project directory ${projectPath}:`),
			mkdirError
		);
		process.exit(1);
	}

	if (!isFolderEmpty(projectPath, appName)) {
		process.exit(1);
	}

	try {
		process.chdir(projectPath);
		console.log(
			green(`Successfully changed working directory to: ${projectPath}`)
		);

		console.log(
			cyan(`
Copying template files to project root ${green(process.cwd())}...`)
		);
		const templateSourceDir = resolve(__dirname, "../../src/templates");
		try {
			await copy("**", ".", {
				cwd: templateSourceDir,
				parents: true,
			});
			console.log(green("Template files copied successfully."));
		} catch (copyError) {
			console.error(
				red(
					`Failed to copy template files from ${templateSourceDir} to ${process.cwd()}:`
				),
				copyError
			);
			throw copyError;
		}

		// Rename gitignore.template to .gitignore
		const gitignoreTemplatePath = join(process.cwd(), "gitignore.template");
		const gitignorePath = join(process.cwd(), ".gitignore");
		try {
			if (existsSync(gitignoreTemplatePath)) {
				await rename(gitignoreTemplatePath, gitignorePath);
				console.log(cyan("Renamed gitignore.template to .gitignore"));
			}
		} catch (err) {
			console.warn(yellow("Could not rename gitignore.template:"), err);
		}

		// --- Step 5: Process .code-workspace template ---
		const sourceWorkspaceTemplateName = "templates.code-workspace";
		const sourceWorkspaceTemplatePath = resolve(
			process.cwd(),
			sourceWorkspaceTemplateName
		);
		const finalWorkspaceFileName = `${appName}.code-workspace`;
		const finalWorkspaceFilePath = resolve(
			process.cwd(),
			finalWorkspaceFileName
		);

		if (existsSync(sourceWorkspaceTemplatePath)) {
			console.log(
				cyan(
					`Processing workspace file template: ${sourceWorkspaceTemplateName}...`
				)
			);
			try {
				let workspaceContent = await readFile(
					sourceWorkspaceTemplatePath,
					"utf-8"
				);
				workspaceContent = workspaceContent.replace(/<project-name>/g, appName);

				const workspaceJson = JSON.parse(workspaceContent);

				// Ensure folders array and first entry (main project)
				if (!workspaceJson.folders) workspaceJson.folders = [];
				if (workspaceJson.folders.length === 0) {
					workspaceJson.folders.push({ name: appName, path: ".", ignore: [] });
				} else {
					workspaceJson.folders[0].name = appName;
					workspaceJson.folders[0].path = "."; // Ensure path is "."
					// Ensure ignore array exists, keep it if template has it, else init empty
					if (
						!workspaceJson.folders[0].ignore ||
						!Array.isArray(workspaceJson.folders[0].ignore)
					) {
						workspaceJson.folders[0].ignore = [];
					}
				}

				// Add submodules to folders array AND to the main project's ignore list
				submodulesToGuide.forEach((sm) => {
					workspaceJson.folders.push({
						name: sm.path, // sm.path is the derived repo name
						path: `./${sm.path}`,
					});
					// Add submodule path to the ignore list of the main project folder
					// Ensure no duplicates and path ends with a slash
					const ignorePath = `${sm.path}/`;
					if (!workspaceJson.folders[0].ignore.includes(ignorePath)) {
						workspaceJson.folders[0].ignore.push(ignorePath);
					}
				});

				await writeFile(
					finalWorkspaceFilePath,
					JSON.stringify(workspaceJson, null, "\t")
				);
				console.log(green(`Workspace file created: ${finalWorkspaceFileName}`));

				await unlink(sourceWorkspaceTemplatePath); // Delete the original template
				console.log(
					cyan(`Removed workspace template: ${sourceWorkspaceTemplateName}`)
				);
			} catch (workspaceError) {
				console.warn(
					yellow(
						`Could not process workspace file '${sourceWorkspaceTemplateName}':`
					),
					workspaceError
				);
				console.warn(
					yellow(
						`You may need to configure ${finalWorkspaceFileName} manually.`
					)
				);
			}
		} else {
			console.log(
				yellow(
					`Workspace template '${sourceWorkspaceTemplateName}' not found. Skipping generation.`
				)
			);
		}

		// --- Step 5.5: Generate .env.example, .env, and .gitmodules.template ---
		console.log(
			cyan("Generating .env, .env.example, and .gitmodules.template files...")
		);

		// .env.example
		let envExampleContent =
			"# .env.example - Git submodule repository URLs (placeholder values)\n";
		envExampleContent +=
			"# Copy this to .env and fill in your actual private URLs if they differ from public/main URLs used in .gitmodules or for other scripts.\n\n";
		if (submodulesToGuide.length > 0) {
			submodulesToGuide.forEach((sm) => {
				const envKey = submodulePathToEnvKey(sm.path);
				const placeholderUrl = sm.url.startsWith("git@")
					? `git@github.com:your-org/${sm.path}.git`
					: `https://github.com/your-org/${sm.path}.git`;
				envExampleContent += `# Submodule: ${sm.path}\n`;
				envExampleContent += `${envKey}=${placeholderUrl}\n\n`;
			});
		} else {
			envExampleContent += "# No submodules configured.\n";
			envExampleContent +=
				"# EXAMPLE_SUBMODULE_URL=git@github.com:your-org/your-repo.git\n";
		}
		// Note: If src/templates/env.example was copied, it will be overwritten if we name this one .env.example
		// The user asked for .env.example, so we create/overwrite project_root/.env.example
		await writeFile(resolve(process.cwd(), ".env.example"), envExampleContent);
		console.log(green("Generated/Updated .env.example"));

		// .env
		let envContent = "# .env - Actual Git submodule repository URLs\n";
		envContent +=
			"# These URLs are used in .gitmodules.template (via variable expansion by scripts) or for other project scripts.\n\n";
		if (submodulesToGuide.length > 0) {
			submodulesToGuide.forEach((sm) => {
				const envKey = submodulePathToEnvKey(sm.path);
				envContent += `# Submodule: ${sm.path}\n`;
				envContent += `${envKey}=${sm.url}\n\n`;
			});
		} else {
			envContent += "# No submodules configured.\n";
		}
		await writeFile(resolve(process.cwd(), ".env"), envContent);
		console.log(green("Generated .env file."));

		// .gitmodules.template
		const destGitmodulesTemplatePath = resolve(
			process.cwd(),
			".gitmodules.template"
		);

		if (submodulesToGuide.length > 0) {
			console.log(
				cyan("Updating .gitmodules.template with dynamic submodule data...")
			);
			let gitmodulesTemplateContent = "";
			submodulesToGuide.forEach((sm) => {
				const envKey = submodulePathToEnvKey(sm.path);
				const placeholderUrl = sm.url.startsWith("git@")
					? `git@github.com:your-org/${sm.path}.git`
					: `https://github.com/your-org/${sm.path}.git`;
				envExampleContent += `# Submodule: ${sm.path}\n`;
				envExampleContent += `${envKey}=${placeholderUrl}\n\n`;

				envContent += `# Submodule: ${sm.path}\n`;
				envContent += `${envKey}=${sm.url}\n\n`;

				gitmodulesTemplateContent += `[submodule "${sm.path}"]\n`;
				gitmodulesTemplateContent += `\tpath = ${sm.path}\n`;
				gitmodulesTemplateContent += `\turl = \${${envKey}}\n\n`;
			});
			// This creates or overwrites .gitmodules.template in the project root
			await writeFile(
				destGitmodulesTemplatePath,
				gitmodulesTemplateContent.trim() + "\n"
			);
			console.log(
				green(
					"Generated/Updated .gitmodules.template with dynamic submodule data."
				)
			);
		} else {
			envExampleContent += "# No submodules configured.\n";
			envExampleContent +=
				"# EXAMPLE_SUBMODULE_URL=git@github.com:your-org/your-repo.git\n";
			envContent += "# No submodules configured.\n";
			// No dynamic submodules, so .gitmodules.template (copied from src/templates) will be used as is.
			if (existsSync(destGitmodulesTemplatePath)) {
				console.log(
					cyan(
						".gitmodules.template from template source will be used (no submodules configured via CLI)."
					)
				);
			} else {
				console.log(
					yellow(
						".gitmodules.template not generated (no submodules) and template not found in project root."
					)
				);
			}
		}

		// --- Step 5.6: Update .gitignore ---
		console.log(cyan(".gitignore will not be modified for submodule paths."));

		// --- Step 5.7: Generate setup-submodules.sh ---
		console.log(cyan("Generating setup-submodules.sh script..."));
		let scriptContent = "#!/bin/bash\n\n";
		scriptContent += "# Colors for output\n";
		scriptContent += "GREEN='\\\\033[0;32m'\n"; // Escaped backslashes for JS string, then for bash
		scriptContent += "RED='\\\\033[0;31m'\n";
		scriptContent += "YELLOW='\\\\033[0;33m'\n";
		scriptContent += "NC='\\\\033[0m' # No Color\n\n";

		scriptContent += "# Check if .env file exists\n";
		scriptContent += "if [ ! -f .env ]; then\n";
		scriptContent += '    echo -e "${RED}Error: .env file not found!${NC}"\n'; // Escaped $ for JS
		scriptContent +=
			'    echo -e "${YELLOW}Please copy .env.example to .env and update the values, then re-run this script.${NC}"\n';
		scriptContent += "    exit 1\n";
		scriptContent += "fi\n\n";

		scriptContent += "# Source environment variables\n";
		scriptContent +=
			'echo -e "${YELLOW}Sourcing environment variables from .env...${NC}"\n';
		scriptContent += "set -a\n";
		scriptContent += "source .env\n";
		scriptContent += "set +a\n\n";

		if (submodulesToGuide.length > 0) {
			scriptContent +=
				'echo -e "${YELLOW}Checking environment variables for configured submodules:${NC}"\n';
			submodulesToGuide.forEach((sm) => {
				const envKey = submodulePathToEnvKey(sm.path);
				scriptContent += `echo -e "\${YELLOW}${envKey}: \$${envKey}\${NC}"\n`; // Escaped $ for bash var
			});
			scriptContent += "\n";

			scriptContent += "all_vars_set=true\n";
			submodulesToGuide.forEach((sm) => {
				const envKey = submodulePathToEnvKey(sm.path);
				scriptContent += `if [ -z "\$${envKey}" ]; then\n`; // Escaped $ for bash var
				scriptContent += `    echo -e "\${RED}Error: Environment variable ${envKey} is not set in .env!\${NC}"\n`;
				scriptContent += "    all_vars_set=false\n";
				scriptContent += "fi\n";
			});
			scriptContent += 'if [ "$all_vars_set" = false ] ; then\n';
			scriptContent +=
				'    echo -e "${RED}One or more submodule URL environment variables are missing in .env. Please check and try again.${NC}"\n';
			scriptContent += "    exit 1\n";
			scriptContent += "fi\n\n";

			scriptContent += "# Add Git submodules using URLs from .env\n";
			submodulesToGuide.forEach((sm) => {
				const envKey = submodulePathToEnvKey(sm.path);
				const localPath = sm.path;
				scriptContent += `echo -e "\${YELLOW}Adding submodule '${localPath}' from URL in \$${envKey}...\${NC}"\n`;
				scriptContent += `git submodule add -- "\$${envKey}" "${localPath}"\n\n`;
			});

			scriptContent +=
				'echo -e "${YELLOW}Cloning and initializing all submodules (this may take a while)...${NC}"\n';
			scriptContent +=
				"# This command clones missing submodules, fetches updates for existing ones,\n";
			scriptContent +=
				"# and checks out the commit specified in the main project for each submodule.\n";
			scriptContent +=
				"# --init handles any submodules that were not initialized (e.g. newly added).\n";
			scriptContent += "# --recursive handles nested submodules if any.\n";
			scriptContent += "git submodule update --init --recursive\n\n";

			scriptContent +=
				'echo -e "${YELLOW}Attempting to checkout main branch in all submodules...${NC}"\n';
			scriptContent +=
				"# You can change 'main' to your default branch if different (e.g., master, develop)\n";
			scriptContent +=
				"git submodule foreach 'git checkout main || git checkout master || echo -e \"\\${YELLOW}Warning: Could not checkout main/master in $name ($path), please check manually.\"${NC}'\n\n"; // Escaped $, \ for YELLOW, NC inside foreach
			scriptContent +=
				'echo -e "${GREEN}Submodule setup script finished successfully!${NC}"\n';
		} else {
			scriptContent +=
				'echo -e "${YELLOW}No submodules were configured for this project via the CLI.${NC}"\n';
			scriptContent +=
				'echo -e "${YELLOW}If you wish to add submodules manually, use the command: git submodule add <repository_url> <path_to_submodule>${NC}"\n';
			const gitUpdateCmdForBash = "git submodule update --init --recursive";
			scriptContent += `echo -e "\${YELLOW}Then run '${gitUpdateCmdForBash}' to clone their content.\${NC}"\n`;
		}
		scriptContent += "exit 0\n";

		const setupSubmodulesScriptPath = resolve(
			process.cwd(),
			"setup-submodules.sh"
		);
		await writeFile(setupSubmodulesScriptPath, scriptContent);
		await chmod(setupSubmodulesScriptPath, 0o755); // Make executable
		console.log(green("Generated executable setup-submodules.sh script."));

		// --- Step 6: Initialize Git (if applicable) ---
		if (repoType === "submodule" && gitIsActuallyInstalled) {
			console.log(cyan("Initializing Git repository in project root..."));
			gitInitializedLate = tryGitInit(".");
			if (gitInitializedLate) {
				console.log(green("Project Git repository initialized."));
				const commitMessage =
					submodulesToGuide.length > 0
						? "Initial commit: workspace structure, config files, and submodules setup"
						: "Initial commit: workspace structure and config files";

				if (submodulesToGuide.length > 0) {
					console.log(
						cyan(
							`
The .gitmodules file has been created/updated by the setup script (if submodules were added).
Run ./setup-submodules.sh to ensure all submodules are cloned and initialized according to .env variables.
After the script runs, commit all changes:`
						)
					);
					console.log(yellow(`  git add .`));
					console.log(
						yellow(`  git commit -m "Add and initialize submodules"`)
					);
				} else {
					console.log(cyan("Making initial commit..."));
					try {
						const spawn = (await import("cross-spawn")).default;
						spawn.sync("git", ["add", "-A"], { stdio: "ignore" });
						spawn.sync("git", ["commit", "-m", commitMessage], {
							stdio: "ignore",
						});
						console.log(green("Initial commit created."));
					} catch (commitError) {
						console.warn(yellow("Failed to make initial commit:"), commitError);
					}
				}
			} else {
				console.warn(
					yellow(
						"Failed to initialize Git in the project. You may need to do this manually."
					)
				);
			}
		}

		// --- Step 7: Submodule Guidance (if applicable) ---
		if (submodulesToGuide.length > 0) {
			console.log(
				green(`
Submodule Configuration & Setup Guide:`)
			);
			console.log(
				cyan(`1. Ensure your submodule URLs in ${bold(".env")} are correct.`)
			);
			console.log(
				cyan(
					`2. In the ${bold(appName)} directory (${resolve(
						process.cwd()
					)}), run the setup script:`
				)
			);
			console.log(yellow(`     ./setup-submodules.sh`));
			console.log(cyan(`3. After the script completes, commit the changes:`));
			console.log(yellow(`     git add .`));
			console.log(
				yellow(`     git commit -m "Add and initialize submodules via script"`)
			);
			console.log();
		} else if (repoType === "submodule") {
			console.log(
				green(`
Submodule Setup Note:`)
			);
			console.log(
				cyan(
					"No submodules were added during initial setup. " +
						"You can add them manually using the command: 'git submodule add <repository_url> <path_to_submodule>'."
				)
			);
			console.log(
				cyan(
					"If you create a .env file and .gitmodules.template, " +
						"the generated './setup-submodules.sh' script can help manage them if adapted."
				)
			);
		}

		console.log(
			green(`
${appName} workspace (type: ${repoType}) created successfully!`)
		);
	} catch (errorInProjectDir) {
		console.error(
			red(
				"A critical error occurred during workspace setup within project directory:"
			),
			errorInProjectDir
		);
		throw errorInProjectDir;
	} finally {
		process.chdir(originalDirectory);
		console.log(
			cyan(`Restored original working directory to: ${originalDirectory}`)
		);
	}
}
