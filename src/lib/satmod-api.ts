export type Modulation = "BPSK" | "QPSK" | "16-QAM";

export interface IQSample {
  i: number;
  q: number;
}

export interface ClassifyRequest {
  samples: IQSample[];
  source?: string;
}

export interface ClassificationResult {
  predictedModulation: Modulation;
  confidence: number;
  probabilities: Partial<Record<Modulation, number>>;
  snrDb?: number;
  processingMs?: number;
  modelId?: string;
}

export interface SignalGenerationRequest {
  modulation: Modulation;
  snrDb: number;
  symbolCount: number;
}

export interface GeneratedSignal {
  samples: IQSample[];
  modulation: Modulation;
  snrDb: number;
  symbolCount: number;
}

export interface ApiModel {
  id: string;
  name: string;
  status: "available" | "not-trained" | "unavailable";
  accuracy?: number;
  latencyMs?: number;
}

export interface EvaluationResults {
  metrics: Record<string, number>;
  confusionMatrix: number[][];
  snrAccuracy: Array<{ snrDb: number; accuracy: number }>;
  classes: string[];
}

export interface HealthStatus {
  connected: boolean;
  modelId?: string;
}

export interface SignalAnalysis {
  signalPower?: number;
  noisePower?: number;
  estimatedSnrDb?: number;
  bandwidthHz?: number;
  metadata?: Record<string, string | number | boolean>;
}

export interface HistoryItem {
  id: string;
  createdAt: string;
  modulation?: string;
  source?: string;
}

const configuredBaseUrl = import.meta.env.VITE_SATMOD_API_URL?.replace(/\/$/, "") ?? "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${configuredBaseUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!response.ok) {
    throw new Error(`Signal service returned ${response.status}`);
  }
  return (await response.json()) as T;
}

export const satmodApi = {
  health: () => request<HealthStatus>("/api/health"),
  classify: (body: ClassifyRequest) =>
    request<ClassificationResult>("/api/classify", { method: "POST", body: JSON.stringify(body) }),
  generate: (body: SignalGenerationRequest) =>
    request<GeneratedSignal>("/api/signal/generate", { method: "POST", body: JSON.stringify(body) }),
  analyze: (samples: IQSample[]) =>
    request<SignalAnalysis>("/api/signal/analyze", { method: "POST", body: JSON.stringify({ samples }) }),
  models: () => request<ApiModel[]>("/api/models"),
  evaluation: () => request<EvaluationResults>("/api/evaluation"),
  history: () => request<HistoryItem[]>("/api/history"),
};

export const SUPPORTED_MODULATIONS: Modulation[] = ["BPSK", "QPSK", "16-QAM"];

export const MODEL_CATALOG: ApiModel[] = [
  { id: "1d-cnn", name: "1D-CNN", status: "available", accuracy: 72.44 },
  { id: "resnet", name: "ResNet", status: "not-trained" },
  { id: "cldnn", name: "CLDNN", status: "not-trained" },
  { id: "random-forest", name: "Random Forest", status: "not-trained" },
];