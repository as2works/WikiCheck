import React, { useRef, useEffect } from 'react';
import { ChecklistItem, NodeType } from '../models/types';
import { ChevronRight, ChevronDown, Check } from 'lucide-react';

interface ChecklistNodeProps {
  item: ChecklistItem;
  index: number;
  isActive: boolean;
  isVisible: boolean;
  hasChildren: boolean;
  onFocus: (index: number) => void;
  onChange: (index: number, updates: Partial<ChecklistItem>) => void;
  onKeyDown: (e: React.KeyboardEvent, index: number) => void;
  onToggleCollapse: (index: number) => void;
}

const ChecklistNode: React.FC<ChecklistNodeProps> = ({
  item,
  index,
  isActive,
  isVisible,
  hasChildren,
  onFocus,
  onChange,
  onKeyDown,
  onToggleCollapse,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [item.text, isVisible]);

  // Focus management
  useEffect(() => {
    if (isActive && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }
  }, [isActive]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    
    // Markdown-style shortcuts for switching types
    if (val === '# ' && item.type !== 'h1') {
      onChange(index, { text: '', type: 'h1' });
      return;
    }
    if (val === '## ' && item.type !== 'h2') {
      onChange(index, { text: '', type: 'h2' });
      return;
    }
    if (val === '### ' && item.type !== 'h3') {
      onChange(index, { text: '', type: 'h3' });
      return;
    }
    
    onChange(index, { text: val });
  };

  if (!isVisible) return null;

  const isHeading = item.type === 'h1' || item.type === 'h2' || item.type === 'h3';
  
  // Styles based on type
  const getTypeStyles = (type: NodeType) => {
    switch (type) {
      case 'h1': return 'text-2xl font-extrabold mt-6 mb-2 text-primary border-b-2 border-accent/20 pb-1';
      case 'h2': return 'text-xl font-bold mt-4 mb-1 text-primary';
      case 'h3': return 'text-lg font-bold mt-2 text-primary';
      default: return 'text-base font-medium text-primary';
    }
  };

  const marginLeft = item.indent * 24; 

  // Determine placeholder based on type
  const getPlaceholder = () => {
    if (item.type === 'h1') return "大見出し...";
    if (item.type === 'h2') return "中見出し...";
    if (item.type === 'h3') return "小見出し...";
    return "タスクを入力...";
  };

  return (
    <div 
      className={`group flex items-start transition-opacity duration-200 ${item.checked && !isHeading ? 'opacity-50 grayscale-[0.5]' : 'opacity-100'}`}
      style={{ paddingLeft: `${marginLeft}px` }}
    >
      {/* Icon / Bullet / Collapse Area */}
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center mr-2 mt-0.5 select-none relative group-hover/bullet">
        
        {/* Collapse Toggle */}
        {(hasChildren) && (
          <button 
            onClick={() => onToggleCollapse(index)}
            className={`absolute -left-6 p-1 text-primary/40 hover:text-accent transition-colors ${item.collapsed ? 'text-accent' : ''}`}
            tabIndex={-1}
            title={item.collapsed ? "展開" : "折りたたみ"}
          >
            {item.collapsed ? <ChevronRight size={18} strokeWidth={3} /> : <ChevronDown size={18} strokeWidth={3} />}
          </button>
        )}

        {/* Checkbox for Tasks */}
        {!isHeading ? (
          <button
            onClick={() => onChange(index, { checked: !item.checked })}
            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-200 shadow-sm ${
              item.checked 
                ? 'bg-accent border-accent text-white' 
                : 'bg-white border-primary/30 hover:border-accent'
            }`}
            tabIndex={-1}
          >
            {item.checked && <Check size={16} strokeWidth={4} />}
          </button>
        ) : (
           null
        )}
      </div>

      {/* Text Content */}
      <textarea
        ref={textareaRef}
        value={item.text}
        onChange={handleChange}
        onKeyDown={(e) => onKeyDown(e, index)}
        onFocus={() => onFocus(index)}
        placeholder={getPlaceholder()}
        rows={1}
        className={`flex-1 bg-transparent resize-none outline-none overflow-hidden placeholder-primary/20 ${getTypeStyles(item.type)} ${item.checked && !isHeading ? 'line-through decoration-accent/50 decoration-2' : ''}`}
        spellCheck={false}
      />
      
      {/* Active Indicator (Mobile helper) */}
      {isActive && <div className="absolute left-0 w-1 h-full bg-accent -z-10 rounded-r opacity-30" />}
    </div>
  );
};

export default React.memo(ChecklistNode);