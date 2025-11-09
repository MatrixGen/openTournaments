import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import StepNavigation from './StepNavigation';
import {
  WelcomeStep,
  EmailStep,
  PhoneStep,
  PasswordStep,
  CompletionStep
} from './signupSteps';
import Banner from '../common/Banner';

const STEPS = [
  { key: 'welcome', component: WelcomeStep },
  { key: 'email', component: EmailStep },
  { key: 'phone', component: PhoneStep },
  { key: 'password', component: PasswordStep },
];

export default function SignupWizard({ onSignup, error, isLoading, onErrorClear }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0); // 1 for next, -1 for back
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone_number: '',
    password: '',
    confirmPassword: ''
  });

  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNext = async () => {
    setDirection(1);
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      const success = await onSignup(formData);
      if (success) setCurrentStep(STEPS.length);
    }
  };

  const handleBack = () => {
    setDirection(-1);
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (currentStep === STEPS.length) {
    return <CompletionStep />;
  }

  const CurrentStepComponent = STEPS[currentStep].component;

  const variants = {
    enter: (direction) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0,
      position: 'absolute'
    }),
    center: {
      x: 0,
      opacity: 1,
      position: 'relative'
    },
    exit: (direction) => ({
      x: direction > 0 ? -100 : 100,
      opacity: 0,
      position: 'absolute'
    })
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-neutral-900 py-12 sm:px-6 lg:px-8 overflow-hidden">
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative">
        <div className="bg-neutral-800 py-8 px-6 shadow-2xl sm:rounded-2xl sm:px-8 border border-neutral-700 relative overflow-hidden min-h-[420px]">
          {/* Error Banner */}
          {error && (
            <Banner
              type="error"
              title="Something went wrong"
              message={error}
              onClose={onErrorClear}
              className="mb-6"
            />
          )}

          {/* Steps Transition */}
          <AnimatePresence custom={direction} mode="wait">
            <motion.div
              key={currentStep}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
            >
              <CurrentStepComponent
                formData={formData}
                updateFormData={updateFormData}
              />
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <StepNavigation
            currentStep={currentStep}
            totalSteps={STEPS.length}
            onBack={handleBack}
            onNext={handleNext}
            isLoading={isLoading}
            formData={formData}
          />

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-medium text-primary-400 hover:text-primary-300 hover:underline transition-colors"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
