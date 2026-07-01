'use client';

import { useChatClient, useConnectionState, useCurrentUser } from '@chatsdk/react';
import { useState } from 'react';

export default function MessagesPage() {
  const client = useChatClient();
  const currentUser = useCurrentUser();
  const connection = useConnectionState();
  const [peerUserId, setPeerUserId] = useState('');
  const [channelId, setChannelId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const openDm = async () => {
    setStatus(null);
    const response = await fetch('/api/chatsdk-dm/ensure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ peerUserId }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setStatus(data?.error?.message ?? 'Unable to open DM.');
      return;
    }

    const channel = data.channel;
    setChannelId(channel.id);
    setStatus(`Opened ${channel.cid}`);
  };

  const send = async () => {
    if (!channelId || !message.trim()) return;
    await client.sendMessage(channelId, { text: message.trim() });
    setMessage('');
    setStatus('Message sent.');
  };

  if (!currentUser) {
    return <main>Messaging is available after your account is eligible and connected.</main>;
  }

  return (
    <main>
      <h1>Messages</h1>
      <p>Connection: {connection.state}</p>

      <label>
        Peer user ID
        <input
          value={peerUserId}
          onChange={(event) => setPeerUserId(event.target.value)}
          placeholder="adult-test-user-id"
        />
      </label>
      <button type="button" onClick={openDm} disabled={!peerUserId.trim()}>
        Open DM
      </button>

      <label>
        Message
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Write a message"
        />
      </label>
      <button type="button" onClick={send} disabled={!channelId || !message.trim()}>
        Send
      </button>

      {status ? <p>{status}</p> : null}
    </main>
  );
}
