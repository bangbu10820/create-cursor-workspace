import spawn from "cross-spawn";

/**
 * Checks if a Git URL is accessible by running `git ls-remote <url>`.
 * @param gitUrl The Git URL to check.
 * @returns Promise<boolean> True if accessible, false otherwise.
 */
export async function checkGitUrlAccess(gitUrl: string): Promise<boolean> {
	return new Promise((resolve) => {
		const child = spawn("git", ["ls-remote", gitUrl], {
			stdio: "ignore", // We don't need to see the output or errors of ls-remote itself
		});

		child.on("close", (code) => {
			resolve(code === 0);
		});

		child.on("error", () => {
			// This typically means the command `git` itself could not be spawned.
			resolve(false);
		});
	});
}
