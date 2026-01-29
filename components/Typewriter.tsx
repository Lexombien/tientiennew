import React, { useState, useEffect } from 'react';

interface TypewriterProps {
  texts: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseDuration?: number;
}

export const Typewriter: React.FC<TypewriterProps> = ({ 
  texts, 
  typingSpeed = 100, 
  deletingSpeed = 50,
  pauseDuration = 2000 
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [textIndex, setTextIndex] = useState(0);
  
  useEffect(() => {
    // Safety check
    if (!texts || texts.length === 0) return;

    const currentFullText = texts[textIndex % texts.length];
    
    const handleTyping = () => {
      setDisplayedText(prev => {
        if (isDeleting) {
          return currentFullText.substring(0, prev.length - 1);
        } else {
          return currentFullText.substring(0, prev.length + 1);
        }
      });

      // Logic for changing state
      if (!isDeleting && displayedText === currentFullText) {
        // Finished typing, wait then delete
        setTimeout(() => setIsDeleting(true), pauseDuration);
      } else if (isDeleting && displayedText === '') {
        // Finished deleting, move to next text
        setIsDeleting(false);
        setTextIndex(prev => (prev + 1) % texts.length);
      }
    };

    // Calculate speed
    let speed = typingSpeed;
    if (isDeleting) speed = deletingSpeed;
    if (!isDeleting && displayedText === currentFullText) return; // Don't set normal timeout if pausing

    const timer = setTimeout(handleTyping, speed);
    return () => clearTimeout(timer);
  }, [displayedText, isDeleting, textIndex, texts, typingSpeed, deletingSpeed, pauseDuration]);

  // Fix: When text changes (e.g. from props), reset if needed, but here we just depend on state.
  // The effect above depends on displayedText, so it runs on every update.
  
  return (
    <span className="font-medium text-pink-600 text-sm whitespace-nowrap overflow-hidden text-ellipsis">
      {displayedText}
      <span className="animate-pulse ml-0.5 border-r-2 border-pink-400 h-4 inline-block align-middle"></span>
    </span>
  );
};
