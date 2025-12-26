import React, { useEffect, useState } from 'react';

export interface TypingUser {
  id: string;
  name: string;
  imageUrl?: string;
}

export interface TypingIndicatorProps {
  users: TypingUser[];
  maxDisplayUsers?: number;
  variant?: 'inline' | 'bubble' | 'minimal';
  showAvatars?: boolean;
  animationStyle?: 'dots' | 'wave' | 'pulse';
}

export function TypingIndicator({
  users,
  maxDisplayUsers = 3,
  variant = 'inline',
  showAvatars = true,
  animationStyle = 'dots',
}: TypingIndicatorProps) {
  const [dotIndex, setDotIndex] = useState(0);

  useEffect(() => {
    if (users.length === 0) return;

    const interval = setInterval(() => {
      setDotIndex((prev) => (prev + 1) % 3);
    }, 400);

    return () => clearInterval(interval);
  }, [users.length]);

  if (users.length === 0) return null;

  const displayUsers = users.slice(0, maxDisplayUsers);
  const remainingCount = users.length - maxDisplayUsers;

  const getTypingText = () => {
    if (users.length === 1) {
      return `${users[0].name} is typing`;
    } else if (users.length === 2) {
      return `${users[0].name} and ${users[1].name} are typing`;
    } else if (users.length === 3 && maxDisplayUsers >= 3) {
      return `${users[0].name}, ${users[1].name}, and ${users[2].name} are typing`;
    } else if (users.length > maxDisplayUsers) {
      const names = displayUsers.map(u => u.name).join(', ');
      return `${names} and ${remainingCount} ${remainingCount === 1 ? 'other' : 'others'} are typing`;
    }
    return `${displayUsers.map(u => u.name).join(', ')} are typing`;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const styles: Record<string, React.CSSProperties> = {
    // Inline variant (default)
    inlineContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      fontSize: '13px',
      color: 'var(--chatsdk-text-secondary, #6b7280)',
    },
    avatarGroup: {
      display: 'flex',
      alignItems: 'center',
    },
    avatar: {
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#ffffff',
      fontSize: '10px',
      fontWeight: 600,
      border: '2px solid var(--chatsdk-bg-primary, #ffffff)',
      marginLeft: '-8px',
    },
    avatarFirst: {
      marginLeft: '0',
    },
    text: {
      fontStyle: 'italic',
    },

    // Bubble variant
    bubbleContainer: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '12px 16px',
      backgroundColor: 'var(--chatsdk-bg-secondary, #f3f4f6)',
      borderRadius: '18px',
      maxWidth: 'fit-content',
    },
    bubbleAvatars: {
      display: 'flex',
      alignItems: 'center',
    },
    bubbleContent: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },

    // Minimal variant
    minimalContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 8px',
      fontSize: '12px',
      color: 'var(--chatsdk-text-tertiary, #9ca3af)',
    },

    // Dots animation
    dotsContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '3px',
      height: '16px',
    },
    dot: {
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      backgroundColor: 'var(--chatsdk-text-tertiary, #9ca3af)',
      transition: 'transform 0.2s ease, opacity 0.2s ease',
    },
    dotActive: {
      transform: 'translateY(-4px)',
      opacity: 1,
    },
    dotInactive: {
      transform: 'translateY(0)',
      opacity: 0.5,
    },

    // Wave animation
    waveContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '2px',
      height: '16px',
    },
    waveBar: {
      width: '3px',
      borderRadius: '2px',
      backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
      animation: 'wave 1.2s ease-in-out infinite',
    },

    // Pulse animation
    pulseContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '24px',
      height: '16px',
    },
    pulseCircle: {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: 'var(--chatsdk-accent-color, #6366f1)',
      animation: 'pulse-typing 1.5s ease-in-out infinite',
    },
  };

  const renderAvatar = (user: TypingUser, index: number) => {
    const style = {
      ...styles.avatar,
      ...(index === 0 ? styles.avatarFirst : {}),
      zIndex: displayUsers.length - index,
    };

    if (user.imageUrl) {
      return (
        <img
          key={user.id}
          src={user.imageUrl}
          alt={user.name}
          style={{ ...style, objectFit: 'cover' as const }}
        />
      );
    }

    return (
      <div key={user.id} style={style}>
        {getInitials(user.name)}
      </div>
    );
  };

  const renderAnimation = () => {
    switch (animationStyle) {
      case 'dots':
        return (
          <div style={styles.dotsContainer}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  ...styles.dot,
                  ...(i === dotIndex ? styles.dotActive : styles.dotInactive),
                }}
              />
            ))}
          </div>
        );

      case 'wave':
        return (
          <div style={styles.waveContainer}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  ...styles.waveBar,
                  height: `${8 + Math.sin((Date.now() / 200 + i * 0.5) % (Math.PI * 2)) * 6}px`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        );

      case 'pulse':
        return (
          <div style={styles.pulseContainer}>
            <div style={styles.pulseCircle} />
          </div>
        );

      default:
        return null;
    }
  };

  // Inject keyframes for animations
  useEffect(() => {
    const styleId = 'chatsdk-typing-indicator-styles';
    if (!document.getElementById(styleId)) {
      const styleSheet = document.createElement('style');
      styleSheet.id = styleId;
      styleSheet.textContent = `
        @keyframes wave {
          0%, 100% { height: 8px; }
          50% { height: 16px; }
        }
        @keyframes pulse-typing {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
        }
      `;
      document.head.appendChild(styleSheet);
    }
  }, []);

  if (variant === 'bubble') {
    return (
      <div style={styles.bubbleContainer}>
        {showAvatars && (
          <div style={styles.bubbleAvatars}>
            {displayUsers.map((user, i) => renderAvatar(user, i))}
          </div>
        )}
        <div style={styles.bubbleContent}>
          {renderAnimation()}
        </div>
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div style={styles.minimalContainer}>
        {renderAnimation()}
        <span style={styles.text}>{users.length === 1 ? 'typing' : `${users.length} typing`}</span>
      </div>
    );
  }

  // Default inline variant
  return (
    <div style={styles.inlineContainer}>
      {showAvatars && (
        <div style={styles.avatarGroup}>
          {displayUsers.map((user, i) => renderAvatar(user, i))}
        </div>
      )}
      <span style={styles.text}>{getTypingText()}</span>
      {renderAnimation()}
    </div>
  );
}
