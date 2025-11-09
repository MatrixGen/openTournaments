import Banner from "../../common/Banner";

export default function StepContainer({
  icon: Icon,
  title,
  subtitle,
  description,
  tips = [],
  children
}) {
  return (
    <>
      {/* Step Header */}
      <div className="text-center mb-8">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary-500/20 mb-4">
          <Icon className="h-8 w-8 text-primary-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
        <p className="text-primary-300 font-medium mb-1">{subtitle}</p>
        <p className="text-gray-400 text-sm">{description}</p>
      </div>

      {/* Quick Tips Banner */}
      {tips.length > 0 && (
        <div className="mb-6">
          <Banner
            type="info"
            title="💡 Quick Tips"
            message={
              <ul className="list-disc pl-5 space-y-1">
                {tips.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            }
            autoDismiss={false}
            dismissible={true}
            compact={true}
          />
        </div>
      )}

      {/* Step Content */}
      {children}
    </>
  );
}
