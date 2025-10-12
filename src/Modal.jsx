function Modal({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel", type = "confirm" }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70 backdrop-blur-sm">
      <div className="bg-gray-900 border-2 border-red-600 rounded-2xl shadow-2xl shadow-red-900/50 max-w-md w-full p-6 animate-fadeIn">
        <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
        <p className="text-gray-300 mb-6 leading-relaxed">{message}</p>
        
        <div className="flex gap-3">
          {type === 'confirm' && (
            <>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition shadow-lg"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition shadow-lg shadow-red-900/50"
              >
                {confirmText}
              </button>
            </>
          )}
          
          {type === 'alert' && (
            <button
              onClick={onClose}
              className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition shadow-lg shadow-red-900/50"
            >
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Modal;