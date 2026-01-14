
import React, { useState } from 'react';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ text, label, className = "" }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy!", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
        copied 
          ? "bg-green-600 text-white" 
          : "bg-blue-600 hover:bg-blue-500 text-white"
      } ${className}`}
    >
      <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
      <span>{copied ? 'Copied!' : (label || 'Copy')}</span>
    </button>
  );
};

export default CopyButton;
