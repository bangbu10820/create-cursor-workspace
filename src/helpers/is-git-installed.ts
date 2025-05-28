import { execSync } from "node:child_process";

export function isGitInstalled(): boolean {
	try {
		execSync("git --version", { stdio: "ignore" });
		return true;
	} catch (e) {
		return false;
	}
}
