# AskDB Frontend

This is the React frontend for the AskDB application - a natural language to SQL query system.

## Features

- User authentication (login/signup)
- Chat interface for database queries
- Conversation history
- Real-time communication with backend API

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## Environment Configuration

The frontend is configured to connect to the backend API at `http://localhost:3000` by default. This can be changed by setting the `VITE_API_BASE_URL` environment variable.

## Backend Connection

Make sure the AskDB backend is running on port 3000 before starting the frontend. The backend should be started from the `AskDB-Backend` directory:

```bash
cd ../AskDB-Backend
npm start
```

## Authentication

The frontend uses JWT tokens for authentication. Tokens are stored in localStorage and automatically included in API requests.

## API Integration

The frontend communicates with the backend through the following endpoints:
- `/users/login` - User login
- `/users/register` - User registration
- `/chat` - Send chat messages
- `/chat/conversations` - Get conversation history
- `/chat/history/:id` - Get specific conversation

## Development

The application uses:
- React 18
- Vite for build tooling
- React Router for navigation
- Axios for HTTP requests
- Context API for state management