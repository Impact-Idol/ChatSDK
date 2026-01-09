#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import path from 'path';
import fs from 'fs-extra';
// @ts-ignore - no types available
import validateNpmPackageName from 'validate-npm-package-name';
import { scaffoldProject } from './scaffold.js';
import { installDependencies } from './install.js';
import { setupDocker } from './docker.js';
import { getTemplateConfig, type Template } from './templates.js';

interface CliOptions {
  template?: Template;
  typescript?: boolean;
  javascript?: boolean;
  examples?: boolean;
  skipInstall?: boolean;
  skipDocker?: boolean;
}

program
  .name('create-chatsdk-app')
  .description('Create a new ChatSDK application')
  .argument('[project-name]', 'Name of your project')
  .option('-t, --template <template>', 'Template to use (nextjs-app-router, vite-react, react-native-expo, express-react, minimal)')
  .option('--typescript', 'Use TypeScript (default)')
  .option('--javascript', 'Use JavaScript')
  .option('--no-examples', 'Skip example components')
  .option('--skip-install', 'Skip npm install')
  .option('--skip-docker', 'Skip Docker setup')
  .version('2.0.0')
  .action(async (projectName: string | undefined, options: CliOptions) => {
    console.log(chalk.bold.cyan('\n🚀 Create ChatSDK App\n'));

    try {
      // Step 1: Get project name
      if (!projectName) {
        const { name } = await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: 'What is your project named?',
            default: 'my-chat-app',
            validate: (input: string) => {
              const validation = validateNpmPackageName(input);
              if (validation.errors) {
                return validation.errors[0];
              }
              return true;
            },
          },
        ]);
        projectName = name;
      }

      // TypeScript guard - projectName is now guaranteed to be a string
      if (!projectName) {
        console.error(chalk.red('\n❌ Project name is required'));
        process.exit(1);
      }

      const projectPath = path.resolve(process.cwd(), projectName);

      // Check if directory exists
      if (fs.existsSync(projectPath)) {
        const { overwrite } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'overwrite',
            message: `Directory ${chalk.cyan(projectName)} already exists. Overwrite?`,
            default: false,
          },
        ]);

        if (!overwrite) {
          console.log(chalk.yellow('\n⚠️  Cancelled'));
          process.exit(0);
        }

        fs.removeSync(projectPath);
      }

      // Step 2: Select template
      let template = options.template as Template;
      if (!template) {
        const { selectedTemplate } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selectedTemplate',
            message: 'Select a template:',
            choices: [
              { name: 'Next.js + App Router (Recommended)', value: 'nextjs-app-router' },
              { name: 'Minimal (SDK only)', value: 'minimal' },
              // Coming soon:
              // { name: 'Vite + React', value: 'vite-react' },
              // { name: 'React Native + Expo', value: 'react-native-expo' },
              // { name: 'Express + React', value: 'express-react' },
            ],
            default: 'nextjs-app-router',
          },
        ]);
        template = selectedTemplate;
      }

      // Step 3: TypeScript or JavaScript
      let useTypeScript = options.typescript !== false; // Default to TypeScript
      if (options.typescript === undefined && !options.javascript) {
        const { lang } = await inquirer.prompt([
          {
            type: 'list',
            name: 'lang',
            message: 'TypeScript or JavaScript?',
            choices: [
              { name: 'TypeScript (Recommended)', value: 'typescript' },
              { name: 'JavaScript', value: 'javascript' },
            ],
            default: 'typescript',
          },
        ]);
        useTypeScript = lang === 'typescript';
      } else if (options.javascript) {
        useTypeScript = false;
      }

      // Step 4: Include examples
      let includeExamples = options.examples !== false; // Default to true
      if (options.examples === undefined) {
        const { examples } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'examples',
            message: 'Include example components?',
            default: true,
          },
        ]);
        includeExamples = examples;
      }

      console.log('');

      // Step 5: Scaffold project
      const spinner = ora('Creating project...').start();
      await scaffoldProject({
        projectName,
        projectPath,
        template,
        useTypeScript,
        includeExamples,
      });
      spinner.succeed('Template copied');

      // Step 6: Install dependencies
      if (!options.skipInstall) {
        const installSpinner = ora('Installing dependencies (this may take a few minutes)...').start();
        await installDependencies(projectPath);
        installSpinner.succeed('Dependencies installed');
      }

      // Step 7: Setup Docker (if not skipped)
      if (!options.skipDocker) {
        const dockerSpinner = ora('Setting up Docker services...').start();
        const dockerSetup = await setupDocker(projectPath);
        if (dockerSetup.success) {
          dockerSpinner.succeed('Docker services started');
        } else {
          dockerSpinner.warn('Docker setup skipped (Docker not running)');
          console.log(chalk.gray(`   ${dockerSetup.message}`));
        }
      }

      // Success message
      console.log(chalk.bold.green('\n🎉 Success! Created ' + projectName + '\n'));

      const templateConfig = getTemplateConfig(template);
      console.log('Next steps:');
      console.log(chalk.cyan('  cd ' + projectName));
      if (options.skipInstall) {
        console.log(chalk.cyan('  npm install'));
      }
      if (options.skipDocker) {
        console.log(chalk.cyan('  docker compose up -d'));
      }
      console.log(chalk.cyan('  ' + templateConfig.devCommand));
      console.log('');

      if (!options.skipDocker) {
        console.log('Your app will be running at:');
        console.log('  🌐 ' + chalk.bold(templateConfig.appUrl));
        console.log('  📡 WebSocket: ' + chalk.gray('ws://localhost:8001'));
        console.log('  🗄️  Database: ' + chalk.gray('postgresql://localhost:5432'));
        console.log('');
      }

      if (includeExamples) {
        console.log('Default test users:');
        console.log('  👤 User 1: ' + chalk.bold('alice') + ' / Alice Johnson');
        console.log('  👤 User 2: ' + chalk.bold('bob') + ' / Bob Smith');
        console.log('');
        console.log('Try it now:');
        console.log('  1. Open ' + chalk.cyan(templateConfig.appUrl + '?user=alice'));
        console.log('  2. Open ' + chalk.cyan(templateConfig.appUrl + '?user=bob') + ' in another tab');
        console.log('  3. Start chatting! 💬');
        console.log('');
      }

      console.log('Learn more: ' + chalk.cyan('https://docs.chatsdk.dev'));
      console.log('');
    } catch (error) {
      console.error(chalk.red('\n❌ Error creating project:'), error);
      process.exit(1);
    }
  });

program.parse();
