import type { Meta, StoryObj } from '@storybook/react';
import { ThemeBuilder, ThemeConfig } from '../../components/onboarding/ThemeBuilder';

const meta: Meta<typeof ThemeBuilder> = {
  title: 'Onboarding/ThemeBuilder',
  component: ThemeBuilder,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    onThemeChange: (theme) => console.log('Theme changed:', theme),
    onExport: (theme, format) => {
      console.log(`Export as ${format}:`, theme);
      alert(`Theme exported as ${format}. Check console for details.`);
    },
    onSave: (theme) => {
      console.log('Theme saved:', theme);
      alert('Theme saved!');
    },
  },
};

export default meta;
type Story = StoryObj<typeof ThemeBuilder>;

export const Default: Story = {
  args: {},
};

export const DarkTheme: Story = {
  args: {
    initialTheme: {
      name: 'Dark Mode',
      colors: {
        primary: '#818cf8',
        primaryHover: '#6366f1',
        secondary: '#a78bfa',
        background: '#111827',
        backgroundSecondary: '#1f2937',
        backgroundTertiary: '#374151',
        surface: '#1f2937',
        text: '#f9fafb',
        textSecondary: '#d1d5db',
        textTertiary: '#9ca3af',
        border: '#374151',
        success: '#34d399',
        warning: '#fbbf24',
        error: '#f87171',
        info: '#60a5fa',
      },
      components: {
        messageOwn: {
          backgroundColor: '#6366f1',
          textColor: '#ffffff',
        },
        messageOther: {
          backgroundColor: '#374151',
          textColor: '#f9fafb',
        },
        avatar: {
          size: 40,
          borderRadius: 50,
        },
        input: {
          backgroundColor: '#1f2937',
          borderColor: '#374151',
          focusBorderColor: '#818cf8',
        },
      },
    },
  },
};

export const BrandedTheme: Story = {
  args: {
    initialTheme: {
      name: 'Branded',
      colors: {
        primary: '#059669',
        primaryHover: '#047857',
        secondary: '#10b981',
        background: '#ffffff',
        backgroundSecondary: '#f0fdf4',
        backgroundTertiary: '#dcfce7',
        surface: '#ffffff',
        text: '#064e3b',
        textSecondary: '#047857',
        textTertiary: '#10b981',
        border: '#a7f3d0',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
      },
      typography: {
        fontFamily: 'Georgia, serif',
        fontSizeBase: 15,
        fontSizeSmall: 13,
        fontSizeLarge: 18,
        lineHeight: 1.6,
      },
      spacing: {
        unit: 10,
        borderRadius: 12,
        borderRadiusLarge: 20,
      },
      components: {
        messageOwn: {
          backgroundColor: '#059669',
          textColor: '#ffffff',
        },
        messageOther: {
          backgroundColor: '#dcfce7',
          textColor: '#064e3b',
        },
        avatar: {
          size: 48,
          borderRadius: 12,
        },
        input: {
          backgroundColor: '#f0fdf4',
          borderColor: '#a7f3d0',
          focusBorderColor: '#059669',
        },
      },
    },
  },
};

export const CompactTheme: Story = {
  args: {
    initialTheme: {
      typography: {
        fontFamily: 'system-ui, sans-serif',
        fontSizeBase: 13,
        fontSizeSmall: 11,
        fontSizeLarge: 14,
        lineHeight: 1.4,
      },
      spacing: {
        unit: 6,
        borderRadius: 4,
        borderRadiusLarge: 6,
      },
      components: {
        messageOwn: {
          backgroundColor: '#6366f1',
          textColor: '#ffffff',
        },
        messageOther: {
          backgroundColor: '#f3f4f6',
          textColor: '#111827',
        },
        avatar: {
          size: 28,
          borderRadius: 50,
        },
        input: {
          backgroundColor: '#ffffff',
          borderColor: '#e5e7eb',
          focusBorderColor: '#6366f1',
        },
      },
    },
  },
};

export const SquareAvatars: Story = {
  args: {
    initialTheme: {
      spacing: {
        unit: 8,
        borderRadius: 0,
        borderRadiusLarge: 4,
      },
      components: {
        messageOwn: {
          backgroundColor: '#3b82f6',
          textColor: '#ffffff',
        },
        messageOther: {
          backgroundColor: '#e5e7eb',
          textColor: '#111827',
        },
        avatar: {
          size: 36,
          borderRadius: 4,
        },
        input: {
          backgroundColor: '#ffffff',
          borderColor: '#d1d5db',
          focusBorderColor: '#3b82f6',
        },
      },
    },
  },
};

export const NoPreview: Story = {
  args: {
    showPreview: false,
  },
};
