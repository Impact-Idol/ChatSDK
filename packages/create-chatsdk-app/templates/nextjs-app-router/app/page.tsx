'use client';

import { useState, useEffect } from 'react';
import { ChatSDK } from '@chatsdk/core';
import { MessageCircle, Send } from 'lucide-react';

export default function Home() {
  const [client, setClient] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    // Get user from URL query params (for demo)
    const params = new URLSearchParams(window.location.search);
    const user = params.get('user') || 'alice';
    setUserId(user);

    // Connect to ChatSDK
    async function connect() {
      try {
        const chatClient = await ChatSDK.connectDevelopment({
          userId: user,
          displayName: user === 'alice' ? 'Alice Johnson' : 'Bob Smith',
          apiUrl: process.env.NEXT_PUBLIC_CHATSDK_API_URL || 'http://localhost:5500',
          wsUrl: process.env.NEXT_PUBLIC_CHATSDK_WS_URL || 'ws://localhost:8001/connection/websocket',
          debug: true,
        });

        setClient(chatClient);

        // Listen for new messages
        chatClient.on('message.new', (message: any) => {
          setMessages((prev) => [...prev, message]);
        });

        // Get or create general channel
        let channel;
        try {
          const channels = await chatClient.getChannels();
          channel = channels.find((c: any) => c.id === 'general');

          if (!channel) {
            channel = await chatClient.createChannel({
              type: 'messaging',
              id: 'general',
              name: 'General',
            });
          }
        } catch (err) {
          console.error('Channel error:', err);
        }

        setLoading(false);
      } catch (error) {
        console.error('Connection error:', error);
        setLoading(false);
      }
    }

    connect();
  }, []);

  const sendMessage = async () => {
    if (!inputText.trim() || !client) return;

    try {
      await client.sendMessage({
        channelId: 'general',
        text: inputText,
      });
      setInputText('');
    } catch (error) {
      console.error('Send error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <MessageCircle className="w-12 h-12 mx-auto mb-4 text-blue-500 animate-pulse" />
          <p className="text-gray-600">Connecting to ChatSDK...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">ChatSDK Demo</h1>
        <p className="text-sm text-gray-600">
          Logged in as: <span className="font-semibold">{userId}</span>
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>No messages yet. Send one to get started!</p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.user?.id === userId ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.user?.id === userId
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-900 border'
              }`}
            >
              <p className="text-sm font-semibold mb-1">
                {message.user?.displayName || message.user?.id || 'Unknown'}
              </p>
              <p>{message.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="bg-white border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={sendMessage}
            disabled={!inputText.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          💡 Tip: Open this page in another tab with ?user=bob to chat between users
        </p>
      </div>
    </div>
  );
}
