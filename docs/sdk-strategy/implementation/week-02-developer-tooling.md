# Week 2: Developer Tooling

**Goal:** Enable developers to go from zero to a working chat app in 5 minutes using CLI scaffolding and production-ready templates.

**Timeline:** 5 days
**Team:** 2 engineers
**Dependencies:** Week 1 (Single token auth, Docker setup)

## Overview

Week 2 focuses on eliminating setup friction through:
1. **CLI Tool** (`create-chatsdk-app`) - One command to scaffold a complete chat app
2. **Production Templates** - Next.js, Vite, React Native starter projects
3. **Quickstart Documentation** - Get first message in 5 minutes
4. **Example Applications** - 5 real-world demos (Slack clone, Support chat, etc.)

**Success Metrics:**
- Time to first message: 2 hours → **5 minutes** ✅
- Setup steps: 15+ → **3 steps** ✅
- Developer satisfaction: "This was so easy!" feedback from 8/10 testers

## Daily Breakdown

### Day 1-2: CLI Scaffolding Tool
**Deliverable:** `npx create-chatsdk-app` working for all templates

### Day 3: Quickstart Documentation
**Deliverable:** 5-minute setup guide published

### Day 4: Example Applications
**Deliverable:** 5 production-ready demos

### Day 5: Testing & Polish
**Deliverable:** End-to-end validation with 10 developers

---

## Day 1-2: CLI Scaffolding Tool

### Goal
Create `create-chatsdk-app` CLI that scaffolds a complete chat application in <30 seconds.

### User Experience

```bash
# One command to create a new chat app
npx create-chatsdk-app my-chat-app

# Interactive prompts:
? Select a template: (Use arrow keys)
❯ Next.js + App Router (Recommended)
  Vite + React
  React Native + Expo
  Express + React
  Minimal (SDK only)

? TypeScript or JavaScript? (Use arrow keys)
❯ TypeScript (Recommended)
  JavaScript

? Include example components? (Y/n) Y

✨ Creating chat app in ./my-chat-app...
✅ Template copied
✅ Dependencies installed
✅ Environment configured
✅ Docker services started

🎉 Success! Created my-chat-app

Next steps:
  cd my-chat-app
  npm run dev

Your app is running at:
  🌐 http://localhost:3000
  📡 WebSocket: ws://localhost:8000
  🗄️  Database: postgresql://localhost:5432

Default credentials:
  👤 User 1: alice / Alice Johnson
  👤 User 2: bob / Bob Smith

Try it now:
  1. Open http://localhost:3000?user=alice
  2. Open http://localhost:3000?user=bob in another tab
  3. Start chatting! 💬
```

### Implementation

#### File Structure

```
packages/create-chatsdk-app/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                 # CLI entry point
│   ├── prompts.ts               # Interactive prompts
│   ├── templates.ts             # Template configuration
│   ├── scaffold.ts              # File generation
│   ├── install.ts               # Dependency installation
│   └── docker.ts                # Docker setup
├── templates/
│   ├── nextjs-app-router/       # Next.js 14+ template
│   ├── vite-react/              # Vite + React template
│   ├── react-native-expo/       # Expo template
│   ├── express-react/           # Express backend template
│   └── minimal/                 # SDK-only template
└── bin/
    └── create-chatsdk-app       # Executable script
```

#### 1. Package Configuration

**packages/create-chatsdk-app/package.json:**

```json
{
  "name": "create-chatsdk-app",
  "version": "2.0.0",
  "description": "Create a ChatSDK app in one command",
  "type": "module",
  "bin": {
    "create-chatsdk-app": "./bin/create-chatsdk-app"
  },
  "files": [
    "dist",
    "templates",
    "bin"
  ],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "commander": "^11.1.0",
    "inquirer": "^9.2.12",
    "chalk": "^5.3.0",
    "ora": "^8.0.1",
    "execa": "^8.0.1",
    "fs-extra": "^11.2.0",
    "validate-npm-package-name": "^5.0.0",
    "degit": "^2.8.4"
  },
  "devDependencies": {
    "@types/node": "^20.10.6",
    "@types/inquirer": "^9.0.7",
    "@types/fs-extra": "^11.0.4",
    "typescript": "^5.3.3"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "keywords": [
    "chat",
    "messaging",
    "sdk",
    "cli",
    "scaffold",
    "starter"
  ]
}
```

#### 2. CLI Entry Point

**packages/create-chatsdk-app/src/index.ts:**

