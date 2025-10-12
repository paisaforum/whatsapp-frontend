import { useEffect } from 'react';

function Toast({ message, type = 'success', isOpen, onClose, duration = 3000 }) {
  useEffect(() => {
    if (isOpen && duration) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const styles = {
    success: {
      bg: 'bg-gradient-to-r from-green-600 to-green-700',
      border: 'border-green-500',
      icon: '✓'
    },
    error: {
      bg: 'bg-gradient-to-r from-red-600 to-red-700',
      border: 'border-red-500',
      icon: '✕'
    },
    info: {
      bg: 'bg-gradient-to-r from-gray-700 to-gray-800',
      border: 'border-gray-600',
      icon: 'ℹ'
    }
  };

  const style = styles[type] || styles.info;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slideIn">
      <div className={`${style.bg} border-2 ${style.border} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 min-w-[300px] max-w-md backdrop-blur-lg`}>
        <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-xl font-bold">{style.icon}</span>
        </div>
        <p className="flex-1 font-medium">{message}</p>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 font-bold text-2xl leading-none transition"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default Toast;