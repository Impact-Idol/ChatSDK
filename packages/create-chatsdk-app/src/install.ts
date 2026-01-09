import { execa } from 'execa';
import fs from 'fs-extra';

export async function installDependencies(projectPath: string): Promise<void> {
  // Detect package manager (prefer what's available)
  const packageManager = await detectPackageManager();

  // Run install command
  await execa(packageManager, ['install'], {
    cwd: projectPath,
    stdio: 'ignore', // Silent install
  });
}

async function detectPackageManager(): Promise<'npm' | 'yarn' | 'pnpm' | 'bun'> {
  // Check for lock files in current directory
  if (await fs.pathExists('yarn.lock')) return 'yarn';
  if (await fs.pathExists('pnpm-lock.yaml')) return 'pnpm';
  if (await fs.pathExists('bun.lockb')) return 'bun';

  // Check if package managers are available
  try {
    await execa('bun', ['--version']);
    return 'bun';
  } catch {}

  try {
    await execa('pnpm', ['--version']);
    return 'pnpm';
  } catch {}

  try {
    await execa('yarn', ['--version']);
    return 'yarn';
  } catch {}

  return 'npm'; // Default fallback
}
