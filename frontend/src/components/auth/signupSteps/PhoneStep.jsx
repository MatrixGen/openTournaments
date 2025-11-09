import { PhoneIcon } from '@heroicons/react/24/outline';
import StepContainer from './StepContainer';

export default function PhoneStep({ formData, updateFormData }) {
  return (
    <StepContainer
      icon={PhoneIcon}
      title="📱 Want extra security?"
      subtitle="Add your phone number (optional but wise)"
      description="Your phone helps us protect your account with two-step verification and easy recovery if you ever lose access. We’ll never share it — it’s purely for your safety."
      tips={[
        "Completely optional, but highly recommended",
        "You can verify it later via SMS",
        "Adds an extra shield to your account"
      ]}
    >
      <div className="mt-6">
        <label htmlFor="phone_number" className="block text-sm font-semibold text-white mb-2">
          Enter your phone number
        </label>
        <input
          id="phone_number"
          type="tel"
          value={formData.phone_number}
          onChange={(e) => updateFormData('phone_number', e.target.value)}
          placeholder="+255 712 345 678"
          className="block w-full rounded-xl border border-neutral-600 bg-neutral-800 py-3 px-5 text-white placeholder-gray-400 focus:border-gradient-to-r focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 sm:text-sm shadow-md transition-all duration-300"
          autoFocus
        />
        <p className="mt-2 text-xs text-neutral-400">
          Tip: Use your active mobile number — you’ll get verification codes and recovery messages here if needed.
        </p>
      </div>
    </StepContainer>
  );
}
