export default function Alert({ type, message }) {
  if (!message) return null;
  
  const alertClasses = {
    error: "mb-6 rounded-md bg-red-800/50 py-3 px-4 text-sm text-red-200",
    success: "mb-6 rounded-md bg-green-800/50 py-3 px-4 text-sm text-green-200"
  };
  
  return (
    <div className={alertClasses[type]}>
      {message}
    </div>
  );
}