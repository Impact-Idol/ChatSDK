import type { Meta, StoryObj } from '@storybook/react';
import { VoiceMessage } from '../../components/sdk/VoiceMessage';
import { VoiceRecorder } from '../../components/sdk/VoiceRecorder';

const generateWaveform = (length: number = 30): number[] => {
  const waveform: number[] = [];
  for (let i = 0; i < length; i++) {
    // Create a more realistic waveform pattern
    const base = 0.3 + Math.random() * 0.4;
    const peak = Math.sin((i / length) * Math.PI) * 0.3;
    waveform.push(Math.min(1, Math.max(0, base + peak + (Math.random() - 0.5) * 0.2)));
  }
  return waveform;
};

const meta: Meta<typeof VoiceMessage> = {
  title: 'SDK/VoiceMessage',
  component: VoiceMessage,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ padding: '2rem', background: '#f8fafc' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof VoiceMessage>;

export const Default: Story = {
  args: {
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    duration: 34,
    waveform: generateWaveform(),
    isOwn: false,
  },
};

export const OwnMessage: Story = {
  args: {
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    duration: 127,
    waveform: generateWaveform(),
    isOwn: true,
  },
};

export const ShortMessage: Story = {
  args: {
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    duration: 5,
    waveform: generateWaveform(20),
    isOwn: false,
  },
};

export const LongMessage: Story = {
  args: {
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    duration: 245,
    waveform: generateWaveform(40),
    isOwn: false,
  },
};

// Voice Recorder Stories
const recorderMeta: Meta<typeof VoiceRecorder> = {
  title: 'SDK/VoiceRecorder',
  component: VoiceRecorder,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ padding: '2rem' }}>
        <Story />
      </div>
    ),
  ],
};

export const RecorderDefault: StoryObj<typeof VoiceRecorder> = {
  render: () => (
    <VoiceRecorder
      onRecordingComplete={(blob, duration, waveform) => {
        console.log('Recording complete:', { blob, duration, waveform });
      }}
      onCancel={() => console.log('Recording cancelled')}
    />
  ),
};
