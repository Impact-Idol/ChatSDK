# ChatSDK Next.js App

A real-time chat application built with [ChatSDK](https://github.com/chatsdk/chatsdk) and [Next.js](https://nextjs.org/).

## Quick Start

1. **Start Docker services** (if not already running):
   ```bash
   docker compose up -d
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Open the app**:
   - Alice: [http://localhost:3000?user=alice](http://localhost:3000?user=alice)
   - Bob: [http://localhost:3000?user=bob](http://localhost:3000?user=bob)

5. **Send messages** between tabs and see real-time updates! 💬

## What's Included

- ✅ Next.js 14+ with App Router
- ✅ TypeScript
- ✅ Tailwind CSS for styling
- ✅ ChatSDK integration
- ✅ Real-time messaging
- ✅ Docker setup for backend services
- ✅ Development mode (zero config)

## Project Structure

```
├── app/
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Home page with chat UI
│   └── globals.css      # Global styles
├── components/
│   └── chat/            # Chat components (add your own)
├── lib/
│   └── chatsdk.ts       # ChatSDK client setup
├── public/              # Static assets
├── docker-compose.yml   # Backend services
└── .env.local          # Environment variables
```

## Environment Variables

All variables are pre-configured in `.env.local` for development.

For production, update:
```bash
NEXT_PUBLIC_CHATSDK_API_KEY=your-production-api-key
NEXT_PUBLIC_CHATSDK_API_URL=https://your-api-url.com
NEXT_PUBLIC_CHATSDK_WS_URL=wss://your-ws-url.com
```

## Customization

### Change UI Colors

Edit `app/page.tsx`:
```tsx
// Change message bubble colors
<div className="bg-purple-500 text-white rounded-lg">
  {message.text}
</div>
```

### Add More Features

```tsx
import { ChatSDK } from '@chatsdk/core';

// Send reactions
await client.addReaction({ messageId: '123', reaction: '👍' });

// Upload files
await client.uploadFile({ file: myFile });

// Search messages
const results = await client.searchMessages({ query: 'hello' });
```

## Deployment

Deploy to Vercel in one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/chatsdk/examples)

Or deploy anywhere that supports Next.js:
- [Netlify](https://www.netlify.com/)
- [AWS Amplify](https://aws.amazon.com/amplify/)
- [Railway](https://railway.app/)

## Learn More

- [ChatSDK Documentation](https://docs.chatsdk.dev)
- [ChatSDK Examples](https://github.com/chatsdk/examples)
- [Next.js Documentation](https://nextjs.org/docs)
- [API Reference](https://docs.chatsdk.dev/api)

## Support

- 💬 [Discord Community](https://discord.gg/chatsdk)
- 🐛 [GitHub Issues](https://github.com/chatsdk/chatsdk/issues)
- 📧 [Email Support](mailto:support@chatsdk.dev)

---

**Built with ❤️ using ChatSDK**
