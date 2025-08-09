export interface DiveJournalEntry {
  userId: string;
  date: string;
  discipline: string;
  diveTime: string;
  maxDepth: number;
  targetDepth: number;
  success: boolean;
  issueTags: string[];
  notes: string;
  imageRefs?: string[];
  videoRefs?: string[];
  symptoms?: {
    discomfort?: string;
    EQ_loss?: boolean;
    squeeze_signs?: boolean;
    mental_block?: boolean;
  };
  adjustmentFlags?: {
    recommend_mf_depth_review?: boolean;
    delay_target_depth?: boolean;
  };
}