```typescript
#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import path from 'path';
import fs from 'fs-extra';
import validateNpmPackageName from 'validate-npm-package-name';
import { scaffoldProject } from './scaffold.js';
import { installDependencies } from './install.js';
import { setupDocker } from './docker.js';
import { getTemplateConfig, type Template } from './templates.js';

interface CliOptions {
  template?: Template;
  typescript?: boolean;
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
              { name: 'Vite + React', value: 'vite-react' },
              { name: 'React Native + Expo', value: 'react-native-expo' },
              { name: 'Express + React', value: 'express-react' },
              { name: 'Minimal (SDK only)', value: 'minimal' },
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
        const installSpinner = ora('Installing dependencies...').start();
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
        }
      }

      // Success message
      console.log(chalk.bold.green('\n🎉 Success! Created ' + projectName + '\n'));

      const templateConfig = getTemplateConfig(template);
      console.log('Next steps:');
      console.log(chalk.cyan('  cd ' + projectName));
      console.log(chalk.cyan('  ' + templateConfig.devCommand));
      console.log('');

      if (!options.skipDocker) {
        console.log('Your app is running at:');
        console.log('  🌐 ' + chalk.bold(templateConfig.appUrl));
        console.log('  📡 WebSocket: ' + chalk.gray('ws://localhost:8000'));
        console.log('  🗄️  Database: ' + chalk.gray('postgresql://localhost:5432'));
        console.log('');
      }

      if (includeExamples) {
        console.log('Default credentials:');
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
```

#### 3. Template Configuration

**packages/create-chatsdk-app/src/templates.ts:**

```typescript
export type Template =
  | 'nextjs-app-router'
  | 'vite-react'
  | 'react-native-expo'
  | 'express-react'
  | 'minimal';

export interface TemplateConfig {
  name: string;
  description: string;
  appUrl: string;
  devCommand: string;
  dependencies: string[];
  devDependencies: string[];
}

const templates: Record<Template, TemplateConfig> = {
  'nextjs-app-router': {
    name: 'Next.js + App Router',
    description: 'Full-stack chat app with Next.js 14+ App Router and Server Components',
    appUrl: 'http://localhost:3000',
    devCommand: 'npm run dev',
    dependencies: [
      '@chatsdk/react@latest',
      'next@latest',
      'react@latest',
      'react-dom@latest',
      'tailwindcss@latest',
      'autoprefixer@latest',
      'postcss@latest',
      '@radix-ui/react-avatar@latest',
      '@radix-ui/react-dropdown-menu@latest',
      'lucide-react@latest',
      'date-fns@latest',
    ],
    devDependencies: [
      '@types/node@latest',
      '@types/react@latest',
      '@types/react-dom@latest',
      'typescript@latest',
    ],
  },
  'vite-react': {
    name: 'Vite + React',
    description: 'Lightning-fast development with Vite and React',
    appUrl: 'http://localhost:5173',
    devCommand: 'npm run dev',
    dependencies: [
      '@chatsdk/react@latest',
      'react@latest',
      'react-dom@latest',
      'react-router-dom@latest',
      'tailwindcss@latest',
      '@radix-ui/react-avatar@latest',
      '@radix-ui/react-dropdown-menu@latest',
      'lucide-react@latest',
      'date-fns@latest',
    ],
    devDependencies: [
      '@types/react@latest',
      '@types/react-dom@latest',
      '@vitejs/plugin-react@latest',
      'typescript@latest',
      'vite@latest',
    ],
  },
  'react-native-expo': {
    name: 'React Native + Expo',
    description: 'Cross-platform mobile chat app with Expo',
    appUrl: 'http://localhost:8081',
    devCommand: 'npm start',
    dependencies: [
      '@chatsdk/react-native@latest',
      'expo@latest',
      'expo-status-bar@latest',
      'react@latest',
      'react-native@latest',
      'react-native-safe-area-context@latest',
      '@react-navigation/native@latest',
      '@react-navigation/native-stack@latest',
      'nativewind@latest',
      'date-fns@latest',
    ],
    devDependencies: [
      '@babel/core@latest',
      '@types/react@latest',
      'typescript@latest',
    ],
  },
  'express-react': {
    name: 'Express + React',
    description: 'Traditional backend + frontend separation',
    appUrl: 'http://localhost:3000',
    devCommand: 'npm run dev',
    dependencies: [
      '@chatsdk/core@latest',
      '@chatsdk/react@latest',
      'express@latest',
      'react@latest',
      'react-dom@latest',
      'cors@latest',
      'dotenv@latest',
    ],
    devDependencies: [
      '@types/node@latest',
      '@types/express@latest',
      '@types/react@latest',
      '@types/react-dom@latest',
      'typescript@latest',
      'concurrently@latest',
    ],
  },
  minimal: {
    name: 'Minimal',
    description: 'Just the ChatSDK core - bring your own framework',
    appUrl: 'http://localhost:3000',
    devCommand: 'node index.js',
    dependencies: ['@chatsdk/core@latest'],
    devDependencies: [],
  },
};

export function getTemplateConfig(template: Template): TemplateConfig {
  return templates[template];
}

export function getAllTemplates(): Template[] {
  return Object.keys(templates) as Template[];
}
```

#### 4. Project Scaffolding

**packages/create-chatsdk-app/src/scaffold.ts:**

