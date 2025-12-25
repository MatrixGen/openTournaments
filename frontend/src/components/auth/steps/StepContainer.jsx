export default function StepContainer({ 
  icon: Icon, 
  title, 
  subtitle, 
  description, 
  children 
}) {
  return (
    <div className="p-6 sm:p-8">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="flex-shrink-0">
          <div className="p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20">
            <Icon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-900 dark:text-white">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      {description && (
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
          {description}
        </p>
      )}

      {/* Content */}
      {children}
    </div>
  );
}