import { ComfyWorkflow } from './types';

// =========================================================================
// IMPORTANT: REPLACE THIS WITH YOUR DEPLOYED CLOUDFLARE WORKER URL
// Example: https://z-image-api.your-name.workers.dev
// =========================================================================
export const WORKER_API_URL = 'https://zimage.sqqdeidt.workers.dev';

// Standard 16:9 SDXL Turbo Workflow Template
// Based on the requirement to modify Node 34 for prompt and seed
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
      "ckpt_name": "sd_xl_turbo_1.0_fp16.safetensors"
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
  // Mapping Node 34 logic to the actual functional nodes for robustness
  // If your specific JSON has a node "34" that controls everything, we can use that.
  // Below is a "Logic Router" that effectively allows us to target "34" in code
  // even if the underlying workflow uses standard nodes 3/6.
  "34": {
     "inputs": {
        "text": "", // Will be injected into Node 6
        "seed": 0   // Will be injected into Node 3
     },
     "class_type": "Note", // Dummy node just to hold the config if needed, or we modify directly
     "_meta": {
       "title": "Input Controller"
     }
  }
};
