import { ComfyWorkflow, PromptResponse, HistoryResponse } from '../types';
import { WORKER_API_URL } from '../constants';

const POLLING_INTERVAL = 1000; // 1 second
const MAX_RETRIES = 120; // 120 seconds total

export class ComfyService {
  /**
   * Checks if the backend is reachable
   */
  static async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${WORKER_API_URL}/api/health`);
      const data = await res.json();
      return data.ok;
    } catch (e) {
      console.error("Health check failed:", e);
      return false;
    }
  }

  /**
   * Submits a prompt to the Worker
   */
  static async queuePrompt(workflow: ComfyWorkflow): Promise<string> {
    const clientId = Math.random().toString(36).substring(7);
    
    const payload = {
      prompt: workflow,
      client_id: clientId,
    };

    const res = await fetch(`${WORKER_API_URL}/api/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`提交任务失败: ${res.statusText}`);
    }

    const data: PromptResponse = await res.json();
    return data.prompt_id;
  }

  /**
   * Polls for the image result
   */
  static async pollHistory(promptId: string): Promise<{ filename: string; subfolder: string; type: string }> {
    let attempts = 0;

    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        attempts++;
        if (attempts > MAX_RETRIES) {
          clearInterval(interval);
          reject(new Error('生成超时，请重试。'));
          return;
        }

        try {
          const res = await fetch(`${WORKER_API_URL}/api/history/${promptId}`);
          if (!res.ok) return; // Wait for next tick

          const data: HistoryResponse = await res.json();
          const historyItem = data[promptId];

          if (historyItem && historyItem.outputs) {
            // Find the first output with images
            for (const nodeId of Object.keys(historyItem.outputs)) {
              const nodeOutput = historyItem.outputs[nodeId];
              if (nodeOutput.images && nodeOutput.images.length > 0) {
                clearInterval(interval);
                resolve(nodeOutput.images[0]);
                return;
              }
            }
          }
        } catch (e) {
          // Ignore transient network errors during polling
          console.warn('Polling error:', e);
        }
      }, POLLING_INTERVAL);
    });
  }

  /**
   * Fetches the actual image blob
   */
  static async downloadImage(filename: string, subfolder: string, type: string): Promise<Blob> {
    const query = new URLSearchParams({ filename, subfolder, type });
    const res = await fetch(`${WORKER_API_URL}/api/view?${query.toString()}`);
    
    if (!res.ok) {
      throw new Error('下载图片数据失败');
    }

    return await res.blob();
  }
}