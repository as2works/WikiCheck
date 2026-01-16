import React from 'react';
import { Indent, Outdent, Heading1, Heading2, CheckSquare, Trash2 } from 'lucide-react';
import { NodeType } from '../models/types';

interface FloatingToolbarProps {
  onIndent: () => void;
  onOutdent: () => void;
  onSetType: (type: NodeType) => void;
  onDelete: () => void;
  currentType: NodeType;
  isVisible: boolean;
}

const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  onIndent,
  onOutdent,
  onSetType,
  onDelete,
  currentType,
  isVisible
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-3 bg-white border-t-2 border-primary/10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 flex justify-around items-center md:hidden pb-safe">
      <div className="flex space-x-2">
        <button onClick={onOutdent} className="p-3 rounded-xl bg-gray-50 text-primary border-2 border-transparent hover:border-primary/20 active:bg-blue-50 transition-colors">
          <Outdent size={20} strokeWidth={2.5} />
        </button>
        <button onClick={onIndent} className="p-3 rounded-xl bg-gray-50 text-primary border-2 border-transparent hover:border-primary/20 active:bg-blue-50 transition-colors">
          <Indent size={20} strokeWidth={2.5} />
        </button>
      </div>

      <div className="w-0.5 h-8 bg-primary/10 mx-1" />

      <div className="flex space-x-2">
        <button 
          onClick={() => onSetType(currentType === 'h1' ? 'task' : 'h1')} 
          className={`p-3 rounded-xl border-2 transition-all ${currentType === 'h1' ? 'text-white bg-primary border-primary' : 'text-primary bg-gray-50 border-transparent'}`}
        >
          <Heading1 size={20} strokeWidth={2.5} />
        </button>
        <button 
          onClick={() => onSetType(currentType === 'h2' ? 'task' : 'h2')} 
          className={`p-3 rounded-xl border-2 transition-all ${currentType === 'h2' ? 'text-white bg-primary border-primary' : 'text-primary bg-gray-50 border-transparent'}`}
        >
          <Heading2 size={20} strokeWidth={2.5} />
        </button>
        <button 
          onClick={() => onSetType('task')} 
          className={`p-3 rounded-xl border-2 transition-all ${currentType === 'task' ? 'text-white bg-primary border-primary' : 'text-primary bg-gray-50 border-transparent'}`}
        >
          <CheckSquare size={20} strokeWidth={2.5} />
        </button>
      </div>

      <div className="w-0.5 h-8 bg-primary/10 mx-1" />

      <button onClick={onDelete} className="p-3 rounded-xl text-accent hover:bg-red-50 active:bg-red-100 border-2 border-transparent hover:border-accent/20 transition-colors">
        <Trash2 size={20} strokeWidth={2.5} />
      </button>
    </div>
  );
};

export default FloatingToolbar;