/* eslint-disable import/no-extraneous-dependencies */
import { resolve, dirname, basename, join } from "node:path";
import { copyFile, mkdir } from "node:fs/promises";
import { async as glob } from "fast-glob";

interface CopyOption {
	cwd?: string;
	rename?: (basename: string) => string;
	parents?: boolean;
}

const identity = (x: string) => x;

export const copy = async (
	src: string | string[],
	destPath: string,
	{ cwd: srcCwd, rename = identity, parents = true }: CopyOption = {}
) => {
	const sourcePatterns = typeof src === "string" ? [src] : src;

	if (sourcePatterns.length === 0 || !destPath) {
		throw new TypeError("`src` patterns and `destPath` are required");
	}

	const absoluteDestPath = resolve(destPath);

	const sourceFiles = await glob(sourcePatterns, {
		cwd: srcCwd,
		dot: true,
		absolute: false,
		stats: false,
	});

	return Promise.all(
		sourceFiles.map(async (relativeSrcPath) => {
			const dirNameInSrc = dirname(relativeSrcPath);
			const baseNameInSrc = basename(relativeSrcPath);
			const renamedBaseName = rename(baseNameInSrc);

			const absoluteSrcFile = srcCwd
				? resolve(srcCwd, relativeSrcPath)
				: resolve(relativeSrcPath);

			let targetFilePath: string;
			if (parents) {
				targetFilePath = join(absoluteDestPath, relativeSrcPath);
				if (renamedBaseName !== baseNameInSrc) {
					targetFilePath = join(
						absoluteDestPath,
						dirNameInSrc,
						renamedBaseName
					);
				}
			} else {
				targetFilePath = join(absoluteDestPath, renamedBaseName);
			}

			await mkdir(dirname(targetFilePath), { recursive: true });

			return copyFile(absoluteSrcFile, targetFilePath);
		})
	);
};
