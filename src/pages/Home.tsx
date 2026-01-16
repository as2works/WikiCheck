import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Copy, Trash2, FileText, Loader2, Calendar, ChevronRight, X, GripVertical, FolderInput, Check } from 'lucide-react';
import { dataService } from '../services/data';
import { Checklist } from '../models/types';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [categories, setCategories] = useState<string[]>(['メイン']);
  const [activeTab, setActiveTab] = useState<string>('メイン');
  const [loading, setLoading] = useState(true);
  
  // Tab Creation State
  const [isCreatingTab, setIsCreatingTab] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const tabInputRef = useRef<HTMLInputElement>(null);

  // Move List State
  const [moveTargetList, setMoveTargetList] = useState<Checklist | null>(null);

  // DnD State
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  // List Creation State
  const [isCreatingList, setIsCreatingList] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (isCreatingTab && tabInputRef.current) {
        tabInputRef.current.focus();
    }
  }, [isCreatingTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const listsData = await dataService.listChecklists();
      
      // データからユニークなカテゴリを抽出してタブを生成
      const uniqueCats = new Set<string>(['メイン']);
      listsData.forEach(l => {
        if (l.category) uniqueCats.add(l.category);
      });
      
      const sortedCats = Array.from(uniqueCats).sort();
      // "メイン"を先頭に
      const finalCats = ['メイン', ...sortedCats.filter(c => c !== 'メイン')];

      setChecklists(listsData);
      setCategories(finalCats);
      
      // アクティブタブが存在しなくなった場合のフォールバック
      if (!uniqueCats.has(activeTab)) {
        setActiveTab('メイン');
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (isCreatingList) return;
    setIsCreatingList(true);
    try {
      const newItem = dataService.generateInitialItem();
      newItem.text = "新しいリスト";
      newItem.type = 'h1';
      
      // 現在のタブに作成する
      const newList = await dataService.createChecklist(
          "名称未設定リスト", 
          [newItem, { ...dataService.generateInitialItem(), text: "" }],
          activeTab
      );
      navigate(`/list/${newList.id}`);
    } catch (error) {
      console.error("Failed to create checklist:", error);
      alert("リストの作成に失敗しました。ネットワーク接続を確認してください。");
    } finally {
      setIsCreatingList(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('本当に削除しますか？')) return;
    try {
      await dataService.deleteChecklist(id);
      
      // UI更新とカテゴリ再計算
      const newList = checklists.filter(l => l.id !== id);
      setChecklists(newList);
      recalcCategories(newList);
    } catch (error) {
      console.error("Delete failed:", error);
      alert("削除に失敗しました。");
    }
  };

  const handleDuplicate = async (e: React.MouseEvent, list: Checklist) => {
    e.stopPropagation();
    try {
      let content = [];
      try {
          content = JSON.parse(list.content);
      } catch (e) {
          content = [];
      }
      await dataService.createChecklist(`${list.title} (コピー)`, content, list.category);
      await loadData(); // 全データ再取得で順序等を確実に同期
    } catch (error) {
      console.error("Duplicate failed:", error);
      alert("複製に失敗しました。");
    }
  };

  // --- Category Management (Derived from Data) ---
  
  const recalcCategories = (currentLists: Checklist[], additionalCat?: string) => {
      const uniqueCats = new Set<string>(['メイン']);
      currentLists.forEach(l => {
        if (l.category) uniqueCats.add(l.category);
      });
      if (additionalCat) uniqueCats.add(additionalCat);
      
      const sortedCats = Array.from(uniqueCats).sort();
      const finalCats = ['メイン', ...sortedCats.filter(c => c !== 'メイン')];
      setCategories(finalCats);
  };

  const handleStartAddCategory = () => {
    setIsCreatingTab(true);
    setNewTabName('');
  };

  const handleConfirmAddCategory = async () => {
    const name = newTabName.trim();
    if (name) {
        // タブを作成する = そのカテゴリの空リストを作る等の処理ではなく、
        // 今回は「UI上でタブを選択状態にし、次に作成するリストをそのカテゴリにする」フローとする。
        // ただし、データドリブンのため、リストが一つもないカテゴリはリロードで消える仕様になる。
        // これを防ぐため、「タブ作成時はまだ永続化しないが、UIには表示する」状態にする。
        
        if (!categories.includes(name)) {
            setCategories(prev => [...prev, name]);
        }
        setActiveTab(name);
    }
    setIsCreatingTab(false);
  };

  const handleCancelAddCategory = () => {
    setIsCreatingTab(false);
  };

  // カテゴリ削除 = そのカテゴリに含まれる全リストを「メイン」に移動
  const handleDeleteCategory = async (e: React.MouseEvent, cat: string) => {
    e.stopPropagation();
    if (cat === 'メイン') {
        alert("メインタブは削除できません");
        return;
    }
    if (!window.confirm(`「${cat}」タブを削除しますか？\n含まれるリストは「メイン」に移動します。`)) return;
    
    // Optimistic Update
    const itemsToMove = checklists.filter(l => l.category === cat);
    const updatedLists = checklists.map(l => l.category === cat ? { ...l, category: 'メイン' } : l);
    setChecklists(updatedLists);
    recalcCategories(updatedLists);
    setActiveTab('メイン');

    // API Call
    try {
        await Promise.all(itemsToMove.map(item => 
            dataService.updateChecklist(item.id, { category: 'メイン' })
        ));
    } catch (e) {
        console.error("Failed to move items", e);
        loadData(); // Revert on error
    }
  };

  // --- Move List Logic ---
  const openMoveModal = (e: React.MouseEvent, list: Checklist) => {
    e.stopPropagation();
    setMoveTargetList(list);
  };

  const closeMoveModal = () => {
    setMoveTargetList(null);
  };

  const executeMove = async (targetCategory: string) => {
    if (!moveTargetList) return;
    try {
        // Optimistic update
        const updatedLists = checklists.map(l => 
            l.id === moveTargetList.id ? { ...l, category: targetCategory } : l
        );
        setChecklists(updatedLists);
        recalcCategories(updatedLists);

        await dataService.updateChecklist(moveTargetList.id, { category: targetCategory });
    } catch (e) {
        console.error(e);
        alert('移動に失敗しました');
        loadData();
    } finally {
        closeMoveModal();
    }
  };

  // --- Drag and Drop Logic ---
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItemId || draggedItemId === targetId) return;

    const currentTabLists = checklists.filter(c => c.category === activeTab);
    const dragIndex = currentTabLists.findIndex(c => c.id === draggedItemId);
    const hoverIndex = currentTabLists.findIndex(c => c.id === targetId);

    if (dragIndex === -1 || hoverIndex === -1) return;

    // Global indices
    const newChecklists = [...checklists];
    const globalDragIndex = newChecklists.findIndex(c => c.id === draggedItemId);
    const globalHoverIndex = newChecklists.findIndex(c => c.id === targetId);
    
    const draggedItem = newChecklists[globalDragIndex];
    newChecklists.splice(globalDragIndex, 1);
    newChecklists.splice(globalHoverIndex, 0, draggedItem);
    
    setChecklists(newChecklists);
  };

  const handleDragEnd = async () => {
    setDraggedItemId(null);
    const updatedLists = checklists.map((list, index) => ({
        ...list,
        order: index
    }));
    await dataService.reorderChecklists(updatedLists);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch (e) {
      return '';
    }
  };

  const displayedChecklists = checklists.filter(c => c.category === activeTab);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8 flex justify-center font-sans">
      <div className="w-full max-w-4xl flex flex-col h-full relative">
        
        {/* Header Area */}
        <header className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-primary tracking-tight drop-shadow-sm">
              <span className="text-accent">Wiki</span>Check
            </h1>
            <p className="text-primary/70 text-sm font-medium mt-1">スマートなWiki風チェックリスト</p>
          </div>
          
          <button
              onClick={handleCreate}
              disabled={isCreatingList}
              className={`w-full sm:w-auto flex justify-center items-center gap-2 bg-accent text-white px-6 py-3 rounded-xl hover:bg-red-600 transition-all shadow-pop hover:shadow-pop-hover hover:-translate-y-0.5 font-bold ${isCreatingList ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isCreatingList ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} strokeWidth={3} />}
              <span>{isCreatingList ? '作成中...' : '新規リスト作成'}</span>
            </button>
        </header>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto no-scrollbar gap-2 mb-6 pb-2 border-b-2 border-primary/10 items-end">
            {categories.map(cat => (
                <div 
                    key={cat}
                    onClick={() => setActiveTab(cat)}
                    className={`
                        relative flex items-center gap-2 px-5 py-2.5 rounded-t-xl cursor-pointer font-bold whitespace-nowrap transition-all select-none
                        ${activeTab === cat 
                            ? 'bg-primary text-white shadow-sm translate-y-[2px] z-10' 
                            : 'bg-white text-primary/70 hover:bg-blue-50 hover:text-primary border border-transparent'}
                    `}
                >
                    <span>{cat}</span>
                    {cat !== 'メイン' && activeTab === cat && (
                        <button 
                            onClick={(e) => handleDeleteCategory(e, cat)}
                            className="p-0.5 rounded-full hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            ))}
            
            {/* New Tab Input or Button */}
            {isCreatingTab ? (
                 <div className="bg-white px-2 py-1.5 rounded-t-xl border border-primary/20 flex items-center gap-1 shadow-sm translate-y-[2px]">
                    <input 
                        ref={tabInputRef}
                        value={newTabName}
                        onChange={(e) => setNewTabName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleConfirmAddCategory();
                            if (e.key === 'Escape') handleCancelAddCategory();
                        }}
                        onBlur={handleCancelAddCategory} 
                        placeholder="タブ名"
                        className="w-full min-w-[80px] max-w-[120px] text-sm font-bold text-primary outline-none bg-transparent"
                    />
                    <button onClick={handleConfirmAddCategory} className="text-accent hover:bg-red-50 rounded p-0.5">
                        <Check size={16} />
                    </button>
                 </div>
            ) : (
                <button 
                    onClick={handleStartAddCategory}
                    className="px-3 py-2.5 rounded-lg text-primary/60 hover:text-accent hover:bg-red-50 transition-colors font-bold flex items-center mb-[2px]"
                    title="新しいタブを追加"
                >
                    <Plus size={20} strokeWidth={3} />
                </button>
            )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-primary/30" size={40} />
          </div>
        ) : (
          <div className="grid gap-3 pb-20">
            {displayedChecklists.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-primary/20">
                    <p className="text-primary/50 font-medium text-lg">「{activeTab}」にリストがありません</p>
                    <p className="text-primary/30 text-sm mt-2">
                        {activeTab === 'メイン' ? '右上のボタンから作成してください' : 'リストを追加するか、タブを切り替えてください'}
                    </p>
                </div>
            ) : (
              displayedChecklists.map((list) => (
                <div
                  key={list.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, list.id)}
                  onDragOver={(e) => handleDragOver(e, list.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => navigate(`/list/${list.id}`)}
                  className={`
                    group bg-white rounded-xl border-2 border-transparent hover:border-primary/20 p-5 shadow-sm hover:shadow-pop transition-all cursor-pointer flex items-center relative overflow-hidden select-none
                    ${draggedItemId === list.id ? 'opacity-50 scale-[0.98]' : 'opacity-100'}
                  `}
                >
                  {/* Drag Handle */}
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 text-primary/10 group-hover:text-primary/30 cursor-grab active:cursor-grabbing p-2">
                     <GripVertical size={20} />
                  </div>

                  {/* Decorative Border */}
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary group-hover:bg-accent transition-colors"></div>

                  <div className="ml-6 p-3 bg-blue-50 rounded-full mr-5 group-hover:bg-primary group-hover:text-white transition-colors text-primary">
                      <FileText size={24} strokeWidth={2} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-primary truncate pr-4">
                      {list.title || "名称未設定リスト"}
                    </h3>
                    <div className="flex items-center text-xs font-semibold text-primary/50 mt-1">
                      <Calendar size={12} className="mr-1" />
                      {formatDate(list.updatedAt)}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100 absolute right-14 bg-white/95 pl-4 rounded-l-lg z-10">
                    <button
                      onClick={(e) => openMoveModal(e, list)}
                      className="p-2 text-primary/60 hover:text-white hover:bg-primary rounded-lg transition-colors"
                      title="移動"
                    >
                      <FolderInput size={18} />
                    </button>
                    <button
                      onClick={(e) => handleDuplicate(e, list)}
                      className="p-2 text-primary/60 hover:text-white hover:bg-primary rounded-lg transition-colors"
                      title="複製"
                    >
                      <Copy size={18} />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, list.id)}
                      className="p-2 text-accent/80 hover:text-white hover:bg-accent rounded-lg transition-colors"
                      title="削除"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  <div className="text-primary/20 group-hover:text-primary group-hover:translate-x-1 transition-all z-0 ml-2">
                    <ChevronRight size={24} strokeWidth={3} />
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Move Category Modal */}
        {moveTargetList && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/20 backdrop-blur-sm" onClick={closeMoveModal}>
                <div className="bg-white rounded-2xl shadow-pop p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                    <h3 className="text-lg font-bold text-primary mb-4">リストの移動</h3>
                    <p className="text-sm text-secondary mb-4">
                        「{moveTargetList.title}」の移動先を選択してください。
                    </p>
                    <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => executeMove(cat)}
                                className={`
                                    px-4 py-3 rounded-xl text-left font-bold transition-colors flex justify-between items-center
                                    ${activeTab === cat 
                                        ? 'bg-primary/5 text-primary border-2 border-primary/10' 
                                        : 'bg-gray-50 text-secondary hover:bg-blue-50 hover:text-primary'}
                                `}
                            >
                                <span>{cat}</span>
                                {moveTargetList.category === cat && <Check size={16} className="text-accent" />}
                            </button>
                        ))}
                    </div>
                    <button 
                        onClick={closeMoveModal}
                        className="mt-4 w-full py-3 rounded-xl text-primary font-bold hover:bg-gray-50 transition-colors"
                    >
                        キャンセル
                    </button>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default Home;