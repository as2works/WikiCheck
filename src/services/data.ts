import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { Checklist, ChecklistItem, ParsedChecklist } from '../models/types';
import { v4 as uuidv4 } from 'uuid';

// Amplify Gen 2のデータクライアントを生成
const client = generateClient<Schema>();

// カテゴリ用の一時的なローカル保存キー（カテゴリ管理だけは簡易的にローカルに残すか、別途DB化も可能ですが、今回はシンプルにDBのcategoryフィールドを活用するため、クライアント側でユニークなカテゴリを抽出するロジックにします）
const CATEGORIES_KEY = 'wikicheck_categories';

// カテゴリ一覧はDBから動的に取得するか、ローカル設定として保持します。
// ここではUX向上のため、ローカル設定として保持する方式を維持します。
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
    // DynamoDBから全件取得
    const { data: items } = await client.models.Checklist.list();
    
    // アプリ側の型に合わせて整形＆ソート
    // DynamoDBからのデータはcreatedAtなどがreadonlyのため、キャストして扱います
    const formattedItems = items.map(item => ({
      ...item,
      category: item.category || 'メイン', // null対策
      order: item.order || 0
    })) as Checklist[];

    return formattedItems.sort((a, b) => (a.order || 0) - (b.order || 0));
  },

  getChecklist: async (id: string): Promise<ParsedChecklist | null> => {
    const { data: item } = await client.models.Checklist.get({ id });
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
  },

  createChecklist: async (title: string, items: ChecklistItem[] = [], category: string = 'メイン'): Promise<Checklist> => {
    // 現在の最大オーダーを取得して末尾に追加
    const currentList = await dataService.listChecklists();
    const maxOrder = currentList.reduce((max, item) => Math.max(max, item.order || 0), 0);
    
    // AWSへ保存
    const { data: newItem } = await client.models.Checklist.create({
      title,
      content: JSON.stringify(items),
      category,
      order: maxOrder + 1,
    });

    return {
        ...newItem,
        category: newItem.category || 'メイン',
        order: newItem.order || 0
    } as Checklist;
  },

  updateChecklist: async (id: string, updates: Partial<Checklist>): Promise<Checklist> => {
    // 不要なフィールド（createdAt, updatedAtなど）を除外して更新用オブジェクトを作成
    const { createdAt, updatedAt, ...validUpdates } = updates;
    
    const { data: updatedItem } = await client.models.Checklist.update({
      id,
      ...validUpdates
    });

    if (!updatedItem) throw new Error("Update failed");

    return {
        ...updatedItem,
        category: updatedItem.category || 'メイン',
        order: updatedItem.order || 0
    } as Checklist;
  },

  reorderChecklists: async (checklists: Checklist[]): Promise<void> => {
    // 変更があったアイテムだけを更新（一括更新がないためループで処理）
    // 実際の運用ではバッチ処理などを検討しますが、個人利用規模ならこれで十分です
    await Promise.all(checklists.map(list => 
        client.models.Checklist.update({
            id: list.id,
            order: list.order
        })
    ));
  },

  deleteChecklist: async (id: string): Promise<void> => {
    await client.models.Checklist.delete({ id });
  },
  
  // --- Category Operations (Local Preference) ---
  // タブ設定は個人の端末設定としてローカルに残します（共有したくない場合も多いため）

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
    
    // 削除されたカテゴリに属するリストを「メイン」に移動（これはクラウド上のデータを更新）
    const allLists = await dataService.listChecklists();
    const itemsToMove = allLists.filter(l => l.category === name);
    
    await Promise.all(itemsToMove.map(item => 
        client.models.Checklist.update({
            id: item.id,
            category: 'メイン'
        })
    ));

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