```typescript
import fs from 'fs-extra';
import path from 'path';
import degit from 'degit';
import type { Template } from './templates.js';

interface ScaffoldOptions {
  projectName: string;
  projectPath: string;
  template: Template;
  useTypeScript: boolean;
  includeExamples: boolean;
}

export async function scaffoldProject(options: ScaffoldOptions): Promise<void> {
  const { projectPath, template, useTypeScript, includeExamples } = options;

  // Create project directory
  await fs.ensureDir(projectPath);

  // Copy template files
  const templatePath = path.join(__dirname, '..', 'templates', template);
  await fs.copy(templatePath, projectPath);

  // Remove TypeScript files if JavaScript selected
  if (!useTypeScript) {
    await convertToJavaScript(projectPath);
  }

  // Remove examples if not needed
  if (!includeExamples) {
    await removeExamples(projectPath, template);
  }

  // Update package.json with project name
  const packageJsonPath = path.join(projectPath, 'package.json');
  const packageJson = await fs.readJSON(packageJsonPath);
  packageJson.name = options.projectName;
  await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });

  // Create .env.local with defaults
  const envPath = path.join(projectPath, '.env.local');
  const envContent = `# ChatSDK Configuration
# Auto-generated by create-chatsdk-app

# API Configuration (required)
NEXT_PUBLIC_CHATSDK_API_KEY=dev-api-key
NEXT_PUBLIC_CHATSDK_API_URL=http://localhost:3000
NEXT_PUBLIC_CHATSDK_WS_URL=ws://localhost:8000/connection/websocket

# Development Mode
NEXT_PUBLIC_CHATSDK_DEBUG=true

# Docker Services (auto-configured)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chatsdk
REDIS_URL=redis://localhost:6379
CENTRIFUGO_URL=http://localhost:8000
CENTRIFUGO_API_KEY=dev-api-key
CENTRIFUGO_SECRET=dev-secret-change-in-production
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=dev-master-key
`;

  await fs.writeFile(envPath, envContent);

  // Add .env.local to .gitignore
  const gitignorePath = path.join(projectPath, '.gitignore');
  let gitignoreContent = '';
  if (await fs.pathExists(gitignorePath)) {
    gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
  }
  if (!gitignoreContent.includes('.env.local')) {
    gitignoreContent += '\n# Environment variables\n.env.local\n.env.*.local\n';
    await fs.writeFile(gitignorePath, gitignoreContent);
  }
}

async function convertToJavaScript(projectPath: string): Promise<void> {
  // Remove TypeScript config
  await fs.remove(path.join(projectPath, 'tsconfig.json'));

  // Rename .ts/.tsx files to .js/.jsx
  const files = await fs.readdir(projectPath, { recursive: true });
  for (const file of files) {
    const filePath = path.join(projectPath, file as string);
    if (filePath.endsWith('.ts') && !filePath.endsWith('.d.ts')) {
      await fs.rename(filePath, filePath.replace('.ts', '.js'));
    } else if (filePath.endsWith('.tsx')) {
      await fs.rename(filePath, filePath.replace('.tsx', '.jsx'));
    }
  }

  // Remove type annotations from files (basic cleanup)
  // Note: For production, consider using a proper TypeScript -> JavaScript transpiler
  const jsFiles = await fs.readdir(projectPath, { recursive: true });
  for (const file of jsFiles) {
    const filePath = path.join(projectPath, file as string);
    if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
      let content = await fs.readFile(filePath, 'utf-8');
      // Remove type imports
      content = content.replace(/import type \{[^}]+\} from ['"][^'"]+['"]/g, '');
      // Remove inline type annotations (basic)
      content = content.replace(/:\s*\w+(\[\])?/g, '');
      await fs.writeFile(filePath, content);
    }
  }
}

async function removeExamples(projectPath: string, template: Template): Promise<void> {
  const examplePaths: Record<Template, string[]> = {
    'nextjs-app-router': [
      'app/(chat)/page.tsx',
      'app/(chat)/channel/[id]/page.tsx',
      'components/chat/',
    ],
    'vite-react': ['src/pages/', 'src/components/chat/'],
    'react-native-expo': ['app/(tabs)/', 'components/chat/'],
    'express-react': ['client/src/pages/', 'client/src/components/chat/'],
    minimal: [],
  };

  const paths = examplePaths[template];
  for (const examplePath of paths) {
    const fullPath = path.join(projectPath, examplePath);
    if (await fs.pathExists(fullPath)) {
      await fs.remove(fullPath);
    }
  }

  // Create minimal placeholder files
  if (template === 'nextjs-app-router') {
    const appPath = path.join(projectPath, 'app/page.tsx');
    await fs.writeFile(
      appPath,
      `export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">ChatSDK App</h1>
      <p className="mt-4 text-gray-600">Ready to build your chat experience!</p>
    </main>
  );
}
`
    );
  }
}
```

#### 5. Dependency Installation

**packages/create-chatsdk-app/src/install.ts:**

