import React, { useState, useEffect } from 'react';

const TIPS = [
  'Change view to Gallery to automatically see your file previews.',
  'Right click to see all available options.',
  'Right-click on files to access quick actions like copy, move, or delete.',
  'Use keyboard shortcuts: Ctrl+A to select all, Ctrl+C to copy, Ctrl+X to cut.',
  'Enable Trash in connection settings to recover accidentally deleted files.',
  'Drag and drop files directly into BucketStack to upload them instantly.',
  'Create buckets and organize your files with folders for better file management.',
  'Use the search feature to quickly find files by name across your bucket.',
  'Enable Activity Log in connection settings to track all operations performed.',
  'Transfer files between different S3 providers without downloading locally.',
];

interface TipCarouselProps {
  className?: string;
}

export const TipCarousel: React.FC<TipCarouselProps> = ({ className = '' }) => {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setFadeOut(true);
      setTimeout(() => {
        setCurrentTipIndex((prev) => (prev + 1) % TIPS.length);
        setFadeOut(false);
      }, 300); // Match fade duration
    }, 5000); // Show each tip for 5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`text-[10px] italic transition-opacity duration-300 ${fadeOut ? 'opacity-0' : 'opacity-60'} ${className}`}>
      💡 Tip: {TIPS[currentTipIndex]}
    </div>
  );
};
