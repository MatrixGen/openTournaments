const AlertMessage = ({ type, message, onDismiss }) => {
  if (!message) return null;

  const styles = {
    error: 'bg-red-800/50 border border-red-600/50 text-red-200',
    success: 'bg-green-800/50 border border-green-600/50 text-green-200'
  };

  const icons = {
    error: '⚠️',
    success: '✅'
  };

  return (
    <div className={`mb-4 sm:mb-6 rounded-lg py-3 px-4 text-sm flex items-center justify-between ${styles[type]}`}>
      <div className="flex items-center">
        <span className="mr-2">{icons[type]}</span>
        {message}
      </div>
      <button
        onClick={onDismiss}
        className="ml-4 text-lg hover:opacity-70 transition-opacity"
      >
        ×
      </button>
    </div>
  );
};

export default AlertMessage;