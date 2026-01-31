import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { clsx } from 'clsx';
export const AuthLayout = ({ children, title, subtitle, logo, appName = 'ChatSDK', variant = 'split', backgroundImage, testimonial, }) => {
    return (_jsxs("div", { className: clsx('chatsdk-auth-layout', `chatsdk-auth-${variant}`), children: [variant === 'split' && (_jsx("div", { className: "chatsdk-auth-branding", style: backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : undefined, children: _jsxs("div", { className: "chatsdk-auth-branding-content", children: [_jsxs("div", { className: "chatsdk-auth-logo-section", children: [logo || (_jsx("svg", { viewBox: "0 0 24 24", fill: "currentColor", className: "chatsdk-auth-default-logo", children: _jsx("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" }) })), _jsx("span", { className: "chatsdk-auth-app-name", children: appName })] }), testimonial && (_jsxs("div", { className: "chatsdk-auth-testimonial", children: [_jsxs("blockquote", { className: "chatsdk-testimonial-quote", children: ["\"", testimonial.quote, "\""] }), _jsxs("div", { className: "chatsdk-testimonial-author", children: [testimonial.avatar && (_jsx("img", { src: testimonial.avatar, alt: testimonial.author, className: "chatsdk-testimonial-avatar" })), _jsxs("div", { children: [_jsx("span", { className: "chatsdk-testimonial-name", children: testimonial.author }), _jsx("span", { className: "chatsdk-testimonial-role", children: testimonial.role })] })] })] })), _jsxs("div", { className: "chatsdk-auth-features", children: [_jsxs("div", { className: "chatsdk-auth-feature", children: [_jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("polyline", { points: "20 6 9 17 4 12" }) }), _jsx("span", { children: "Real-time messaging at scale" })] }), _jsxs("div", { className: "chatsdk-auth-feature", children: [_jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("polyline", { points: "20 6 9 17 4 12" }) }), _jsx("span", { children: "End-to-end encryption" })] }), _jsxs("div", { className: "chatsdk-auth-feature", children: [_jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("polyline", { points: "20 6 9 17 4 12" }) }), _jsx("span", { children: "SOC 2 & HIPAA compliant" })] })] })] }) })), _jsxs("div", { className: "chatsdk-auth-form-container", children: [_jsxs("div", { className: "chatsdk-auth-form-wrapper", children: [variant === 'centered' && (_jsx("div", { className: "chatsdk-auth-centered-logo", children: logo || (_jsx("svg", { viewBox: "0 0 24 24", fill: "currentColor", className: "chatsdk-auth-default-logo", children: _jsx("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" }) })) })), _jsxs("div", { className: "chatsdk-auth-header", children: [_jsx("h1", { className: "chatsdk-auth-title", children: title }), subtitle && _jsx("p", { className: "chatsdk-auth-subtitle", children: subtitle })] }), _jsx("div", { className: "chatsdk-auth-form-content", children: children })] }), _jsxs("div", { className: "chatsdk-auth-footer", children: [_jsxs("span", { children: ["\u00A9 2025 ", appName, ". All rights reserved."] }), _jsxs("div", { className: "chatsdk-auth-footer-links", children: [_jsx("a", { href: "#", children: "Privacy" }), _jsx("a", { href: "#", children: "Terms" }), _jsx("a", { href: "#", children: "Support" })] })] })] }), _jsx("style", { children: `
        .chatsdk-auth-layout {
          min-height: 100vh;
          display: flex;
          background: var(--chatsdk-background);
        }

        .chatsdk-auth-split {
          flex-direction: row;
        }

        .chatsdk-auth-centered {
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .chatsdk-auth-branding {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--chatsdk-space-8);
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          position: relative;
          overflow: hidden;
        }

        .chatsdk-auth-branding::before {
          content: '';
          position: absolute;
          inset: 0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }

        .chatsdk-auth-branding-content {
          position: relative;
          z-index: 1;
          color: white;
          max-width: 480px;
        }

        .chatsdk-auth-logo-section {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-3);
          margin-bottom: var(--chatsdk-space-8);
        }

        .chatsdk-auth-default-logo {
          width: 48px;
          height: 48px;
        }

        .chatsdk-auth-centered .chatsdk-auth-default-logo {
          width: 64px;
          height: 64px;
          color: var(--chatsdk-primary);
        }

        .chatsdk-auth-app-name {
          font-size: var(--chatsdk-text-2xl);
          font-weight: 700;
        }

        .chatsdk-auth-testimonial {
          margin-bottom: var(--chatsdk-space-8);
        }

        .chatsdk-testimonial-quote {
          font-size: var(--chatsdk-text-xl);
          font-weight: 500;
          line-height: 1.6;
          margin: 0 0 var(--chatsdk-space-4);
        }

        .chatsdk-testimonial-author {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-3);
        }

        .chatsdk-testimonial-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.3);
        }

        .chatsdk-testimonial-name {
          display: block;
          font-weight: 600;
        }

        .chatsdk-testimonial-role {
          display: block;
          font-size: var(--chatsdk-text-sm);
          opacity: 0.8;
        }

        .chatsdk-auth-features {
          display: flex;
          flex-direction: column;
          gap: var(--chatsdk-space-3);
        }

        .chatsdk-auth-feature {
          display: flex;
          align-items: center;
          gap: var(--chatsdk-space-2);
          font-size: var(--chatsdk-text-sm);
          opacity: 0.9;
        }

        .chatsdk-auth-feature svg {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
        }

        .chatsdk-auth-form-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--chatsdk-space-8);
        }

        .chatsdk-auth-centered .chatsdk-auth-form-container {
          max-width: 420px;
          width: 100%;
        }

        .chatsdk-auth-form-wrapper {
          width: 100%;
          max-width: 400px;
        }

        .chatsdk-auth-centered-logo {
          display: flex;
          justify-content: center;
          margin-bottom: var(--chatsdk-space-6);
        }

        .chatsdk-auth-header {
          text-align: center;
          margin-bottom: var(--chatsdk-space-6);
        }

        .chatsdk-auth-title {
          margin: 0;
          font-size: var(--chatsdk-text-2xl);
          font-weight: 700;
          color: var(--chatsdk-foreground);
        }

        .chatsdk-auth-subtitle {
          margin: var(--chatsdk-space-2) 0 0;
          font-size: var(--chatsdk-text-sm);
          color: var(--chatsdk-muted-foreground);
        }

        .chatsdk-auth-form-content {
          width: 100%;
        }

        .chatsdk-auth-footer {
          position: absolute;
          bottom: var(--chatsdk-space-6);
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--chatsdk-space-2);
          font-size: var(--chatsdk-text-xs);
          color: var(--chatsdk-muted-foreground);
        }

        .chatsdk-auth-footer-links {
          display: flex;
          gap: var(--chatsdk-space-4);
        }

        .chatsdk-auth-footer-links a {
          color: var(--chatsdk-muted-foreground);
          text-decoration: none;
        }

        .chatsdk-auth-footer-links a:hover {
          color: var(--chatsdk-primary);
        }

        @media (max-width: 1024px) {
          .chatsdk-auth-split {
            flex-direction: column;
          }

          .chatsdk-auth-branding {
            padding: var(--chatsdk-space-6);
            min-height: auto;
          }

          .chatsdk-auth-testimonial {
            display: none;
          }
        }
      ` })] }));
};
export default AuthLayout;
