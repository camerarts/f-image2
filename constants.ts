import { ComfyWorkflow } from './types';

// =========================================================================
// 【重要】已配置为您的 Cloudflare Worker 绝对路径
// 必须以 https:// 开头，末尾不要带斜杠
// =========================================================================
export const WORKER_API_URL = 'https://zimage.sqqdeidt.workers.dev';

// 标准 16:9 SDXL Turbo 工作流模板
// 注意：代码 App.tsx 会自动寻找节点 ID "34" 进行修改，如果找不到则尝试修改 "6" 和 "3"
export const WORKFLOW_TEMPLATE: ComfyWorkflow = {
  "3": {
    "inputs": {
      "seed": 1,
      "steps": 1,
      "cfg": 1,
      "sampler_name": "euler_ancestral",
      "scheduler": "normal",
      "denoise": 1,
      "model": [
        "4",
        0
      ],
      "positive": [
        "6",
        0
      ],
      "negative": [
        "7",
        0
      ],
      "latent_image": [
        "5",
        0
      ]
    },
    "class_type": "KSampler",
    "_meta": {
      "title": "KSampler"
    }
  },
  "4": {
    "inputs": {
      "ckpt_name": "Z-Image Turbo fyt"
    },
    "class_type": "CheckpointLoaderSimple",
    "_meta": {
      "title": "Load Checkpoint"
    }
  },
  "5": {
    "inputs": {
      "width": 1024,
      "height": 576,
      "batch_size": 1
    },
    "class_type": "EmptyLatentImage",
    "_meta": {
      "title": "Empty Latent Image"
    }
  },
  "6": {
    "inputs": {
      "text": "beautiful landscape",
      "clip": [
        "4",
        1
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Prompt)"
    }
  },
  "7": {
    "inputs": {
      "text": "text, watermark, low quality",
      "clip": [
        "4",
        1
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Negative)"
    }
  },
  "8": {
    "inputs": {
      "samples": [
        "3",
        0
      ],
      "vae": [
        "4",
        2
      ]
    },
    "class_type": "VAEDecode",
    "_meta": {
      "title": "VAE Decode"
    }
  },
  "9": {
    "inputs": {
      "filename_prefix": "Z-Image",
      "images": [
        "8",
        0
      ]
    },
    "class_type": "SaveImage",
    "_meta": {
      "title": "Save Image"
    }
  },
  // 占位符节点：用于兼容 "Node 34" 的修改逻辑
  // App.tsx 逻辑：如果存在 ID 为 "34" 的节点，优先修改它的 inputs.text 和 inputs.seed
  // 这样即便底层工作流节点 ID 变动，只要保留这个壳，代码就能跑通
  "34": {
     "inputs": {
        "text": "", 
        "seed": 0
     },
     "class_type": "Note", 
     "_meta": {
       "title": "Input Controller"
     }
  }
};
