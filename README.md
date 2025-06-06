# synapticai_backend

SynapticAI is a backend service designed to power a personal productivity and learning assistant. It enables users to interact with web content, manage notes and tasks, and leverage AI capabilities for summarization, Q&A, and knowledge recall. The system features a robust API built with Hono, integrates with various AI models and services, and utilizes a PostgreSQL database with Drizzle ORM.

## Core Features

*   **AI-Powered Content Interaction**: Summarize websites and YouTube videos, ask questions about online content using voice or text.
*   **Knowledge Management**: Create, manage, and retrieve notes. Notes are vectorized for semantic search, enabling users to "chat with their knowledge base."
*   **Task Management**: Create and manage a TO-DO list with AI assistance.
*   **Voice Interaction**: Supports real-time Speech-to-Text (STT) and Text-to-Speech (TTS) for hands-free operation via WebSocket.
*   **User Authentication**: Secure user management using Clerk.
*   **Data Persistence**: Notes, tasks, and user data are stored in a PostgreSQL database, managed with Drizzle ORM.
*   **Semantic Search**: Find relevant notes based on natural language queries using vector embeddings.
*   **Background Processing**: Uses Redis for asynchronous job queuing (e.g., generating note embeddings).
*   **Agentic AI**: Employs Langchain/Langgraph to create AI agents capable of using various tools (e.g., web search, note retrieval, task creation).

## Tech Stack

*   **Runtime**: Bun
*   **Web Framework**: Hono
*   **Database**: PostgreSQL (specifically Neon serverless)
*   **ORM**: Drizzle ORM
*   **Authentication**: Clerk
*   **AI/LLM Orchestration**: Langchain, Langgraph
*   **AI Models**: OpenAI (GPT-4o-mini, GPT-4.1-nano, text-embedding-3-small)
*   **RAG/Vector Search**: LlamaIndex, pgvector extension for PostgreSQL
*   **Speech-to-Text (STT)**: Deepgram
*   **Text-to-Speech (TTS)**: ElevenLabs
*   **Caching & Job Queue**: Redis (ioredis)
*   **Web Scraping**: Puppeteer, Cheerio
*   **Language**: TypeScript

## Project Structure

The `src/` directory is organized as follows:

*   `config/`: Environment variable loading.
*   `controllers/`: HTTP request handlers and WebSocket controllers.
*   `db/`: Database schema (`schema.ts`, `vectordb_schema.ts`), migrations, and Drizzle ORM setup.
*   `middlewares/`: Custom middleware for authentication, session management, and usage metrics.
*   `repositories/`: Data access layer for interacting with the database.
*   `routes/`: API endpoint definitions using Hono.
*   `services/`: Core business logic, AI agent implementation (`agentGraph.ts`, `agentTools.ts`), integrations with external services (STT, TTS, AI Models), and Redis utilities.
*   `utils/`: Utility functions, custom error classes, API request/response models, and constants.