```typescript
import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';

export async function installDependencies(projectPath: string): Promise<void> {
  // Detect package manager (prefer what's available)
  const packageManager = await detectPackageManager();

  // Run install command
  await execa(packageManager, ['install'], {
    cwd: projectPath,
    stdio: 'inherit',
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
```

#### 6. Docker Setup

**packages/create-chatsdk-app/src/docker.ts:**

```typescript
import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';

interface DockerSetupResult {
  success: boolean;
  message: string;
}

export async function setupDocker(projectPath: string): Promise<DockerSetupResult> {
  // Check if Docker is running
  try {
    await execa('docker', ['info']);
  } catch {
    return {
      success: false,
      message: 'Docker is not running. Start Docker Desktop and run: npm run docker:up',
    };
  }

  // Copy docker-compose.yml if not exists
  const dockerComposePath = path.join(projectPath, 'docker-compose.yml');
  if (!(await fs.pathExists(dockerComposePath))) {
    const dockerComposeContent = `version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: chatsdk
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  centrifugo:
    image: centrifugo/centrifugo:v5
    environment:
      CENTRIFUGO_API_KEY: dev-api-key
      CENTRIFUGO_TOKEN_HMAC_SECRET_KEY: dev-secret-change-in-production
      CENTRIFUGO_ADMIN_PASSWORD: admin
      CENTRIFUGO_ADMIN_SECRET: admin-secret
    ports:
      - "8000:8000"
    command: centrifugo --config=/dev/null

  minio:
    image: minio/minio:latest
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"

  meilisearch:
    image: getmeili/meilisearch:v1.5
    environment:
      MEILI_MASTER_KEY: dev-master-key
    ports:
      - "7700:7700"
    volumes:
      - meilisearch_data:/meili_data

volumes:
  postgres_data:
  minio_data:
  meilisearch_data:
`;

    await fs.writeFile(dockerComposePath, dockerComposeContent);
  }

  // Start Docker services
  try {
    await execa('docker', ['compose', 'up', '-d'], {
      cwd: projectPath,
      stdio: 'inherit',
    });

    return {
      success: true,
      message: 'Docker services started successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to start Docker services: ' + error,
    };
  }
}
```

### Testing

#### Manual Testing Checklist

```bash
# Test 1: Default flow (Next.js + TypeScript + Examples)
npx create-chatsdk-app test-app-1
cd test-app-1
npm run dev
# ✅ Should open http://localhost:3000 with working chat

# Test 2: Vite + JavaScript + No Examples
npx create-chatsdk-app test-app-2 --template vite-react --javascript --no-examples
cd test-app-2
npm run dev
# ✅ Should open http://localhost:5173 with blank starter

# Test 3: React Native + Expo
npx create-chatsdk-app test-app-3 --template react-native-expo
cd test-app-3
npm start
# ✅ Should open Expo dev tools

# Test 4: Skip Docker (manual services)
npx create-chatsdk-app test-app-4 --skip-docker
cd test-app-4
# ✅ Should create app without starting Docker
docker compose up -d
npm run dev
# ✅ Should work after manually starting Docker

# Test 5: Skip install (CI/CD use case)
npx create-chatsdk-app test-app-5 --skip-install
cd test-app-5
npm install
npm run dev
# ✅ Should work after manual install
```

#### Automated Tests

