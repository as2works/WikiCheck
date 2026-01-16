import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { Checklist, ChecklistItem, ParsedChecklist } from '../models/types';
import { v4 as uuidv4 } from 'uuid';

// クライアントの遅延初期化
let _client: ReturnType<typeof generateClient<Schema>> | null = null;

const getClient = () => {
  if (!_client) {
    try {
      _client = generateClient<Schema>();
    } catch (e) {
      console.error("Failed to initialize Amplify Data Client. Ensure amplify_outputs.json is valid.", e);
      throw e;
    }
  }
  return _client;
};

export const dataService = {
  // --- Checklist Operations (AWS Amplify Data) ---

  listChecklists: async (): Promise<Checklist[]> => {
    const client = getClient();
    try {
      const { data: items } = await client.models.Checklist.list({});
      
      const formattedItems = items.map(item => ({
        ...item,
        category: item.category || 'メイン',
        order: item.order || 0
      })) as Checklist[];

      return formattedItems.sort((a, b) => (a.order || 0) - (b.order || 0));
    } catch (e) {
      console.error("Failed to fetch checklists. Check your backend connection.", e);
      throw e;
    }
  },

  getChecklist: async (id: string): Promise<ParsedChecklist | null> => {
    const client = getClient();
    try {
      const { data } = await client.models.Checklist.get({ id });
      const item = data as any;

      if (!item) return null;
      
      let items: ChecklistItem[] = [];
      try {
        items = JSON.parse(item.content);
      } catch (e) {
        console.error("JSON Parse error for content:", e);
        items = [];
      }

      return {
        ...item,
        items,
        category: item.category || 'メイン',
        order: item.order || 0
      } as ParsedChecklist;
    } catch (e) {
      console.error(`Failed to fetch checklist ${id}`, e);
      return null;
    }
  },

  createChecklist: async (title: string, items: ChecklistItem[] = [], category: string = 'メイン'): Promise<Checklist> => {
    const client = getClient();
    
    // 最大オーダーを取得（簡易実装：同時書き込み時の競合は許容）
    let maxOrder = 0;
    try {
        const { data: currentList } = await client.models.Checklist.list({});
        maxOrder = currentList.reduce((max, item) => Math.max(max, item.order || 0), 0);
    } catch (e) {
        console.warn("Failed to determine max order", e);
    }
    
    const { data, errors } = await client.models.Checklist.create({
      title,
      content: JSON.stringify(items),
      category,
      order: maxOrder + 1,
    });

    if (errors) {
      throw new Error(errors.map(e => e.message).join(', '));
    }
    
    if (!data) throw new Error("Create failed: No data returned");

    const newItem = data as any;
    return {
        ...newItem,
        category: newItem.category || 'メイン',
        order: newItem.order || 0
    } as Checklist;
  },

  updateChecklist: async (id: string, updates: Partial<Checklist>): Promise<Checklist> => {
    const client = getClient();
    
    // システム管理フィールドを除外
    const { createdAt, updatedAt, ...validUpdates } = updates;
    
    const { data, errors } = await client.models.Checklist.update({
      id,
      ...validUpdates
    });
    
    if (errors) {
      throw new Error(errors.map(e => e.message).join(', '));
    }

    if (!data) throw new Error("Update failed: No data returned");

    const updatedItem = data as any;
    return {
        ...updatedItem,
        category: updatedItem.category || 'メイン',
        order: updatedItem.order || 0
    } as Checklist;
  },

  reorderChecklists: async (checklists: Checklist[]): Promise<void> => {
    const client = getClient();
    try {
      // 一括更新（バッチ処理がないため並列リクエスト）
      await Promise.all(checklists.map(list => 
          client.models.Checklist.update({
              id: list.id,
              order: list.order
          })
      ));
    } catch (e) {
        console.error("Reorder failed", e);
    }
  },

  deleteChecklist: async (id: string): Promise<void> => {
    const client = getClient();
    await client.models.Checklist.delete({ id });
  },

  // --- Utility ---

  generateInitialItem: (): ChecklistItem => ({
    id: uuidv4(),
    text: '',
    checked: false,
    type: 'task',
    indent: 0,
    collapsed: false
  })
};