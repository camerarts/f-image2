# Deployment Guide

This project is separated into two parts:
1. **Worker**: A Cloudflare Worker acting as a proxy.
2. **Frontend**: A React app hosted on Cloudflare Pages.

## Part 1: Deploying the Worker (Backend)

1.  Create a folder `z-image-worker`.
2.  Inside, place the content of `worker/index.ts`.
3.  Create a `wrangler.toml` file in that folder:
    ```toml
    name = "z-image-api"
    main = "index.ts"
    compatibility_date = "2023-10-02"

    [vars]
    COMFY_BASE_URL = "https://6b0e6e3093754fb58d058666bf26ffb1--8188.ap-shanghai2.cloudstudio.club/"
    ```
4.  Run `npx wrangler deploy`.
5.  **Important:** Wrangler will output a URL (e.g., `https://z-image-api.yourname.workers.dev`). Copy this URL.

## Part 2: Configuring Frontend

1.  Open `constants.ts` in the frontend source code.
2.  Replace `WORKER_API_URL` with the URL you copied in the previous step.
    ```typescript
    export const WORKER_API_URL = 'https://z-image-api.yourname.workers.dev';
    ```

## Part 3: Deploying Frontend (Cloudflare Pages)

1.  Push the frontend code to a GitHub repository.
2.  Go to Cloudflare Dashboard > Pages > Connect to Git.
3.  Select your repository.
4.  Build settings:
    *   **Framework:** Create React App (or generic Node)
    *   **Build command:** `npm run build` (or `tsc && vite build` if using Vite)
    *   **Output directory:** `build` (or `dist`)
5.  Click "Save and Deploy".

## Usage
Once deployed, open your Cloudflare Pages URL.
1. Enter a prompt.
2. Click Generate.
3. The request goes to your Worker -> ComfyUI -> Back to you.
