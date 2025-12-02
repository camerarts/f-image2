/**
 * Cloudflare Worker for ComfyUI Proxy
 * 
 * Environment Variables required in Cloudflare Dashboard:
 * - COMFY_BASE_URL: The public URL of your ComfyUI instance (e.g., https://...cloudstudio.club/)
 */

export interface Env {
  COMFY_BASE_URL: string;
}

// Fix: Define ExecutionContext interface locally as it's missing from the environment types
export interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // 1. Handle Preflight OPTIONS
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Ensure COMFY_BASE_URL is set
    if (!env.COMFY_BASE_URL) {
      return new Response(JSON.stringify({ error: 'COMFY_BASE_URL not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Clean base URL (remove trailing slash)
    const baseUrl = env.COMFY_BASE_URL.replace(/\/$/, '');

    try {
      // 2. GET /api/health
      if (url.pathname === '/api/health' && request.method === 'GET') {
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // 3. POST /api/prompt
      if (url.pathname === '/api/prompt' && request.method === 'POST') {
        const upstreamUrl = `${baseUrl}/prompt`;
        const body = await request.json();
        
        const upstreamResponse = await fetch(upstreamUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const data = await upstreamResponse.json();
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // 4. GET /api/history/{prompt_id}
      if (url.pathname.startsWith('/api/history/') && request.method === 'GET') {
        const promptId = url.pathname.split('/').pop();
        const upstreamUrl = `${baseUrl}/history/${promptId}`;
        
        const upstreamResponse = await fetch(upstreamUrl);
        const data = await upstreamResponse.json();
        
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // 5. GET /api/view
      if (url.pathname === '/api/view' && request.method === 'GET') {
        const filename = url.searchParams.get('filename');
        const subfolder = url.searchParams.get('subfolder') || '';
        const type = url.searchParams.get('type') || 'output';

        if (!filename) {
            return new Response('Missing filename', { status: 400, headers: corsHeaders });
        }

        const queryParams = new URLSearchParams({ filename, subfolder, type });
        const upstreamUrl = `${baseUrl}/view?${queryParams.toString()}`;

        const upstreamResponse = await fetch(upstreamUrl);
        const imageBlob = await upstreamResponse.blob();

        return new Response(imageBlob, {
          headers: {
            'Content-Type': upstreamResponse.headers.get('Content-Type') || 'image/png',
            ...corsHeaders
          }
        });
      }

      // 404
      return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });

    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  },
};