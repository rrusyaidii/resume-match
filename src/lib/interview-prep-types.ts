export interface StarScaffold {
  situation: string;
  task: string;
  action: string;
  result: string;
}

export interface BehavioralQuestion {
  question: string;
  whyAsked: string;
  scaffold: StarScaffold;
}

export interface TechnicalQuestion {
  question: string;
  topic: string;
  whatGoodLooksLike: string;
}

export interface GapDefence {
  question: string;
  gap: string;
  suggestedAngle: string;
}

export interface QuestionToAsk {
  question: string;
  rationale: string;
}

export interface InterviewPrepResult {
  detectedLevel: string;
  roleFamily: string;
  behavioral: BehavioralQuestion[];
  technical: TechnicalQuestion[];
  gapDefence: GapDefence[];
  questionsToAsk: QuestionToAsk[];
  generatedAt: string;
}

export const PREP_MAX_BEHAVIORAL = 5;
export const PREP_MAX_TECHNICAL = 6;
export const PREP_MAX_GAP_DEFENCE = 4;
export const PREP_MAX_QUESTIONS_TO_ASK = 4;