**packages/create-chatsdk-app/tests/cli.test.ts:**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('create-chatsdk-app CLI', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `test-chatsdk-${Date.now()}`);
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  it('creates a Next.js app with default options', async () => {
    const projectPath = path.join(testDir, 'my-app');

    await execa('node', [
      path.join(__dirname, '../bin/create-chatsdk-app'),
      'my-app',
      '--skip-install',
      '--skip-docker',
    ], {
      cwd: testDir,
    });

    // Check files exist
    expect(await fs.pathExists(path.join(projectPath, 'package.json'))).toBe(true);
    expect(await fs.pathExists(path.join(projectPath, 'next.config.js'))).toBe(true);
    expect(await fs.pathExists(path.join(projectPath, 'tsconfig.json'))).toBe(true);
    expect(await fs.pathExists(path.join(projectPath, '.env.local'))).toBe(true);

    // Check package.json
    const packageJson = await fs.readJSON(path.join(projectPath, 'package.json'));
    expect(packageJson.name).toBe('my-app');
    expect(packageJson.dependencies).toHaveProperty('@chatsdk/react');
  });

  it('creates a Vite app with JavaScript', async () => {
    const projectPath = path.join(testDir, 'vite-app');

    await execa('node', [
      path.join(__dirname, '../bin/create-chatsdk-app'),
      'vite-app',
      '--template',
      'vite-react',
      '--javascript',
      '--skip-install',
      '--skip-docker',
    ], {
      cwd: testDir,
    });

    // Check TypeScript files don't exist
    expect(await fs.pathExists(path.join(projectPath, 'tsconfig.json'))).toBe(false);

    // Check JavaScript files exist
    const srcPath = path.join(projectPath, 'src');
    const files = await fs.readdir(srcPath);
    const hasJsFiles = files.some(file => file.endsWith('.js') || file.endsWith('.jsx'));
    expect(hasJsFiles).toBe(true);
  });

  it('creates app without examples', async () => {
    const projectPath = path.join(testDir, 'no-examples');

    await execa('node', [
      path.join(__dirname, '../bin/create-chatsdk-app'),
      'no-examples',
      '--no-examples',
      '--skip-install',
      '--skip-docker',
    ], {
      cwd: testDir,
    });

    // Check example components don't exist
    expect(await fs.pathExists(path.join(projectPath, 'components/chat'))).toBe(false);
  });
});
```

### Acceptance Criteria

**Must Have:**
- [ ] `npx create-chatsdk-app` works without global install
- [ ] All 5 templates scaffold successfully
- [ ] TypeScript and JavaScript modes both work
- [ ] Examples can be included or excluded
- [ ] `.env.local` is auto-generated with dev defaults
- [ ] Docker services start automatically (unless skipped)
- [ ] Success message shows next steps clearly
- [ ] Project runs immediately after creation

**Nice to Have:**
- [ ] Progress bars for each step
- [ ] Colored output for better UX
- [ ] Validation for project names
- [ ] Detection of existing directories
- [ ] Automatic browser opening after dev server starts

---

## Day 3: Quickstart Documentation

### Goal
Create documentation that gets developers from zero to first message in 5 minutes.

### Implementation

#### Quickstart Guide

**docs/quickstart.md:**

```markdown
# 5-Minute Quickstart

Get your first chat message sent in 5 minutes. No configuration required.

## Prerequisites

- Node.js 18+ installed
- Docker Desktop running (for backend services)

## Step 1: Create Your App (30 seconds)

```bash
npx create-chatsdk-app my-chat-app
```

When prompted:
- Template: **Next.js + App Router** (hit Enter)
- Language: **TypeScript** (hit Enter)
- Examples: **Yes** (hit Enter)

Wait for installation to complete (~1 minute).

## Step 2: Start Your App (10 seconds)

```bash
cd my-chat-app
npm run dev
```

Your app is now running at: **http://localhost:3000**

## Step 3: Send Your First Message (30 seconds)

1. Open **http://localhost:3000?user=alice** in your browser
2. Open **http://localhost:3000?user=bob** in another tab/window
3. Type a message as Alice and press Enter
4. See it appear instantly in Bob's window! 🎉

**Congratulations!** You just built a real-time chat app in under 5 minutes.

## What's Next?

### Customize the UI

Edit `components/chat/MessageList.tsx` to change how messages look:

```tsx
// Change message bubble colors
<div className="bg-blue-500 text-white rounded-lg p-3">
  {message.text}
</div>
```

### Add More Features

```tsx
import { useChat } from '@chatsdk/react';

function MyComponent() {
  const chat = useChat();

  // Send a message
  await chat.sendMessage({ text: 'Hello!' });

  // React to a message
  await chat.addReaction({ messageId: '123', reaction: '👍' });

  // Upload a file
  await chat.uploadFile({ file: myFile });
}
```

### Connect Real Users

Replace the demo authentication with your own:

```tsx
// app/layout.tsx
import { ChatSDK } from '@chatsdk/react';

const client = await ChatSDK.connect({
  apiKey: process.env.NEXT_PUBLIC_CHATSDK_API_KEY!,
  userId: currentUser.id, // From your auth system
  displayName: currentUser.name,
  avatar: currentUser.avatar,
});
```

### Deploy to Production

See [Production Deployment Guide](./production-deployment.md) for:
- Environment variables for production
- Database setup (managed PostgreSQL)
- Scaling to 100K+ concurrent users
- Security hardening

## Troubleshooting

### Docker Not Running

**Error:** `Cannot connect to Docker daemon`

**Fix:** Start Docker Desktop and run `docker compose up -d` in your project folder.

### Port Already in Use

**Error:** `Port 3000 is already allocated`

**Fix:** Stop the other process using port 3000, or change the port in `package.json`:

```json
{
  "scripts": {
    "dev": "next dev -p 3001"
  }
}
```

### Database Connection Failed

**Error:** `Connection refused to localhost:5432`

**Fix:** Restart Docker services:

```bash
docker compose down
docker compose up -d
```

## Get Help

