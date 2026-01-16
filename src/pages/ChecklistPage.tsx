import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, RotateCcw, Plus, Heading1 } from 'lucide-react';
import { dataService } from '../services/data';
import { ChecklistItem } from '../models/types';
import ChecklistNode from '../components/ChecklistNode';
import FloatingToolbar from '../components/FloatingToolbar';

const ChecklistPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState('');
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!id) return;
    const loadData = async () => {
      setLoading(true);
      const data = await dataService.getChecklist(id);
      if (data) {
        setTitle(data.title);
        setItems(data.items.length > 0 ? data.items : [dataService.generateInitialItem()]);
      } else {
        navigate('/');
      }
      setLoading(false);
    };
    loadData();
  }, [id, navigate]);

  const triggerSave = useCallback(() => {
    if (!id) return;
    setSaving(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await dataService.updateChecklist(id, {
          title,
          content: JSON.stringify(items)
        });
      } catch (e) {
        console.error("Save failed", e);
      } finally {
        setSaving(false);
      }
    }, 2000);
  }, [id, title, items]);

  useEffect(() => {
    if (!loading) triggerSave();
  }, [items, title, triggerSave, loading]);

  const { visibilityMap, hasChildrenMap } = React.useMemo(() => {
    const visible = new Array(items.length).fill(true);
    const hasChildren = new Array(items.length).fill(false);
    const collapseStack: number[] = []; 

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      while (collapseStack.length > 0 && item.indent <= collapseStack[collapseStack.length - 1]) {
        collapseStack.pop();
      }
      if (collapseStack.length > 0) {
        visible[i] = false;
      }
      const nextItem = items[i + 1];
      if (nextItem && nextItem.indent > item.indent) {
        hasChildren[i] = true;
        if (visible[i] && item.collapsed) {
          collapseStack.push(item.indent);
        }
      }
    }
    return { visibilityMap: visible, hasChildrenMap: hasChildren };
  }, [items]);

  const updateItem = (index: number, updates: Partial<ChecklistItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    setItems(newItems);
  };

  const insertItem = (afterIndex: number, type: 'task' | 'h1' = 'task') => {
    const newItem = dataService.generateInitialItem();
    if (type === 'h1') {
      newItem.indent = 0;
      newItem.type = 'h1';
      newItem.text = "新しいセクション";
    } else {
      newItem.indent = items[afterIndex] ? items[afterIndex].indent : 0;
    }
    const newItems = [...items];
    newItems.splice(afterIndex + 1, 0, newItem);
    setItems(newItems);
    setFocusedIndex(afterIndex + 1);
  };

  const deleteItem = (index: number) => {
    if (items.length <= 1) return; 
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
    setFocusedIndex(Math.max(0, index - 1));
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      insertItem(index);
    } else if (e.key === 'Backspace' && items[index].text === '') {
      e.preventDefault();
      deleteItem(index);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const newIndent = e.shiftKey 
        ? Math.max(0, items[index].indent - 1)
        : Math.min(6, items[index].indent + 1);
      updateItem(index, { indent: newIndent });
    }
  };

  const handleUncheckAll = () => {
    const newItems = items.map(item => ({ 
      ...item, 
      checked: false 
    }));
    setItems(newItems);
  };

  const handleToggleCollapse = (index: number) => {
    updateItem(index, { collapsed: !items[index].collapsed });
  };

  const activeItem = focusedIndex !== null ? items[focusedIndex] : null;

  if (loading) return (
    <div className="flex justify-center items-center h-screen bg-background">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-32 sm:pb-10">
      {/* Top Bar - Yokohama Blue Style */}
      <div className="sticky top-0 z-20 bg-primary/95 backdrop-blur-md shadow-md border-b border-primaryDark px-4 py-3 flex items-center justify-between mx-auto w-full text-white">
        <button onClick={() => navigate('/')} className="p-2 -ml-2 text-white/90 hover:text-white hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft size={22} strokeWidth={2.5} />
        </button>
        
        <div className="flex items-center gap-2">
           {saving && <span className="text-xs text-white/70 animate-pulse font-medium">保存中...</span>}
           <button 
             onClick={handleUncheckAll}
             className="flex items-center gap-1.5 text-xs font-bold text-primary bg-white hover:bg-gray-100 border-2 border-transparent px-3 py-1.5 rounded-full shadow-sm transition-all active:scale-95"
             title="全ての項目のチェックを外す"
           >
             <RotateCcw size={14} />
             <span>全解除</span>
           </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-8 mt-8">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="リストのタイトル"
          className="w-full text-4xl font-extrabold bg-transparent border-none outline-none text-primary placeholder-primary/30 mb-8"
        />

        <div className="space-y-1">
          {items.map((item, index) => (
            <ChecklistNode
              key={item.id}
              index={index}
              item={item}
              isActive={focusedIndex === index}
              isVisible={visibilityMap[index]}
              hasChildren={hasChildrenMap[index]}
              onFocus={setFocusedIndex}
              onChange={updateItem}
              onKeyDown={handleKeyDown}
              onToggleCollapse={handleToggleCollapse}
            />
          ))}
        </div>
        
        {/* Additional Actions */}
        <div className="mt-8 flex gap-3 justify-center border-t-2 border-dashed border-primary/20 pt-8 pb-10">
            <button 
                onClick={() => insertItem(items.length - 1)}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-primary bg-white border-2 border-primary/20 rounded-xl hover:border-primary hover:text-primary transition-all shadow-sm hover:shadow-pop"
            >
                <Plus size={18} strokeWidth={3} />
                <span>行を追加</span>
            </button>
            <button 
                onClick={() => insertItem(items.length - 1, 'h1')}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-primary border-2 border-primary rounded-xl hover:bg-primaryDark transition-all shadow-sm hover:shadow-pop"
            >
                <Heading1 size={18} strokeWidth={3} />
                <span>大見出しを追加</span>
            </button>
        </div>
      </div>

      {/* Mobile Floating Toolbar */}
      {focusedIndex !== null && activeItem && (
        <FloatingToolbar
          isVisible={true}
          currentType={activeItem.type}
          onIndent={() => updateItem(focusedIndex, { indent: Math.min(6, activeItem.indent + 1) })}
          onOutdent={() => updateItem(focusedIndex, { indent: Math.max(0, activeItem.indent - 1) })}
          onSetType={(type) => updateItem(focusedIndex, { type })}
          onDelete={() => deleteItem(focusedIndex)}
        />
      )}
    </div>
  );
};

export default ChecklistPage;