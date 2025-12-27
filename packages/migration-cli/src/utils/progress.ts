/**
 * Progress Tracking Utilities
 */

import cliProgress from 'cli-progress';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';

export interface MigrationProgress {
  usersImported: number;
  channelsImported: number;
  messagesImported: number;
  reactionsImported: number;
  startedAt: string;
  lastUpdatedAt: string;
  completed: boolean;
}

export class ProgressTracker {
  private multibar: cliProgress.MultiBar;
  private bars: Map<string, cliProgress.SingleBar> = new Map();
  private progress: MigrationProgress;
  private cacheDir: string;

  constructor(cacheDir: string = '.migration-cache') {
    this.cacheDir = cacheDir;
    this.multibar = new cliProgress.MultiBar(
      {
        clearOnComplete: false,
        hideCursor: true,
        format: '{bar} | {label} | {value}/{total} | {percentage}% | ETA: {eta}s',
      },
      cliProgress.Presets.shades_classic
    );

    this.progress = {
      usersImported: 0,
      channelsImported: 0,
      messagesImported: 0,
      reactionsImported: 0,
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      completed: false,
    };
  }

  /**
   * Create a progress bar
   */
  createBar(name: string, total: number, label: string): cliProgress.SingleBar {
    const bar = this.multibar.create(total, 0, { label });
    this.bars.set(name, bar);
    return bar;
  }

  /**
   * Update a progress bar
   */
  updateBar(name: string, value: number) {
    const bar = this.bars.get(name);
    if (bar) {
      bar.update(value);
    }
  }

  /**
   * Increment a progress bar
   */
  incrementBar(name: string, amount: number = 1) {
    const bar = this.bars.get(name);
    if (bar) {
      bar.increment(amount);
    }
  }

  /**
   * Stop all progress bars
   */
  stop() {
    this.multibar.stop();
  }

  /**
   * Update migration progress
   */
  updateProgress(updates: Partial<MigrationProgress>) {
    this.progress = {
      ...this.progress,
      ...updates,
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get current progress
   */
  getProgress(): MigrationProgress {
    return this.progress;
  }

  /**
   * Save progress to disk
   */
  async saveProgress() {
    await fs.mkdir(this.cacheDir, { recursive: true });
    await fs.writeFile(
      path.join(this.cacheDir, 'progress.json'),
      JSON.stringify(this.progress, null, 2)
    );
  }

  /**
   * Load progress from disk
   */
  async loadProgress(): Promise<MigrationProgress | null> {
    try {
      const data = await fs.readFile(
        path.join(this.cacheDir, 'progress.json'),
        'utf-8'
      );
      this.progress = JSON.parse(data);
      return this.progress;
    } catch (error) {
      return null;
    }
  }

  /**
   * Print summary
   */
  printSummary() {
    console.log('\n' + chalk.bold('Migration Summary:'));
    console.log(chalk.green(`✓ Users imported: ${this.progress.usersImported}`));
    console.log(chalk.green(`✓ Channels imported: ${this.progress.channelsImported}`));
    console.log(chalk.green(`✓ Messages imported: ${this.progress.messagesImported}`));
    console.log(chalk.green(`✓ Reactions imported: ${this.progress.reactionsImported}`));

    const duration = new Date().getTime() - new Date(this.progress.startedAt).getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);

    console.log(chalk.blue(`\n⏱  Total time: ${minutes}m ${seconds}s`));
  }
}
