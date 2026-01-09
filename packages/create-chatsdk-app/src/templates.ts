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
    devDependencies: ['typescript@latest'],
  },
};

export function getTemplateConfig(template: Template): TemplateConfig {
  return templates[template];
}

export function getAllTemplates(): Template[] {
  return Object.keys(templates) as Template[];
}
