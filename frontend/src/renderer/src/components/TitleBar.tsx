import React from 'react';
import { Cross2Icon, MinusIcon, BoxIcon } from '@radix-ui/react-icons';
import AeroLogo from './AeroLogo';

const TitleBar = () => {
  // Check if running in Electron
  const isElectron = typeof window !== 'undefined' && (window as any).electron;

  if (!isElectron) return null;

  const handleMinimize = () => {
    if (isElectron) (window as any).electron.ipcRenderer.send('window-minimize');
  };

  const handleMaximize = () => {
    if (isElectron) (window as any).electron.ipcRenderer.send('window-maximize');
  };

  const handleClose = () => {
    if (isElectron) (window as any).electron.ipcRenderer.send('window-close');
  };

  return (
    <div
      onDoubleClick={handleMaximize}
      className="h-8 bg-theme-surface/90 backdrop-blur-md flex items-center justify-between select-none border-b border-theme-border sticky top-0 z-[9999] title-bar-drag"
    >
      <div className="flex items-center px-3 gap-2 pointer-events-none">
        <AeroLogo size="xs" animated={false} />
        <span className="text-[10px] font-bold text-theme-textSecondary uppercase tracking-widest opacity-80">
          AeroAgencia • Flight & Hotel Suite
        </span>
      </div>

      <div className="flex items-center h-full no-drag">
        <button
          onClick={handleMinimize}
          className="h-full px-4 flex items-center justify-center text-theme-textSecondary hover:bg-theme-background/50 hover:text-theme-text transition-colors"
          title="Minimizar"
        >
          <MinusIcon className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className="h-full px-4 flex items-center justify-center text-theme-textSecondary hover:bg-theme-background/50 hover:text-theme-text transition-colors"
          title="Maximizar"
        >
          <BoxIcon className="w-3 h-3" />
        </button>
        <button
          onClick={handleClose}
          className="h-full px-4 flex items-center justify-center text-theme-textSecondary hover:bg-red-500 hover:text-white transition-all group"
          title="Cerrar"
        >
          <Cross2Icon className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
