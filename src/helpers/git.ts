/* eslint-disable import/no-extraneous-dependencies */
import { execSync } from "node:child_process";
import { join } from "node:path";
import { rmSync } from "node:fs";

function isInGitRepository(): boolean {
	try {
		execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore" });
		return true;
	} catch (_) {}
	return false;
}

function isInMercurialRepository(): boolean {
	try {
		execSync("hg --cwd . root", { stdio: "ignore" });
		return true;
	} catch (_) {}
	return false;
}

function isDefaultBranchSet(): boolean {
	try {
		execSync("git config init.defaultBranch", { stdio: "ignore" });
		return true;
	} catch (_) {}
	return false;
}

export function tryGitInit(root: string): boolean {
	let didInit = false;
	try {
		// execSync('git --version', { stdio: 'ignore' }); // isGitInstalled helper already checks this
		if (isInGitRepository() || isInMercurialRepository()) {
			// Already in a repo, don't try to init
			// Or, if we are in a submodule context, we might not want to init either.
			// For now, let's assume if we are in a git repo, we don't init another one here.
			console.log("Already in a Git or Mercurial repository.");
			return true; // Consider this a success in terms of repo being ready for submodules
		}

		execSync("git init", { stdio: "ignore" });
		didInit = true;

		if (!isDefaultBranchSet()) {
			execSync("git checkout -b main", { stdio: "ignore" });
		}

		// We will make an initial commit after copying template files or adding submodules
		// execSync('git add -A', { stdio: 'ignore' });
		// execSync('git commit -m "Initial commit from Create Cursor Workspace"', {
		//   stdio: 'ignore',
		// });
		return true;
	} catch (e) {
		if (didInit) {
			try {
				// Try to clean up .git directory if init failed after creation
				rmSync(join(root, ".git"), { recursive: true, force: true });
			} catch (_) {
				// Suppress error if .git folder cannot be removed
			}
		}
		return false;
	}
}
