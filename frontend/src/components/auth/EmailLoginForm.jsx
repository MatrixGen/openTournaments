/**
 * Firebase Email/Password Login Form
 */
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import TextField from './TextField';
import SubmitButton from './SubmitButton';
import LoadingSpinner from '../common/LoadingSpinner';

const emailLoginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function EmailLoginForm({ isLoading, onSubmit, onForgotPassword, onSwitchToLegacy }) {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty },
  } = useForm({
    resolver: zodResolver(emailLoginSchema),
    mode: "onChange",
    defaultValues: { email: "", password: "" },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <TextField
        id="email"
        label="Email Address"
        type="email"
        placeholder="name@example.com"
        register={register("email")}
        error={errors.email}
        icon={EnvelopeIcon}
        autoComplete="email"
      />

      <TextField
        id="email-password"
        label="Password"
        type={showPassword ? "text" : "password"}
        placeholder="Enter your password"
        register={register("password")}
        error={errors.password}
        icon={LockClosedIcon}
        autoComplete="current-password"
        rightAction={
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
          </button>
        }
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onForgotPassword}
          className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 hover:underline transition-colors"
        >
          Forgot password?
        </button>
      </div>

      <SubmitButton disabled={isLoading || !isValid || !isDirty}>
        {isLoading ? (
          <>
            <LoadingSpinner size="sm" className="mr-2" />
            Signing In...
          </>
        ) : (
          <>
            Sign In
            <ArrowRightIcon className="ml-2 h-4 w-4" />
          </>
        )}
      </SubmitButton>

      {/* Switch to Legacy */}
      <div className="relative pt-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200 dark:border-neutral-600" />
        </div>
        <div className="relative flex justify-center text-xs">
          <button
            type="button"
            onClick={onSwitchToLegacy}
            className="px-3 bg-white dark:bg-neutral-800 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            Use username or phone instead
          </button>
        </div>
      </div>
    </form>
  );
}
