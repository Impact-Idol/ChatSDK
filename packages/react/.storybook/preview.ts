import type { Preview } from '@storybook/react';
import React from 'react';
import '../src/themes/default.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#0f172a' },
      ],
    },
    layout: 'fullscreen',
  },
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        icon: 'paintbrush',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        showName: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme;

      // Apply theme and fonts to document
      React.useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        document.body.style.fontFamily = '"Geist", "Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        document.body.style.margin = '0';
        document.body.style.letterSpacing = '-0.011em';
        document.body.style.WebkitFontSmoothing = 'antialiased';
      }, [theme]);

      return React.createElement('div', {
        className: 'chatsdk-root',
        'data-theme': theme,
        style: { minHeight: '100vh' }
      }, React.createElement(Story));
    },
  ],
};

export default preview;
