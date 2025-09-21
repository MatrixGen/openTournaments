export default function FormField({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-white">
        {label}
      </label>
      <div className="mt-1">
        {children}
        {error && (
          <p className="mt-1 text-sm text-red-400">{error}</p>
        )}
      </div>
    </div>
  );
}