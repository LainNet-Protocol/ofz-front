import React from 'react';

interface WalletConnectionAlertProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalletConnectionAlert({ isOpen, onClose }: WalletConnectionAlertProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-lg">
        <div className="flex flex-col items-center text-center">
          {/* Warning Icon */}
          <div className="mb-4">
            <svg 
              width="48" 
              height="48" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="text-red-500"
            >
              <path 
                d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" 
                stroke="currentColor" 
                strokeWidth="2"
              />
              <path 
                d="M12 8V12" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round"
              />
              <circle 
                cx="12" 
                cy="16" 
                r="1" 
                fill="currentColor"
              />
            </svg>
          </div>

          {/* Title */}
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No Web3 Wallet Detected
          </h3>

          {/* Description */}
          <p className="text-gray-600 mb-6">
            Please install MetaMask or another Web3 wallet to continue.
          </p>

          {/* Install Button */}
          <a
            href="https://metamask.io/download/"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#E2761B] hover:bg-[#D2691E] text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200 mb-4"
          >
            Install MetaMask
          </a>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
} 