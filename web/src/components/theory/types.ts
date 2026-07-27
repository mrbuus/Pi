export type Subject = "MATH" | "SOCIAL_STUDIES";

export interface Book {
  id: string;
  code: string;
  title: string;
  subject: Subject;
  _count: { chapters: number };
}

export interface Chapter {
  id: string;
  title: string;
  order: number;
  grade?: number;
  freePreview: boolean;
  _count?: { theories?: number };
}

export interface TheoryBlock {
  id: string;
  chapterId: string;
  title: string;
  content: string;
  imageKeys: string[];
  order: number;
}
