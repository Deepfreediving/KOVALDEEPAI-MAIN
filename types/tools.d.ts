export interface ToolRecommendation {
  id: string;
  name: string;
  usageConditions: string[];
  contraindications?: string[];
  description: string;
  linkedToDepthRange?: {
    minDepth: number;
    maxDepth: number;
  };
}
