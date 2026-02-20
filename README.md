# Screen Time Dashboard

A serverless screen time analytics dashboard built with React and AWS Lambda.

## Features

- Upload JSON and Parquet files containing screen time data
- Visualize screen time with interactive charts
- View top apps, daily trends, and usage distribution
- Serverless architecture using AWS Lambda, API Gateway, and S3

## Setup

### Backend

1. Install dependencies:

```bash
cd backend
npm install
```

2. Deploy to AWS:

```bash
npm run deploy
```

3. Note the API Gateway URL from the deployment output

### Frontend

1. Install dependencies:

```bash
npm install
```

2. Create `.env` file:

```bash
cp .env.example .env
```

3. Update `VITE_API_URL` in `.env` with your API Gateway URL

4. Run development server:

```bash
npm run dev
```

5. Build for production:

```bash
npm run build
```

## Data Format

Your JSON/Parquet files should contain screen time data with fields like:

```json
[
  {
    "app": "Chrome",
    "time": 120,
    "date": "2024-01-15"
  },
  {
    "app": "Slack",
    "time": 45,
    "date": "2024-01-15"
  }
]
```

Supported field names:

- App: `app`, `application`, `name`
- Time: `time`, `duration`, `screenTime` (in minutes)
- Date: `date`, `timestamp`

## Tech Stack

- Frontend: React, Vite, Recharts
- Backend: Node.js, AWS Lambda, Serverless Framework
- Storage: AWS S3
- API: AWS API Gateway
