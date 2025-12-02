import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ComfyService } from './services/comfyService';
import { WORKFLOW_TEMPLATE, WORKER_API_URL } from './constants';
import { AppStatus } from './types';
import { Button } from './components/Button';

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [statusMessage, setStatusMessage] = useState('准备就绪');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [lastImageData, setLastImageData] = useState<{ blob: Blob, filename: string } | null>(null);
  const [workerConfigured, setWorkerConfigured] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);

  // Helper to add logs with timestamp
  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    setLogs(prev => [...prev, `[${time}] ${msg}`]);
  }, []);

  // Auto-scroll logs
  const logContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Check if user has configured the worker URL
  useEffect(() => {
    addLog(`应用启动. 目标 API: ${WORKER_API_URL}`);
    if (WORKER_API_URL.includes('replace-me')) {
      setWorkerConfigured(false);
      setStatusMessage('配置错误：未设置 WORKER_API_URL');
      addLog('错误: 检测到默认 URL，请修改 constants.ts');
    }
  }, [addLog]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || status === AppStatus.GENERATING) return;

    setStatus(AppStatus.GENERATING);
    setStatusMessage('初始化中...');
    setImageUrl(null);
    setLastImageData(null);
    setLogs([]); // Clear logs on new run
    addLog('=== 开始新任务 ===');

    const startTime = Date.now();

    try {
      // 1. Prepare Workflow
      addLog('正在组装工作流 JSON...');
      const workflow = JSON.parse(JSON.stringify(WORKFLOW_TEMPLATE));
      
      const randomSeed = Math.floor(Math.random() * 1000000000);
      addLog(`生成随机种子: ${randomSeed}`);
      
      if (workflow["34"]) {
        workflow["34"].inputs.text = prompt;
        workflow["34"].inputs.seed = randomSeed;
      }
      if (workflow["6"]) workflow["6"].inputs.text = prompt;
      if (workflow["3"]) workflow["3"].inputs.seed = randomSeed;

      // 2. Queue Prompt
      setStatusMessage('正在提交任务...');
      const promptId = await ComfyService.queuePrompt(workflow, addLog);

      // 3. Poll for History
      setStatusMessage('正在生成 (约 5-10 秒)...');
      const imageMeta = await ComfyService.pollHistory(promptId, addLog);

      // 4. Download Image
      setStatusMessage('正在下载结果...');
      const blob = await ComfyService.downloadImage(imageMeta.filename, imageMeta.subfolder, imageMeta.type, addLog);
      
      // 5. Display
      const url = URL.createObjectURL(blob);
      setImageUrl(url);
      setLastImageData({ blob, filename: imageMeta.filename });
      setStatus(AppStatus.SUCCESS);
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      setStatusMessage(`完成 (耗时 ${duration} 秒)`);
      addLog(`=== 任务完成，总耗时 ${duration}s ===`);

    } catch (error: any) {
      console.error(error);
      setStatus(AppStatus.ERROR);
      setStatusMessage(error.message || '生成失败');
      addLog(`!!! 发生错误: ${error.message} !!!`);
    }
  }, [prompt, status, addLog]);

  const handleDownload = useCallback(() => {
    if (!lastImageData) return;
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(lastImageData.blob);
    link.download = lastImageData.filename || `z-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [lastImageData]);

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-4 sm:px-6">
      
      {/* Header */}
      <div className="w-full max-w-4xl mb-8 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400 mb-2">
          Z-Image Turbo
        </h1>
        <p className="text-gray-400">高保真 16:9 图像生成引擎</p>
      </div>

      {!workerConfigured && (
        <div className="w-full max-w-4xl mb-8 p-4 bg-red-900/30 border border-red-800 rounded-lg text-red-200">
          <strong>需配置：</strong> 请编辑 <code>constants.ts</code> 并将 <code>WORKER_API_URL</code> 设置为您的 Cloudflare Worker 地址。
        </div>
      )}

      {/* Main Content */}
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Controls */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              提示词 (Prompt)
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="例如：赛博朋克风格的雨夜城市，霓虹灯光...(建议使用英文)"
              className="w-full h-40 bg-gray-950 border border-gray-700 rounded-xl p-4 text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none transition-all placeholder-gray-600"
            />
            
            <div className="mt-6 flex flex-col gap-3">
              <Button 
                onClick={handleGenerate}
                disabled={!prompt.trim() || !workerConfigured}
                isLoading={status === AppStatus.GENERATING}
                className="w-full"
              >
                {status === AppStatus.GENERATING ? '生成中...' : '生成图片'}
              </Button>

              <div className={`text-center text-sm font-medium transition-colors duration-300 ${
                status === AppStatus.ERROR ? 'text-red-400' : 
                status === AppStatus.SUCCESS ? 'text-green-400' : 'text-gray-500'
              }`}>
                状态：{statusMessage}
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-600 text-center">
            固定尺寸：1024 &times; 576 (16:9)
          </div>
        </div>

        {/* Right: Preview */}
        <div className="lg:col-span-2">
          <div className="bg-gray-900 p-2 rounded-2xl border border-gray-800 shadow-2xl h-full flex flex-col">
            <div className="relative w-full aspect-[16/9] bg-gray-950 rounded-xl overflow-hidden flex items-center justify-center group">
              {imageUrl ? (
                <img 
                  src={imageUrl} 
                  alt="Generated Result" 
                  className="w-full h-full object-cover shadow-inner"
                />
              ) : (
                <div className="text-gray-700 flex flex-col items-center">
                  <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-mono opacity-50">图片预览区</span>
                </div>
              )}

              {/* Loading Overlay */}
              {status === AppStatus.GENERATING && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-10">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-1 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 animate-progress w-full origin-left"></div>
                    </div>
                    <span className="text-xs text-blue-300 font-mono tracking-widest uppercase">渲染中</span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="mt-4 flex justify-between items-center px-2">
               <span className="text-xs text-gray-500 font-mono">
                 {lastImageData ? lastImageData.filename : '---'}
               </span>
               <Button 
                 variant="secondary" 
                 disabled={!imageUrl || status !== AppStatus.SUCCESS}
                 onClick={handleDownload}
                 className="!py-2 !px-4 text-sm"
               >
                 <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                 下载 PNG
               </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Debug Log Section */}
      <details className="w-full max-w-4xl mt-8 bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <summary className="px-6 py-4 cursor-pointer text-gray-400 font-mono text-sm hover:bg-gray-800 transition-colors flex items-center select-none">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          调试日志 (Debug Log)
        </summary>
        <div className="px-6 pb-6 pt-2 border-t border-gray-800">
           <div 
             ref={logContainerRef}
             className="bg-black/50 p-4 rounded-lg font-mono text-xs text-green-400/90 whitespace-pre-wrap overflow-x-auto h-64 overflow-y-auto border border-gray-800/50 shadow-inner"
           >
             {logs.length === 0 ? (
               <span className="text-gray-600 opacity-50">等待操作...</span>
             ) : (
               logs.map((log, i) => (
                 <div key={i} className="mb-1 border-b border-gray-800/30 pb-0.5">{log}</div>
               ))
             )}
           </div>
        </div>
      </details>

      <style>{`
        @keyframes progress {
          0% { transform: scaleX(0); }
          50% { transform: scaleX(0.7); }
          100% { transform: scaleX(1); }
        }
        .animate-progress {
          animation: progress 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
