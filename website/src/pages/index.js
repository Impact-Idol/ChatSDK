import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <h1 className="hero__title">{siteConfig.title}</h1>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/QUICK_START">
            Get Started in 5 Minutes
          </Link>
        </div>
      </div>
    </header>
  );
}

const features = [
  {
    title: '5-Minute Setup',
    description: 'Get a fully functional chat app running with just a few commands. Smart defaults mean minimal configuration.',
  },
  {
    title: '99.9% Delivery',
    description: 'Built-in offline queue, smart retry, and circuit breaker patterns ensure your messages always get through.',
  },
  {
    title: 'Developer Tools',
    description: 'Chrome DevTools extension, debug mode, and actionable error messages make development a breeze.',
  },
];

function Feature({title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} - Documentation`}
      description="The easiest messaging SDK on the planet. 5-minute setup. 99.9% message delivery.">
      <HomepageHeader />
      <main>
        <section className={styles.features}>
          <div className="container">
            <div className="row">
              {features.map((props, idx) => (
                <Feature key={idx} {...props} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
