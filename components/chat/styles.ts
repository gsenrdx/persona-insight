export const chatStyles = `
  .loading-dots {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .loading-dots div {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #6366f1;
    opacity: 0.6;
  }
  
  .loading-dots div:nth-child(1) {
    animation: dot-fade 1.4s ease-in-out 0s infinite;
  }
  
  .loading-dots div:nth-child(2) {
    animation: dot-fade 1.4s ease-in-out 0.2s infinite;
  }
  
  .loading-dots div:nth-child(3) {
    animation: dot-fade 1.4s ease-in-out 0.4s infinite;
  }
  
  @keyframes dot-fade {
    0%, 100% {
      opacity: 0.3;
      transform: scale(0.8);
    }
    50% {
      opacity: 1;
      transform: scale(1.2);
    }
  }
  
  .thinking-text {
    background: linear-gradient(
      90deg,
      #9ca3af 0%,
      #374151 50%,
      #9ca3af 100%
    );
    background-size: 200% auto;
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: shimmer 2s linear infinite;
  }
  
  .dark .thinking-text {
    background: linear-gradient(
      90deg,
      #6b7280 0%,
      #e5e7eb 50%,
      #6b7280 100%
    );
    background-size: 200% auto;
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  
  @keyframes shimmer {
    0% {
      background-position: -200% center;
    }
    100% {
      background-position: 200% center;
    }
  }
`