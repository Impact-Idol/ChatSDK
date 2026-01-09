import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';

export async function installDependencies(projectPath: string): Promise<void> {
  // Detect package manager based on project directory (not current directory)
  const packageManager = await detectPackageManager(projectPath);

  // Run install command
  await execa(packageManager, ['install'], {
    cwd: projectPath,
    stdio: 'ignore', // Silent install
  });
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
