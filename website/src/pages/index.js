import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import CodeBlock from '@theme/CodeBlock';
import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <h1 className="hero__title">{siteConfig.title}</h1>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <p className={styles.heroDescription}>
          Build real-time chat into your app in minutes, not months.<br />
          Open source. Self-hosted. Enterprise-ready.
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/QUICK_START">
            Get Started
          </Link>
          <Link
            className="button button--outline button--lg"
            style={{marginLeft: '1rem', color: 'white', borderColor: 'white'}}
            href="https://github.com/Impact-Idol/ChatSDK">
            View on GitHub
          </Link>
        </div>
        <div className={styles.badges}>
          <img src="https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript" alt="TypeScript" />
          <img src="https://img.shields.io/badge/License-MIT-yellow" alt="MIT License" />
          <img src="https://img.shields.io/badge/Bundle-95KB-green" alt="Bundle Size" />
        </div>
      </div>
    </header>
  );
}

const features = [
  {
    title: '5-Minute Setup',
    icon: '🚀',
    description: 'One CLI command to scaffold. Three environment variables to configure. Smart defaults handle the rest.',
  },
  {
    title: '99.9% Delivery',
    icon: '📬',
    description: 'Offline queue, smart retry with exponential backoff, and circuit breakers ensure messages always arrive.',
  },
  {
    title: 'Real-Time WebSocket',
    icon: '⚡',
    description: 'Sub-second message delivery with automatic reconnection in under 2 seconds on network drops.',
  },
  {
    title: 'React & React Native',
    icon: '⚛️',
    description: 'First-class hooks and components for web and mobile. useMessages, useChannels, usePresence built-in.',
  },
  {
    title: 'Chrome DevTools',
    icon: '🔧',
    description: 'Debug extension with message inspector, network monitor, and performance profiler.',
  },
  {
    title: 'Self-Hosted',
    icon: '🏠',
    description: 'Run on your infrastructure. Docker Compose for dev, Kubernetes-ready for production. Your data, your control.',
  },
];

function Feature({title, icon, description}) {
  return (
    <div className={clsx('col col--4', styles.featureCard)}>
      <div className={styles.featureContent}>
        <div className={styles.featureIcon}>{icon}</div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

function CodeExample() {
  const codeExample = `import { ChatSDK } from '@chatsdk/core';
import { ChatProvider, MessageList, MessageInput } from '@chatsdk/react';

// Connect in one line
const client = await ChatSDK.connect({
  apiKey: process.env.API_KEY,
  userId: 'user-123',
});

// Render your chat UI
function Chat() {
  return (
    <ChatProvider client={client}>
      <MessageList channelId="general" />
      <MessageInput channelId="general" />
    </ChatProvider>
  );
}`;

  return (
    <section className={styles.codeSection}>
      <div className="container">
        <div className="row">
          <div className="col col--5">
            <h2>Simple, Powerful API</h2>
            <p>
              Connect users, send messages, and build rich chat experiences with
              an intuitive API designed for developer productivity.
            </p>
            <ul className={styles.featureList}>
              <li>Type-safe with full TypeScript support</li>
              <li>React hooks for real-time updates</li>
              <li>Automatic offline handling</li>
              <li>Built-in typing indicators & read receipts</li>
            </ul>
            <Link
              className="button button--primary"
              to="/docs/guides/getting-started">
              View Full API Docs
            </Link>
          </div>
          <div className="col col--7">
            <CodeBlock language="tsx" title="App.tsx">
              {codeExample}
            </CodeBlock>
          </div>
        </div>
      </div>
    </section>
  );
}

function ComparisonTable() {
  return (
    <section className={styles.comparisonSection}>
      <div className="container">
        <h2 className="text--center">Why ChatSDK?</h2>
        <p className="text--center" style={{marginBottom: '2rem'}}>
          Compare with other messaging solutions
        </p>
        <div className={styles.tableWrapper}>
          <table className={styles.comparisonTable}>
            <thead>
              <tr>
                <th></th>
                <th>ChatSDK</th>
                <th>Stream</th>
                <th>SendBird</th>
                <th>PubNub</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Bundle Size</td>
                <td className={styles.highlight}>95 KB</td>
                <td>145 KB</td>
                <td>180 KB</td>
                <td>120 KB</td>
              </tr>
              <tr>
                <td>Setup Time</td>
                <td className={styles.highlight}>5 min</td>
                <td>15-20 min</td>
                <td>25-30 min</td>
                <td>10-15 min</td>
              </tr>
              <tr>
                <td>Open Source</td>
                <td className={styles.highlight}>Yes</td>
                <td>No</td>
                <td>No</td>
                <td>No</td>
              </tr>
              <tr>
                <td>Self-Hosted</td>
                <td className={styles.highlight}>Yes</td>
                <td>No</td>
                <td>No</td>
                <td>No</td>
              </tr>
              <tr>
                <td>Pricing</td>
                <td className={styles.highlight}>Free</td>
                <td>$99/mo</td>
                <td>$399/mo</td>
                <td>$49/mo</td>
              </tr>
              <tr>
                <td>Offline Queue</td>
                <td className={styles.highlight}>Built-in</td>
                <td>No</td>
                <td>Yes</td>
                <td>No</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function CallToAction() {
  return (
    <section className={styles.ctaSection}>
      <div className="container text--center">
        <h2>Ready to build?</h2>
        <p>Get your chat app running in under 5 minutes.</p>
        <div className={styles.ctaButtons}>
          <Link
            className="button button--primary button--lg"
            to="/docs/QUICK_START">
            Start Building
          </Link>
          <Link
            className="button button--outline button--lg"
            href="https://github.com/Impact-Idol/ChatSDK"
            style={{marginLeft: '1rem'}}>
            Star on GitHub
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="Documentation"
      description="The easiest messaging SDK on the planet. 5-minute setup. 99.9% message delivery. Open source and self-hosted.">
      <HomepageHeader />
      <main>
        <section className={styles.features}>
          <div className="container">
            <h2 className="text--center" style={{marginBottom: '2rem'}}>Everything you need for chat</h2>
            <div className="row">
              {features.map((props, idx) => (
                <Feature key={idx} {...props} />
              ))}
            </div>
          </div>
        </section>
        <CodeExample />
        <ComparisonTable />
        <CallToAction />
      </main>
    </Layout>
  );
}
