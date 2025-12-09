import { UserIcon } from '@heroicons/react/24/outline';
import StepContainer from './StepContainer';

export default function WelcomeStep({ formData, updateFormData }) {
  return (
    <StepContainer
      icon={UserIcon}
      title="🎉 Welcome, Future Champion!"
      subtitle="Let's create your unique identity"
      description="We’re thrilled to have you join our community. Your username is your digital handshake—make it shine and let others recognize you instantly!"
      tips={[
        "Keep it between 3-20 characters",
        "Use letters, numbers, or underscores",
        "This will be your permanent identity"
      ]}
    >
      <div className="mt-6">
        <label htmlFor="username" className="block text-sm font-semibold text-white mb-2">
          Your username
        </label>
        <input
          id="username"
          type="text"
          value={formData.username}
          onChange={(e) => updateFormData('username', e.target.value)}
          placeholder="e.g., AlexTheGreat"
          className="block w-full rounded-xl border border-neutral-600 bg-neutral-800 py-3 px-5 text-white placeholder-gray-400 focus:border-gradient-to-r focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 sm:text-sm shadow-md transition-all duration-300"
          autoFocus
        />
        <p className="mt-2 text-xs text-neutral-400">
          Tip: Make it creative! This is how your fellow gamers will remember you.
        </p>
      </div>
    </StepContainer>
  );
}
