export interface TaskItem {
  id: string;
  title: string;
  subtitle: string;
  subject: string;
  subjectColor: 'primary' | 'tertiary' | 'outline' | 'error';
  completed: boolean;
  priority?: 'high' | 'medium' | 'low';
  difficulty?: 'hard' | 'medium' | 'easy';
  estimatedDuration?: string;
  urgent?: boolean;
}

export interface FocusArea {
  id: string;
  subject: string;
  subjectColor: 'error' | 'primary' | 'tertiary' | 'outline';
  score: number | string;
  title: string;
  description: string;
  actionText: string;
}

export interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  senderName: string;
  content: string | Array<{ type: 'text' | 'callout'; text: string; label?: string }>;
  timestamp?: string;
  attachment?: import('../services/fileProcessingService').ProcessedAttachment | null;
  attachments?: import('../services/fileProcessingService').ProcessedAttachment[] | null;
  imageResults?: import('../services/imageSearchService').ImageSearchResult[];
}

export const MOCK_USER = {
  name: "Student",
  avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDay040g6xavBJCp2SiKdu5vvz3cs9UiqpDsnf8aYPbhvv4mTdUdIpBnHeYKMcHaU8YAswuvjKUD7BzdsTbgxqwtCZu3AICEsov-uHl6_qe78ge7pAYuOaa_B2FUEMv4XuKITSGN5ULDv63Thjnv457STpyJabvalEdKmFc-doxAsdWcfyIxoHeMdi9aEQwnV8PA9lhSEoMi8ODHqgjwtwpbN-xJmDtWUdvfTF_DcnLpDqbkBkpPFcr",
  hoursStudied: "0h",
  streakDays: "0 Days",
  weeklyGoalPercent: 0
};

export const MOCK_TASKS: TaskItem[] = [
  {
    id: "cs-u1-1",
    title: "Computer System Components & Memory Locations",
    subtitle: "Unit 1: Introduction to Programming • 20 mins",
    subject: "ES-CS201",
    subjectColor: "primary",
    completed: false,
    priority: "medium",
    difficulty: "easy",
    estimatedDuration: "20 mins",
    urgent: false
  },
  {
    id: "cs-u1-2",
    title: "Variables, Constants & Data Types in C",
    subtitle: "Unit 1: Introduction to Programming • 25 mins",
    subject: "ES-CS201",
    subjectColor: "primary",
    completed: false,
    priority: "high",
    difficulty: "easy",
    estimatedDuration: "25 mins",
    urgent: true
  },
  {
    id: "cs-u1-3",
    title: "Arithmetic, Logical & Bitwise Operators",
    subtitle: "Unit 1: Operators & Expressions • 30 mins",
    subject: "ES-CS201",
    subjectColor: "primary",
    completed: false,
    priority: "medium",
    difficulty: "medium",
    estimatedDuration: "30 mins",
    urgent: false
  },
  {
    id: "cs-u1-4",
    title: "Conditional Logic: if, else-if & switch-case",
    subtitle: "Unit 1: Control Statements • 35 mins",
    subject: "ES-CS201",
    subjectColor: "primary",
    completed: false,
    priority: "high",
    difficulty: "medium",
    estimatedDuration: "35 mins",
    urgent: false
  },
  {
    id: "cs-u1-5",
    title: "Looping Constructs: for, while & do-while",
    subtitle: "Unit 1: Control Statements • 40 mins",
    subject: "ES-CS201",
    subjectColor: "primary",
    completed: false,
    priority: "high",
    difficulty: "hard",
    estimatedDuration: "40 mins",
    urgent: true
  }
];

export const MOCK_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: "msg-1",
    sender: "ai",
    senderName: "AI Study Companion",
    content: "Welcome to StudyFlow AI! I'm your personalized academic study assistant grounded in the MAKAUT B.Tech CSE 1st Year Curriculum. How can I help you master your subjects today?"
  }
];