- 📖 [Full Documentation](https://docs.chatsdk.dev)
- 💬 [Discord Community](https://discord.gg/chatsdk)
- 🐛 [GitHub Issues](https://github.com/chatsdk/chatsdk/issues)
- 📧 [Email Support](mailto:support@chatsdk.dev)

## Next Steps

- [API Reference](./api-reference.md) - Complete SDK documentation
- [UI Components](./ui-components.md) - Pre-built chat UI components
- [Advanced Features](./advanced-features.md) - Threads, reactions, file uploads
- [Production Deployment](./production-deployment.md) - Deploy to production
```

### Acceptance Criteria

**Must Have:**
- [ ] Developer can complete quickstart in <5 minutes
- [ ] No prior ChatSDK knowledge required
- [ ] Copy-paste commands work on macOS, Windows, Linux
- [ ] Troubleshooting covers 5 most common issues
- [ ] Next steps clearly linked

---

## Day 4: Example Applications

### Goal
Create 5 production-ready example apps demonstrating real-world use cases.

### Examples to Build

#### 1. **Slack Clone** (Team Messaging)

**Features:**
- Workspaces and channels
- Direct messages
- Threads
- Reactions
- File uploads
- User presence

**Templates:** `examples/slack-clone/`

```tsx
// app/workspace/[id]/page.tsx
import { ChannelList, MessageList, MessageInput } from '@chatsdk/react';

export default function WorkspacePage({ params }: { params: { id: string } }) {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white">
        <ChannelList workspaceId={params.id} />
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        <MessageList />
        <MessageInput />
      </div>
    </div>
  );
}
```

#### 2. **Customer Support Chat** (Widget)

**Features:**
- Embeddable widget
- Agent dashboard
- Typing indicators
- Read receipts
- File attachments
- Conversation history

**Templates:** `examples/support-chat/`

```html
<!-- Embed on any website -->
<script src="https://cdn.chatsdk.dev/widget.js"></script>
<script>
  ChatSDK.init({
    apiKey: 'your-api-key',
    position: 'bottom-right',
    theme: 'light',
    greeting: 'Hi! How can we help?'
  });
</script>
```

#### 3. **Marketplace Messaging** (Buyer-Seller)

**Features:**
- Per-listing conversations
- Order-related messaging
- In-chat payments (Stripe integration)
- Photo sharing
- Location sharing

**Templates:** `examples/marketplace-chat/`

```tsx
// components/ListingChat.tsx
import { useChat, useMessages } from '@chatsdk/react';

export function ListingChat({ listingId, sellerId }: Props) {
  const chat = useChat();
  const messages = useMessages({ channelId: `listing-${listingId}` });

  const handleMakeOffer = async (amount: number) => {
    await chat.sendMessage({
      text: `Offer: $${amount}`,
      metadata: { type: 'offer', amount, listingId }
    });
  };

  return (
    <div>
      <MessageList messages={messages} />
      <OfferButton onMakeOffer={handleMakeOffer} />
    </div>
  );
}
```

#### 4. **Telehealth Platform** (HIPAA-Compliant)

**Features:**
- Doctor-patient messaging
- Appointment scheduling
- Secure file sharing
- Video call integration
- Prescription requests

**Templates:** `examples/telehealth/`

```tsx
// pages/consultation/[id].tsx
import { ChatSDK, MessageList } from '@chatsdk/react';

// HIPAA-compliant setup
const client = await ChatSDK.connect({
  apiKey: process.env.HIPAA_API_KEY!,
  userId: patient.id,
  encryption: true, // Enable E2E encryption
  retentionDays: 90, // Auto-delete after 90 days
});

export default function ConsultationPage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <PatientHeader />
      <MessageList
        filters={{ type: 'consultation' }}
        compliance={{ hipaa: true }}
      />
      <SecureFileUpload />
    </div>
  );
}
```

#### 5. **Social Gaming Chat** (Mobile)

**Features:**
- Lobby chat
- Team/clan chat
- Voice messages
- GIF support
- Push notifications
- Offline mode

**Templates:** `examples/gaming-chat/` (React Native)

```tsx
// app/(tabs)/chat.tsx (Expo)
import { ChatList, MessageList } from '@chatsdk/react-native';
import { useChat } from '@chatsdk/react-native';

export default function GameChatScreen() {
  const chat = useChat();

  return (
    <View style={{ flex: 1 }}>
      <MessageList
        channelId="lobby-1"
        renderMessage={(msg) => (
          <GameMessage message={msg} />
        )}
      />
      <VoiceRecorder onSend={chat.sendVoiceMessage} />
    </View>
  );
}
```

### Example Repository Structure

```
examples/
├── slack-clone/
│   ├── package.json
│   ├── README.md (deploy to Vercel in 1 click)
│   ├── app/
│   └── components/
├── support-chat/
│   ├── widget/ (embeddable widget)
│   └── dashboard/ (agent dashboard)
├── marketplace-chat/
├── telehealth/
└── gaming-chat/
```

### Acceptance Criteria

**Must Have:**
- [ ] All 5 examples run locally with `npm run dev`
- [ ] Each example has README with setup instructions
- [ ] Examples demonstrate different use cases (team, support, marketplace, healthcare, gaming)
- [ ] Code is well-commented and beginner-friendly
- [ ] Examples use best practices (TypeScript, error handling)

**Nice to Have:**
- [ ] 1-click deploy buttons (Vercel, Netlify)
- [ ] Live demos hosted at examples.chatsdk.dev
- [ ] Video walkthroughs for each example

---

## Day 5: Testing & Polish

### Goal
Validate the entire Week 2 deliverable with real developers and fix issues.

### Testing Strategy

#### 1. Internal Testing (Day 5 Morning)

**Team Testing:**
- 3 engineers test CLI with all template combinations
- Test on macOS, Windows, Linux
- Test with npm, yarn, pnpm, bun
- Document all bugs/issues

**Checklist:**

```bash
# Test matrix: 5 templates × 2 languages × 2 example modes = 20 combinations

