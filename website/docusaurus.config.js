// @ts-check
const {themes} = require('prism-react-renderer');
const lightCodeTheme = themes.github;
const darkCodeTheme = themes.dracula;

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'ChatSDK',
  tagline: 'The easiest messaging SDK on the planet',
  favicon: 'img/favicon.ico',

  // GitHub Pages deployment config
  url: 'https://impact-idol.github.io',
  baseUrl: '/ChatSDK/',
  organizationName: 'Impact-Idol',
  projectName: 'ChatSDK',
  deploymentBranch: 'gh-pages',
  trailingSlash: false,

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          path: '../docs',
          editUrl: 'https://github.com/Impact-Idol/ChatSDK/tree/main/website/',
          // Exclude docs with MDX-incompatible content (angle brackets parsed as JSX)
          exclude: [
            '**/sdk-strategy/**',
            '**/research/**',
            '**/specs/**',
            '**/production/**',
            '**/hipaa-compliance/**',
            '**/enterprise/**',
            '**/examples/**',
            '**/*.html',
            '**/BACKEND_INTEGRATION_PLAN.md',
            '**/HULY-UI-EXTRACTION-PLAN.md',
            '**/IMPLEMENTATION_SUMMARY.md',
            '**/SDK_EXTENSION_PLAN.md',
            '**/WORKSPACE_INVITE_SYSTEM.md',
            '**/huly-chat-extraction-plan.md',
            '**/enterprise-readiness-plan.md',
          ],
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/chatsdk-social-card.png',
      navbar: {
        title: 'ChatSDK',
        logo: {
          alt: 'ChatSDK Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'guideSidebar',
            position: 'left',
            label: 'Guides',
          },
          {
            href: 'https://github.com/Impact-Idol/ChatSDK',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Getting Started',
                to: '/docs/guides/getting-started',
              },
              {
                label: 'API Reference',
                to: '/docs/API_REFERENCE',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/Impact-Idol/ChatSDK',
              },
              {
                label: 'Discord',
                href: 'https://discord.gg/chatsdk',
              },
              {
                label: 'Twitter',
                href: 'https://twitter.com/ChatSDK',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'Changelog',
                href: 'https://github.com/Impact-Idol/ChatSDK/blob/main/CHANGELOG.md',
              },
              {
                label: 'npm',
                href: 'https://www.npmjs.com/package/@chatsdk/core',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Impact Idol. Built with Docusaurus.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
        additionalLanguages: ['bash', 'typescript', 'json'],
      },
      colorMode: {
        defaultMode: 'light',
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },
    }),
};

module.exports = config;
