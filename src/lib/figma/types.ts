export type FigmaComponent = {
  key: string;
  name: string;
  description: string;
  variants?: FigmaVariant[];
};

export type FigmaVariant = {
  property: string;
  values: string[];
};

export type FigmaVariable = {
  id: string;
  name: string;
  resolvedType: "COLOR" | "FLOAT" | "STRING" | "BOOLEAN";
  valuesByMode: Record<string, unknown>;
};

export type FigmaLibrary = {
  fileKey: string;
  fileName: string;
  components: FigmaComponent[];
  variables: FigmaVariable[];
  fetchedAt: string;
};

export type ComponentRecommendation = {
  screenId: string;
  screenName: string;
  recommendations: ScreenRecommendation[];
};

export type ScreenRecommendation = {
  element: string;
  pattern: RecommendationPattern;
  componentKey: string | null;
  componentName: string | null;
  rationale: string;
  missingStates?: string[];
};

export type RecommendationPattern =
  | "existing"
  | "extend-variant"
  | "new-component"
  | "screen-only";
