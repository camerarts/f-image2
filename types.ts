export interface ComfyNode {
  inputs: Record<string, any>;
  class_type: string;
  _meta?: any;
}

export type ComfyWorkflow = Record<string, ComfyNode>;

export interface PromptRequest {
  prompt: ComfyWorkflow;
  client_id: string;
}

export interface PromptResponse {
  prompt_id: string;
  number?: number;
  node_errors?: any;
}

export interface HistoryResponse {
  [prompt_id: string]: {
    outputs: {
      [node_id: string]: {
        images: Array<{
          filename: string;
          subfolder: string;
          type: string;
        }>;
      };
    };
    status: {
      status_str: string;
      completed: boolean;
      messages: any[];
    };
  };
}

export enum AppStatus {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}