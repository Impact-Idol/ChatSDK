import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
const defaultSteps = [
    {
        id: 'install',
        title: 'Install the SDK',
        description: 'Add the ChatSDK package to your project using your preferred package manager.',
        snippets: [
            { language: 'bash', label: 'npm', code: 'npm install @chatsdk/react @chatsdk/core' },
            { language: 'bash', label: 'yarn', code: 'yarn add @chatsdk/react @chatsdk/core' },
            { language: 'bash', label: 'pnpm', code: 'pnpm add @chatsdk/react @chatsdk/core' },
        ],
    },
    {
        id: 'initialize',
        title: 'Initialize the Client',
        description: 'Create a ChatClient instance with your API key and connect with a user.',
        snippets: [
            {
                language: 'typescript',
                label: 'TypeScript',
                code: `import { ChatClient } from '@chatsdk/core';

const client = new ChatClient('YOUR_API_KEY');

// Connect a user
await client.connectUser(
  { id: 'user-123', name: 'John Doe' },
  'USER_TOKEN'
);`,
            },
            {
                language: 'javascript',
                label: 'JavaScript',
                code: `import { ChatClient } from '@chatsdk/core';

const client = new ChatClient('YOUR_API_KEY');

// Connect a user
await client.connectUser(
  { id: 'user-123', name: 'John Doe' },
  'USER_TOKEN'
);`,
            },
        ],
    },
    {
        id: 'provider',
        title: 'Add the Chat Provider',
        description: 'Wrap your application with the ChatProvider to enable chat functionality.',
        snippets: [
            {
                language: 'tsx',
                label: 'React',
                code: `import { ChatProvider } from '@chatsdk/react';

function App() {
  return (
    <ChatProvider client={client}>
      <YourApp />
    </ChatProvider>
  );
}`,
            },
        ],
    },
    {
        id: 'components',
        title: 'Add Chat Components',
        description: 'Use our pre-built components to quickly add chat to your app.',
        snippets: [
            {
                language: 'tsx',
                label: 'React',
                code: `import {
  ChannelList,
  Channel,
  MessageList,
  MessageInput
} from '@chatsdk/react';

function ChatPage() {
  return (
    <div className="chat-container">
      <ChannelList />
      <Channel>
        <MessageList />
        <MessageInput />
      </Channel>
    </div>
  );
}`,
            },
        ],
    },
];
export function SDKIntegrationGuide({ apiKey = 'YOUR_API_KEY', appId = 'YOUR_APP_ID', steps = defaultSteps, onComplete, }) {
    const [activeStep, setActiveStep] = useState(0);
    const [activeSnippet, setActiveSnippet] = useState({});
    const [copiedCode, setCopiedCode] = useState(null);
    const replaceKeys = (code) => {
        return code
            .replace(/YOUR_API_KEY/g, apiKey)
            .replace(/YOUR_APP_ID/g, appId);
    };
    const handleCopy = async (code, stepId) => {
        await navigator.clipboard.writeText(replaceKeys(code));
        setCopiedCode(stepId);
        setTimeout(() => setCopiedCode(null), 2000);
    };
    const getActiveSnippetIndex = (stepId) => {
        return activeSnippet[stepId] || 0;
    };
    const styles = {
        container: {
            maxWidth: '800px',
            margin: '0 auto',
            padding: '24px',
        },
        header: {
            marginBottom: '32px',
        },
        title: {
            fontSize: '28px',
            fontWeight: 700,
            color: 'var(--chatsdk-text-primary, #111827)',
            margin: 0,
            marginBottom: '8px',
        },
        subtitle: {
            fontSize: '16px',
            color: 'var(--chatsdk-text-secondary, #6b7280)',
            margin: 0,
        },
        progressBar: {
            display: 'flex',
            gap: '8px',
            marginBottom: '32px',
        },
        progressStep: {
            flex: 1,
            height: '4px',
            borderRadius: '2px',
            backgroundColor: 'var(--chatsdk-bg-tertiary, #e5e7eb)',
            transition: 'background-color 0.3s ease',
        },
        progressStepActive: {
            backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
        },
        stepList: {
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
        },
        stepCard: {
            padding: '24px',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            borderRadius: '12px',
            border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
        },
        stepCardActive: {
            borderColor: 'var(--chatsdk-accent-color, #6366f1)',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)',
        },
        stepHeader: {
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '16px',
        },
        stepNumber: {
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'var(--chatsdk-bg-tertiary, #e5e7eb)',
            color: 'var(--chatsdk-text-secondary, #6b7280)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 600,
            flexShrink: 0,
        },
        stepNumberActive: {
            backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
            color: '#ffffff',
        },
        stepNumberComplete: {
            backgroundColor: 'var(--chatsdk-success-color, #10b981)',
            color: '#ffffff',
        },
        stepTitle: {
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-primary, #111827)',
        },
        stepDescription: {
            fontSize: '14px',
            color: 'var(--chatsdk-text-secondary, #6b7280)',
            marginBottom: '16px',
            lineHeight: 1.6,
        },
        snippetTabs: {
            display: 'flex',
            gap: '8px',
            marginBottom: '12px',
        },
        snippetTab: {
            padding: '6px 12px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: 'transparent',
            color: 'var(--chatsdk-text-secondary, #6b7280)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
        },
        snippetTabActive: {
            backgroundColor: 'var(--chatsdk-bg-tertiary, #e5e7eb)',
            color: 'var(--chatsdk-text-primary, #111827)',
        },
        codeBlock: {
            position: 'relative',
            backgroundColor: '#1e1e1e',
            borderRadius: '10px',
            overflow: 'hidden',
        },
        codeHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 16px',
            backgroundColor: '#2d2d2d',
            borderBottom: '1px solid #3d3d3d',
        },
        codeLanguage: {
            fontSize: '12px',
            color: '#9ca3af',
            fontWeight: 500,
        },
        copyButton: {
            padding: '6px 12px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: copiedCode ? '#10b981' : '#4b5563',
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'background-color 0.15s ease',
        },
        code: {
            padding: '16px',
            margin: 0,
            fontSize: '13px',
            fontFamily: "'Fira Code', 'Consolas', monospace",
            color: '#e5e7eb',
            overflowX: 'auto',
            lineHeight: 1.6,
        },
        navigation: {
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '32px',
        },
        navButton: {
            padding: '12px 24px',
            borderRadius: '10px',
            border: 'none',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
        },
        prevButton: {
            backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
            color: 'var(--chatsdk-text-secondary, #6b7280)',
            border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
        },
        nextButton: {
            backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
            color: '#ffffff',
        },
        completeButton: {
            backgroundColor: 'var(--chatsdk-success-color, #10b981)',
            color: '#ffffff',
        },
        quickLinks: {
            marginTop: '32px',
            padding: '20px',
            backgroundColor: 'var(--chatsdk-bg-secondary, #f9fafb)',
            borderRadius: '12px',
        },
        quickLinksTitle: {
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--chatsdk-text-primary, #111827)',
            marginBottom: '12px',
        },
        linkGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
        },
        link: {
            padding: '12px',
            backgroundColor: 'var(--chatsdk-bg-primary, #ffffff)',
            borderRadius: '8px',
            border: '1px solid var(--chatsdk-border-color, #e5e7eb)',
            textDecoration: 'none',
            color: 'var(--chatsdk-text-primary, #111827)',
            fontSize: '13px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
        },
        linkIcon: {
            color: 'var(--chatsdk-accent-color, #6366f1)',
        },
    };
    return (_jsxs("div", { style: styles.container, children: [_jsxs("div", { style: styles.header, children: [_jsx("h1", { style: styles.title, children: "SDK Integration Guide" }), _jsx("p", { style: styles.subtitle, children: "Follow these steps to integrate ChatSDK into your application" })] }), _jsx("div", { style: styles.progressBar, children: steps.map((_, index) => (_jsx("div", { style: {
                        ...styles.progressStep,
                        ...(index <= activeStep ? styles.progressStepActive : {}),
                    } }, index))) }), _jsx("div", { style: styles.stepList, children: steps.map((step, index) => {
                    const isActive = index === activeStep;
                    const isComplete = index < activeStep;
                    const snippetIndex = getActiveSnippetIndex(step.id);
                    return (_jsxs("div", { style: {
                            ...styles.stepCard,
                            ...(isActive ? styles.stepCardActive : {}),
                        }, onClick: () => setActiveStep(index), children: [_jsxs("div", { style: styles.stepHeader, children: [_jsx("div", { style: {
                                            ...styles.stepNumber,
                                            ...(isActive ? styles.stepNumberActive : {}),
                                            ...(isComplete ? styles.stepNumberComplete : {}),
                                        }, children: isComplete ? (_jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "3", children: _jsx("polyline", { points: "20 6 9 17 4 12" }) })) : (index + 1) }), _jsx("span", { style: styles.stepTitle, children: step.title })] }), isActive && (_jsxs(_Fragment, { children: [_jsx("p", { style: styles.stepDescription, children: step.description }), step.snippets.length > 1 && (_jsx("div", { style: styles.snippetTabs, children: step.snippets.map((snippet, sIndex) => (_jsx("button", { style: {
                                                ...styles.snippetTab,
                                                ...(sIndex === snippetIndex ? styles.snippetTabActive : {}),
                                            }, onClick: (e) => {
                                                e.stopPropagation();
                                                setActiveSnippet({ ...activeSnippet, [step.id]: sIndex });
                                            }, children: snippet.label }, snippet.label))) })), _jsxs("div", { style: styles.codeBlock, children: [_jsxs("div", { style: styles.codeHeader, children: [_jsx("span", { style: styles.codeLanguage, children: step.snippets[snippetIndex].language }), _jsx("button", { style: styles.copyButton, onClick: (e) => {
                                                            e.stopPropagation();
                                                            handleCopy(step.snippets[snippetIndex].code, step.id);
                                                        }, children: copiedCode === step.id ? (_jsxs(_Fragment, { children: [_jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("polyline", { points: "20 6 9 17 4 12" }) }), "Copied!"] })) : (_jsxs(_Fragment, { children: [_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("rect", { x: "9", y: "9", width: "13", height: "13", rx: "2", ry: "2" }), _jsx("path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" })] }), "Copy"] })) })] }), _jsx("pre", { style: styles.code, children: _jsx("code", { children: replaceKeys(step.snippets[snippetIndex].code) }) })] })] }))] }, step.id));
                }) }), _jsxs("div", { style: styles.navigation, children: [_jsxs("button", { style: { ...styles.navButton, ...styles.prevButton }, onClick: () => setActiveStep(Math.max(0, activeStep - 1)), disabled: activeStep === 0, children: [_jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("polyline", { points: "15 18 9 12 15 6" }) }), "Previous"] }), activeStep < steps.length - 1 ? (_jsxs("button", { style: { ...styles.navButton, ...styles.nextButton }, onClick: () => setActiveStep(activeStep + 1), children: ["Next", _jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("polyline", { points: "9 18 15 12 9 6" }) })] })) : (_jsxs("button", { style: { ...styles.navButton, ...styles.completeButton }, onClick: onComplete, children: [_jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("polyline", { points: "20 6 9 17 4 12" }) }), "Complete Setup"] }))] }), _jsxs("div", { style: styles.quickLinks, children: [_jsx("div", { style: styles.quickLinksTitle, children: "Quick Links" }), _jsxs("div", { style: styles.linkGrid, children: [_jsxs("a", { href: "#", style: styles.link, children: [_jsxs("svg", { style: styles.linkIcon, width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" }), _jsx("path", { d: "M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" })] }), "Documentation"] }), _jsxs("a", { href: "#", style: styles.link, children: [_jsx("svg", { style: styles.linkIcon, width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("path", { d: "M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" }) }), "GitHub"] }), _jsxs("a", { href: "#", style: styles.link, children: [_jsx("svg", { style: styles.linkIcon, width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" }) }), "Support"] })] })] })] }));
}