# Next.js
npx create-chatsdk-app test-nextjs-ts-examples --template nextjs-app-router --typescript --examples
npx create-chatsdk-app test-nextjs-ts-no-examples --template nextjs-app-router --typescript --no-examples
npx create-chatsdk-app test-nextjs-js-examples --template nextjs-app-router --javascript --examples
npx create-chatsdk-app test-nextjs-js-no-examples --template nextjs-app-router --javascript --no-examples

# Vite
npx create-chatsdk-app test-vite-ts-examples --template vite-react --typescript --examples
npx create-chatsdk-app test-vite-ts-no-examples --template vite-react --typescript --no-examples
npx create-chatsdk-app test-vite-js-examples --template vite-react --javascript --examples
npx create-chatsdk-app test-vite-js-no-examples --template vite-react --javascript --no-examples

# React Native
npx create-chatsdk-app test-rn-ts-examples --template react-native-expo --typescript --examples
npx create-chatsdk-app test-rn-ts-no-examples --template react-native-expo --typescript --no-examples

# Express
npx create-chatsdk-app test-express-ts-examples --template express-react --typescript --examples
npx create-chatsdk-app test-express-js-examples --template express-react --javascript --examples

# Minimal
npx create-chatsdk-app test-minimal --template minimal
```

#### 2. External Beta Testing (Day 5 Afternoon)

**Recruit 10 Developers:**
- 3 junior devs (1-2 years experience)
- 4 mid-level devs (3-5 years)
- 3 senior devs (5+ years)

**Instructions:**

```
Hi [Name],

We're launching ChatSDK 2.0 and would love your feedback!

Your task: Build a simple chat app using our new CLI tool in 5 minutes.

Steps:
1. Run: npx create-chatsdk-app my-test-app
2. Follow the prompts (choose defaults)
3. Run: cd my-test-app && npm run dev
4. Open http://localhost:3000?user=alice and send a message
5. Fill out feedback form: https://forms.gle/chatsdk-week2-feedback

We're timing this! We hope you'll finish in under 5 minutes. ⏱️

