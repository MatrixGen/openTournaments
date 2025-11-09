import { EnvelopeIcon } from '@heroicons/react/24/outline';
import StepContainer from './StepContainer';

export default function EmailStep({ formData, updateFormData }) {
  return (
    <StepContainer
      icon={EnvelopeIcon}
      title="📨 Almost there!"
      subtitle="Let’s confirm your contact address"
      description="We’ll send you a friendly verification email to activate your account and keep it secure. Don’t worry — we respect your privacy and never share your email."
      tips={[
        "Make sure it's a real, active email address",
        "You’ll receive a confirmation link instantly",
        "Your email helps us keep your account safe and recoverable"
      ]}
    >
      <div className="mt-6">
        <label htmlFor="email" className="block text-sm font-semibold text-white mb-2">
          Enter your email address
        </label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => updateFormData('email', e.target.value)}
          placeholder="e.g., youremail@example.com"
          className="block w-full rounded-xl border border-neutral-600 bg-neutral-800 py-3 px-5 text-white placeholder-gray-400 focus:border-gradient-to-r focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 sm:text-sm shadow-md transition-all duration-300"
          autoFocus
        />
        <p className="mt-2 text-xs text-neutral-400">
          Tip: Use the same email you check often — that’s where we’ll send important updates and verification links.
        </p>
      </div>
    </StepContainer>
  );
}
