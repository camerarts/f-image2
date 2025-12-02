import { ComfyWorkflow, PromptResponse, HistoryResponse } from '../types';
import { WORKER_API_URL } from '../constants';

const POLLING_INTERVAL = 1000; // 1 second
const MAX_RETRIES = 60; // 60 seconds (as requested in prompt)

type LogFunction = (msg: string) => void;

export class ComfyService {
  /**
   * Checks if the backend is reachable
   */
  static async checkHealth(log?: LogFunction): Promise<boolean> {
    const targetUrl = `${WORKER_API_URL}/api/health`;
    
    if (log) {
      log(`[Health] 配置 Base URL: ${WORKER_API_URL}`);
      log(`[Health] 完整请求地址: ${targetUrl}`);
    }

    try {
      const res = await fetch(targetUrl);
      if (log) log(`[Health] HTTP 状态码: ${res.status}`);
      
      if (!res.ok) {
        const text = await res.text();
        if (log) log(`[Health] 错误响应体: ${text}`);
        return false;
      }
      
      const data = await res.json();
      if (log) log(`[Health] 响应 JSON: ${JSON.stringify(data)}`);
      return data.ok;
    } catch (e: any) {
      console.error("Health check failed:", e);
      if (log) log(`[Health] 请求抛出异常 (Fetch Error): ${e.message}`);
      return false;
    }
  }

  /**
   * Submits a prompt to the Worker
   */
  static async queuePrompt(workflow: ComfyWorkflow, log: LogFunction): Promise<string> {
    const clientId = Math.random().toString(36).substring(7);
    const targetUrl = `${WORKER_API_URL}/api/prompt`;
    
    const payload = {
      prompt: workflow,
      client_id: clientId,
    };

    log(`[Prompt] 准备提交。配置 Base URL: ${WORKER_API_URL}`);
    log(`[Prompt] 完整请求地址: ${targetUrl}`);
    log(`[Prompt] Client ID: ${clientId}`);
    
    let res: Response;
    try {
      res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (e: any) {
      log(`[Prompt] 网络请求异常 (Fetch Failed): ${e.message}`);
      throw e;
    }

    if (!res.ok) {
      const text = await res.text();
      log(`[Prompt] API 返回错误: Status ${res.status}, Body: ${text}`);
      throw new Error(`提交任务失败: ${res.statusText}`);
    }

    const data: PromptResponse = await res.json();
    log(`[Prompt] 提交成功. 返回 JSON: ${JSON.stringify(data)}`);
    
    if (!data.prompt_id) {
        log(`[Prompt] 严重错误: 返回数据中没有 prompt_id!`);
        throw new Error('未获取到 prompt_id');
    }

    return data.prompt_id;
  }

  /**
   * Polls for the image result
   */
  static async pollHistory(promptId: string, log: LogFunction): Promise<{ filename: string; subfolder: string; type: string }> {
    let attempts = 0;
    const targetUrl = `${WORKER_API_URL}/api/history/${promptId}`;
    
    log(`[Polling] 开始轮询。Base URL: ${WORKER_API_URL}`);
    log(`[Polling] 完整请求地址: ${targetUrl}`);

    while (attempts < MAX_RETRIES) {
      attempts++;
      // Wait for interval (except first run)
      if (attempts > 1) {
          await new Promise(r => setTimeout(r, POLLING_INTERVAL));
      }

      try {
        const res = await fetch(targetUrl);
        if (!res.ok) {
           const text = await res.text();
           log(`[Polling #${attempts}] 失败: Status ${res.status}, Body: ${text}`);
           continue; // Retry
        }

        const data: HistoryResponse = await res.json();
        const historyItem = data[promptId];

        if (!historyItem) {
           log(`[Polling #${attempts}] HistoryItem 未找到 (任务可能还在排队)`);
           continue;
        }

        // Check outputs
        const hasOutputs = !!historyItem.outputs;
        const outputKeys = hasOutputs ? Object.keys(historyItem.outputs) : [];
        
        // Check for error in status
        if (historyItem.status && (historyItem.status as any).error) {
            log(`[Polling #${attempts}] 检测到错误: ${JSON.stringify((historyItem.status as any).error)}`);
        }

        log(`[Polling #${attempts}] 获取成功. Outputs: ${hasOutputs ? '有' : '无'}, Keys: [${outputKeys.join(', ')}]`);

        if (hasOutputs) {
          // Find the first output with images
          for (const nodeId of Object.keys(historyItem.outputs)) {
            const nodeOutput = historyItem.outputs[nodeId];
            if (nodeOutput.images && nodeOutput.images.length > 0) {
              log(`[Polling #${attempts}] 找到图片! Node: ${nodeId}, Images: ${JSON.stringify(nodeOutput.images)}`);
              return nodeOutput.images[0];
            }
          }
          log(`[Polling #${attempts}] 有 outputs 但没有 images 数组。内容: ${JSON.stringify(historyItem.outputs)}`);
        } else {
             // Check if it's finished but failed
             if (historyItem.status?.completed) {
                 log(`[Polling #${attempts}] 任务标记为已完成，但无 output。完整 JSON: ${JSON.stringify(historyItem)}`);
             }
        }
        
        // Check timeout condition inside loop to log final state
        if (attempts >= MAX_RETRIES) {
            log(`[Timeout] 超过 ${MAX_RETRIES} 次轮询仍未出图。最后一次完整 History JSON:`);
            log(JSON.stringify(data, null, 2));
        }

      } catch (e: any) {
        log(`[Polling #${attempts}] 轮询发生异常: ${e.message}`);
      }
    }

    throw new Error('生成超时，请检查下方日志详情。');
  }

  /**
   * Fetches the actual image blob
   */
  static async downloadImage(filename: string, subfolder: string, type: string, log: LogFunction): Promise<Blob> {
    const query = new URLSearchParams({ filename, subfolder, type });
    const targetUrl = `${WORKER_API_URL}/api/view?${query.toString()}`;
    
    log(`[View] 准备下载。Base URL: ${WORKER_API_URL}`);
    log(`[View] 完整请求地址: ${targetUrl}`);
    
    const res = await fetch(targetUrl);
    
    if (!res.ok) {
      const text = await res.text();
      log(`[View] 下载失败: Status ${res.status}, Body: ${text}`);
      throw new Error('下载图片数据失败');
    }

    log(`[View] 图片下载成功，大小: ${res.headers.get('content-length')} bytes`);
    return await res.blob();
  }
}
