import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { Checklist, ChecklistItem, ParsedChecklist } from '../models/types';
import { v4 as uuidv4 } from 'uuid';
import outputs from '../../amplify_outputs.json';

// クライアントインスタンスを保持する変数（初期値はnull）
let _client: ReturnType<typeof generateClient<Schema>> | null = null;

// クライアントを安全に取得する関数（遅延初期化）
const getClient = () => {
  if (!_client) {
    try {
      _client = generateClient<Schema>();
    } catch (e) {
      console.error("Amplify Client Generation Failed:", e);
      console.log("Current Config:", JSON.stringify(outputs, null, 2));
      throw new Error("バックエンドへの接続に失敗しました。設定ファイルを確認してください。");
    }
  }
  return _client;
};

// カテゴリ用の一時的なローカル保存キー
const CATEGORIES_KEY = 'wikicheck_categories';

const getCategoriesStorage = (): string[] => {
  const data = localStorage.getItem(CATEGORIES_KEY);
  return data ? JSON.parse(data) : ['メイン'];
};

const setCategoriesStorage = (categories: string[]) => {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
};

export const dataService = {
  // --- Checklist Operations (AWS Amplify Data) ---

  listChecklists: async (): Promise<Checklist[]> => {
    try {
      const client = getClient();
      // DynamoDBから全件取得
      const { data: items } = await client.models.Checklist.list({});
      
      // アプリ側の型に合わせて整形＆ソート
      const formattedItems = items.map(item => ({
        ...item,
        category: item.category || 'メイン', // null対策
        order: item.order || 0
      })) as Checklist[];

      return formattedItems.sort((a, b) => (a.order || 0) - (b.order || 0));
    } catch (e) {
      console.error("Failed to list checklists", e);
      return [];
    }
  },

  getChecklist: async (id: string): Promise<ParsedChecklist | null> => {
    try {
      const client = getClient();
      const { data } = await client.models.Checklist.get({ id });
      const item = data as any; // 型推論回避

      if (!item) return null;
      
      let items: ChecklistItem[] = [];
      try {
        items = JSON.parse(item.content);
      } catch (e) {
        console.error("Failed to parse checklist content", e);
      }

      return {
        ...item,
        items,
        category: item.category || 'メイン',
        order: item.order || 0
      } as ParsedChecklist;
    } catch (e) {
      console.error("Failed to get checklist", e);
      return null;
    }
  },

  createChecklist: async (title: string, items: ChecklistItem[] = [], category: string = 'メイン'): Promise<Checklist> => {
    // 現在の最大オーダーを取得して末尾に追加
    let maxOrder = 0;
    try {
        const currentList = await dataService.listChecklists();
        maxOrder = currentList.reduce((max, item) => Math.max(max, item.order || 0), 0);
    } catch (e) {
        console.warn("Failed to get max order, defaulting to 0", e);
    }
    
    // AWSへ保存
    const client = getClient();
    const { data, errors } = await client.models.Checklist.create({
      title,
      content: JSON.stringify(items),
      category,
      order: maxOrder + 1,
    });
    const newItem = data as any; // 型推論回避

    if (errors) {
        throw new Error(errors.map(e => e.message).join(', '));
    }

    if (!newItem) {
        throw new Error("Failed to create checklist: No data returned");
    }

    return {
        ...newItem,
        category: newItem.category || 'メイン',
        order: newItem.order || 0
    } as Checklist;
  },

  updateChecklist: async (id: string, updates: Partial<Checklist>): Promise<Checklist> => {
    // 不要なフィールド（createdAt, updatedAtなど）を除外して更新用オブジェクトを作成
    const { createdAt, updatedAt, ...validUpdates } = updates;
    
    const client = getClient();
    const { data, errors } = await client.models.Checklist.update({
      id,
      ...validUpdates
    });
    const updatedItem = data as any; // 型推論回避

    if (errors) {
        throw new Error(errors.map(e => e.message).join(', '));
    }

    if (!updatedItem) throw new Error("Update failed");

    return {
        ...updatedItem,
        category: updatedItem.category || 'メイン',
        order: updatedItem.order || 0
    } as Checklist;
  },

  reorderChecklists: async (checklists: Checklist[]): Promise<void> => {
    const client = getClient();
    try {
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
  
  // --- Category Operations (Local Preference) ---

  getCategories: async (): Promise<string[]> => {
    return getCategoriesStorage();
  },

  addCategory: async (name: string): Promise<string[]> => {
    const cats = getCategoriesStorage();
    if (!cats.includes(name)) {
      const newCats = [...cats, name];
      setCategoriesStorage(newCats);
      return newCats;
    }
    return cats;
  },

  deleteCategory: async (name: string): Promise<string[]> => {
    const cats = getCategoriesStorage();
    const newCats = cats.filter(c => c !== name);
    setCategoriesStorage(newCats);
    
    try {
        const client = getClient();
        const allLists = await dataService.listChecklists();
        const itemsToMove = allLists.filter(l => l.category === name);
        
        await Promise.all(itemsToMove.map(item => 
            client.models.Checklist.update({
                id: item.id,
                category: 'メイン'
            })
        ));
    } catch (e) {
        console.error("Failed to move items from deleted category", e);
    }

    return newCats;
  },

  generateInitialItem: (): ChecklistItem => ({
    id: uuidv4(),
    text: '',
    checked: false,
    type: 'task',
    indent: 0,
    collapsed: false
  })
};