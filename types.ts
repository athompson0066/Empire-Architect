export enum ContentType {
  COURSE = 'Online Course',
  EZINE = 'Ezine/Newsletter',
  ARTICLE = 'Blog Article',
  HOW_TO = 'How-To Guide',
  TUTORIAL = 'Technical Tutorial',
  EBOOK = 'PDF E-Book',
  PODCAST = 'Podcast Series',
  LISTICLE = 'Viral Listicle',
  AI_AGENT = 'Custom AI Agent',
  CREW_AI = 'Agent Crew (CrewAI)',
  TOP_WEBSITES = 'Top Websites',
  WEB_APP = 'SaaS/Web App',
  MOBILE_APP = 'Mobile App',
  AD_SNIPPETS = 'Ad Snippets'
}

export interface ContentIdea {
  title: string;
  subtitle?: string;
  description: string;
  targetAudience: string;
  painPointSolved: string;
  monetizationAngle?: string;
  url?: string;
}

export interface GeneratedContentState {
  [key: string]: ContentIdea[];
}

export interface DetailedOutline {
  title: string;
  modules: {
    title: string;
    points: string[];
  }[];
  introHook: string;
  cta: string;
}

export interface AudienceKeyword {
  keyword: string;
  painPoint: string;
}

export interface TrendingKeyword {
  keyword: string;
  category: string;
  searchVolumeContext: string;
}