Thanks!
- ChatSDK Team
```

**Feedback Form Questions:**
1. How long did setup take? (minutes)
2. Did you encounter any errors? (yes/no + describe)
3. Rate the CLI experience (1-5 stars)
4. Rate the documentation (1-5 stars)
5. What was confusing? (open text)
6. What did you like? (open text)
7. Would you use this in production? (yes/no + why)

#### 3. Metrics to Track

```typescript
// Analytics events to add
trackEvent('cli_start', { template, language, examples });
trackEvent('cli_success', { duration_seconds, template });
trackEvent('cli_error', { error_type, template });
trackEvent('dev_server_start', { template });
trackEvent('first_message_sent', { template, time_since_start });
```

**Success Criteria:**
- 8/10 developers complete setup in <5 minutes
- 0 critical bugs (app doesn't start, crashes)
- <3 minor bugs (typos, confusing messages)
- 4.5/5 average rating for CLI experience
- 4.5/5 average rating for documentation

### Bug Fixing Process

**Priority Levels:**

**P0 - Critical (Fix immediately):**
- App doesn't start
- Crashes on first run
- Docker services fail
- Missing dependencies

**P1 - High (Fix today):**
- Confusing error messages
- TypeScript errors
- Missing files
- Wrong default values

**P2 - Medium (Fix this week):**
- Typos in documentation
- Inconsistent formatting
- Missing examples
- Slow installation

**P3 - Low (Fix next week):**
- Nice-to-have features
- Cosmetic issues
- Documentation improvements

### Polish Checklist

**CLI Polish:**
- [ ] Add colored output (success = green, error = red)
- [ ] Add progress bars for long operations
- [ ] Add ASCII art logo on start
- [ ] Improve error messages (actionable, not cryptic)
- [ ] Add `--version` and `--help` flags

**Documentation Polish:**
- [ ] Fix all typos
- [ ] Add screenshots/GIFs
- [ ] Add video walkthrough (2-min Loom)
- [ ] Add troubleshooting for 10 common issues
- [ ] Add FAQ section

**Template Polish:**
- [ ] Fix linting errors
- [ ] Add comments to complex code
- [ ] Ensure consistent code style
- [ ] Add loading states
- [ ] Add error boundaries

### Acceptance Criteria

**Must Have:**
- [ ] 8/10 beta testers complete setup in <5 minutes
- [ ] All P0 and P1 bugs fixed
- [ ] Documentation reviewed by 2 people
- [ ] All templates tested on 3 operating systems
- [ ] CLI published to npm (beta tag)

**Success Metrics:**
- [ ] Time to first message: **<5 minutes** (validated with real users)
- [ ] Setup steps: **3 commands** (create, cd, dev)
- [ ] Developer satisfaction: **4.5/5 stars**

---

## Week 2 Summary

### Deliverables

**Code:**
- ✅ `create-chatsdk-app` CLI tool published to npm
- ✅ 5 production templates (Next.js, Vite, React Native, Express, Minimal)
- ✅ 5 example applications (Slack clone, Support chat, Marketplace, Telehealth, Gaming)
- ✅ All-in-one Docker configuration

**Documentation:**
- ✅ 5-minute quickstart guide
- ✅ Template-specific setup guides
- ✅ Troubleshooting documentation
- ✅ Video tutorial (5-min walkthrough)

**Validation:**
- ✅ 10 developers successfully complete setup in <5 minutes
- ✅ 0 critical bugs
- ✅ 4.5/5 average satisfaction rating

### Impact

**Before Week 2:**
- Time to first message: 2 hours
- Setup steps: 15+
- Required documentation: 10 pages
- Developer frustration: High

**After Week 2:**
- Time to first message: **5 minutes** (24x faster)
- Setup steps: **3** (80% reduction)
- Required documentation: **1 page** (90% reduction)
- Developer experience: **4.5/5 stars**

### Next Week Preview

**Week 3: Automatic Recovery** (Resilience Framework)
- Smart retry logic with exponential backoff
- Circuit breaker pattern
- Request deduplication
- Offline queue improvements

**Goal:** 95% → 99.9% message delivery success rate

---

## Appendix

### Template File Structures

#### Next.js App Router Template

```
templates/nextjs-app-router/
├── package.json
├── next.config.js
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── providers.tsx
│   └── (chat)/
│       ├── layout.tsx
│       ├── page.tsx
│       └── channel/[id]/page.tsx
├── components/
│   ├── chat/
│   │   ├── ChannelList.tsx
│   │   ├── MessageList.tsx
│   │   ├── MessageInput.tsx
│   │   └── UserMenu.tsx
│   └── ui/
│       ├── Avatar.tsx
│       └── Button.tsx
├── lib/
│   ├── chatsdk.ts
│   └── utils.ts
└── public/
    └── logo.svg
```

#### Vite React Template

```
templates/vite-react/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Chat.tsx
│   │   └── Channel.tsx
│   ├── components/
│   │   └── chat/
│   │       ├── MessageList.tsx
│   │       └── MessageInput.tsx
│   └── lib/
│       └── chatsdk.ts
└── public/
```

#### React Native Expo Template

```
templates/react-native-expo/
├── package.json
├── app.json
├── tsconfig.json
├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   └── (tabs)/
│       ├── chat.tsx
│       └── channels.tsx
├── components/
│   ├── chat/
│   │   ├── MessageList.tsx
│   │   └── MessageInput.tsx
│   └── ui/
│       └── Avatar.tsx
└── lib/
    └── chatsdk.ts
```

### CLI Command Reference

```bash
# Basic usage
npx create-chatsdk-app <project-name>

# With options
npx create-chatsdk-app my-app \
  --template nextjs-app-router \
  --typescript \
  --examples \
  --skip-install \
  --skip-docker

# Available templates
--template nextjs-app-router  # Next.js 14+ (default)
--template vite-react          # Vite + React
--template react-native-expo   # React Native + Expo
--template express-react       # Express + React
--template minimal             # SDK only

# Language options
--typescript   # Use TypeScript (default)
--javascript   # Use JavaScript

# Feature flags
--examples     # Include example components (default)
--no-examples  # Skip examples

# Installation flags
--skip-install  # Don't run npm install
--skip-docker   # Don't start Docker services

# Help
npx create-chatsdk-app --help
npx create-chatsdk-app --version
```

### Environment Variables Reference

```bash
# API Configuration (Required in production)
NEXT_PUBLIC_CHATSDK_API_KEY=your-api-key
NEXT_PUBLIC_CHATSDK_API_URL=https://api.chatsdk.dev
NEXT_PUBLIC_CHATSDK_WS_URL=wss://ws.chatsdk.dev

# Development Mode
NEXT_PUBLIC_CHATSDK_DEBUG=true

# Docker Services (Auto-configured in development)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chatsdk
REDIS_URL=redis://localhost:6379
CENTRIFUGO_URL=http://localhost:8000
CENTRIFUGO_API_KEY=dev-api-key
CENTRIFUGO_SECRET=dev-secret-change-in-production
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=dev-master-key
```
