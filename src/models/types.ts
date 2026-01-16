export type NodeType = 'h1' | 'h2' | 'h3' | 'task';

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  type: NodeType;
  indent: number;
  collapsed?: boolean;
}

export interface Checklist {
  id: string;
  title: string;
  content: string; // JSON string
  category: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ParsedChecklist extends Omit<Checklist, 'content'> {
  items: ChecklistItem[];
}