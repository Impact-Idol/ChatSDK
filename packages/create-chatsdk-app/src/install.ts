import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';

export async function installDependencies(projectPath: string): Promise<void> {
  // Detect package manager based on project directory (not current directory)
  const packageManager = await detectPackageManager(projectPath);

  try {
    // Run install command
    await execa(packageManager, ['install'], {
      cwd: projectPath,
      stdio: 'ignore', // Silent install
    });
  } catch (error) {
    // Provide helpful error message
    throw new Error(
      `Failed to install dependencies with ${packageManager}.\n` +
      `This usually means:\n` +
      `  - Package '@chatsdk/core' is not published yet (expected during development)\n` +
      `  - No internet connection\n` +
      `  - npm registry is down\n\n` +
      `You can skip installation and install manually:\n` +
      `  npx create-chatsdk-app my-app --skip-install`
    );
  }
}

async function detectPackageManager(projectPath: string): Promise<'npm' | 'yarn' | 'pnpm' | 'bun'> {
  // Check for lock files in PROJECT directory (not current directory)
  if (await fs.pathExists(path.join(projectPath, 'yarn.lock'))) return 'yarn';
  if (await fs.pathExists(path.join(projectPath, 'pnpm-lock.yaml'))) return 'pnpm';
  if (await fs.pathExists(path.join(projectPath, 'bun.lockb'))) return 'bun';

  // No lock file exists - just use npm (most widely available)
  // Don't auto-detect other package managers to avoid unexpected behavior
  return 'npm';
}
