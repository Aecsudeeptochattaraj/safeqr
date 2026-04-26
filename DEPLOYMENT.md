# MyParkSaathi Safety Grid - Deployment Guide

This application is ready for production deployment on **Vercel**.

## One-Click Deployment Requirements

1. **Connect to GitHub**: Use the "Export to GitHub" feature in AI Studio to move this code to your own repository.
2. **Import to Vercel**: Login to [Vercel](https://vercel.com) and import the repository.
3. **Framework Detection**: Vercel will automatically detect **Vite** as the framework.

## Environment Variables

During the Vercel import process, you MUST add these environment variables in the "Environment Variables" section:

| Variable | Value | Description |
|----------|-------|-------------|
| `GEMINI_API_KEY` | `YOUR_KEY` | Obtained from [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `VITE_APP_URL` | `https://your-app.vercel.app` | Your final Vercel URL (important for QR generation) |

## 🚨 IMPORTANT: Authorize your Vercel Domain

Your login will fail with `auth/unauthorized-domain` until you follow these steps:

1. Go to the **[Firebase Console](https://console.firebase.google.com/)**.
2. Select your project.
3. Go to **Authentication** > **Settings** > **Authorized Domains**.
4. Click **"Add Domain"**.
5. Type in your Vercel domain (e.g., `your-app-name.vercel.app`).
6. Click **Add**.

*Until you do this, Firebase will block all login attempts from your live Vercel site for security reasons.*

## Application Structure

- **Frontend**: React (Vite) hosted on Vercel.
- **Backend/DB**: Firebase Firestore (Your existing project).
- **Routing**: Handled by `vercel.json` to ensure scan links (`/s/:id`) work after page refresh.

## Troubleshooting Scan Links
If your scan links show 404, double-check that `vercel.json` is at the root of your project. This file handles the single-page routing logic.
