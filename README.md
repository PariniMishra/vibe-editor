This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).


# Vibe Editor

A browser-based coding playground with file management, terminal support, project templates, and AI-powered code completion — all in one interface.

---

## What this project demonstrates

- Building a full-stack web application with Next.js 15 App Router and TypeScript
- Integrating WebContainers (via WebContainerX) to run a real Node.js environment inside the browser
- Embedding a terminal emulator (Xterm.js) connected to a live in-browser shell
- Implementing AI-powered code completion using Ollama (local LLM inference)
- Designing a file tree and editor layout with a professional IDE-like experience
- Authentication with Auth.js (OAuth) and role-based access control
- Persisting user data, projects, and settings with Prisma ORM + MongoDB

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | MongoDB |
| ORM | Prisma |
| Auth | Auth.js (NextAuth v5) |
| In-browser runtime | WebContainerX |
| Terminal | Xterm.js |
| AI / LLM | Ollama (local inference) |

---

## Features

- **File manager** — create, rename, delete files and folders inside a project
- **Code editor** — syntax-highlighted editing in the browser
- **Integrated terminal** — real shell powered by WebContainers, rendered via Xterm.js
- **Project templates** — scaffold new projects from predefined starter templates
- **AI code completion** — context-aware suggestions powered by a locally running Ollama model
- **Authentication** — sign in with OAuth; role-based access (USER / PREMIUM_USER / ADMIN)
- **Persistent projects** — projects and files saved to MongoDB via Prisma

---

## Getting started

### Prerequisites

- Node.js 18+
- MongoDB instance (local or Atlas)
- Ollama installed and running locally

### Setup

```bash
git clone https://github.com/your-username/vibe-editor.git
cd vibe-editor
npm install
```

Create a `.env` file:

```env
DATABASE_URL=mongodb+srv://:@cluster0.xxxxx.mongodb.net/vibe-editor?appName=Cluster0
AUTH_SECRET=your-auth-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

Push the Prisma schema to your database:

```bash
npx prisma db push
npx prisma generate
```

Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Data models

### User
Stores authenticated users. Each user has a role (`USER`, `PREMIUM_USER`, `ADMIN`) defaulting to `USER`.

### Account
Stores OAuth provider tokens linked to a user (created automatically by Auth.js on sign-in). Cascades on user deletion.

---

## Project structure

```
/app          → Next.js App Router pages and layouts
/components   → UI components (shadcn/ui + custom)
/lib          → Prisma client, Auth.js config, utilities
/prisma       → schema.prisma
/public       → static assets
```

---

## Notes

- WebContainers require a cross-origin isolated environment. Ensure your server sets the `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers.
- Ollama must be running locally on port 11434 for AI completion to work.
- Prisma + MongoDB requires `@db.ObjectId` on all ID fields — see `schema.prisma`.


## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
