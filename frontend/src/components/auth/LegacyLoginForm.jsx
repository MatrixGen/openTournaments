/**
 * Legacy Login Form (Username/Phone/Email via backend)
 */
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  EnvelopeIcon, 
  UserIcon, 
  PhoneIcon, 
  LockClosedIcon, 
  EyeIcon, 
  EyeSlashIcon,
  ArrowRightIcon 
} from '@heroicons/react/24/outline';
import SubmitButton from './SubmitButton';
import LoadingSpinner from '../common/LoadingSpinner';

const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, { message: "Please enter your email, username, or phone number" })
    .refine(
      (val) => {
        const trimmed = val.trim();
        return (
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ||
          /^[a-zA-Z0-9_]{3,30}$/.test(trimmed) ||
          /^\+?[1-9]\d{9,14}$/.test(trimmed)
        );
      },
      {
        message: "Please enter a valid email, username (3-30 chars), or phone number",
      }
    ),
  password: z
    .string()
    .min(1, { message: "Password is required" })
    .min(8, { message: "Password must be at least 8 characters" }),
  rememberMe: z.boolean().optional(),
});

const detectIdentifierType = (value) => {
  const trimmed = value.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "email";
  if (/^\+?[1-9]\d{9,14}$/.test(trimmed)) return "phone";
  if (/^[a-zA-Z0-9_]{3,30}$/.test(trimmed)) return "username";
  return "email";
};

const getIdentifierIcon = (type) => {
  switch (type) {
    case "phone": return PhoneIcon;
    case "username": return UserIcon;
    default: return EnvelopeIcon;
  }
};

const getIdentifierPlaceholder = (type) => {
  switch (type) {
    case "phone": return "+1 (555) 123-4567";
    case "username": return "username123";
    default: return "name@example.com";
  }
};

export default function LegacyLoginForm({ isLoading, onSubmit, onBack }) {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid, isDirty },
  } = useForm({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: {
      identifier: "",
      password: "",
      rememberMe: false,
    },
  });

  const identifierValue = watch("identifier");
  const identifierType = useMemo(
    () => identifierValue?.length > 2 ? detectIdentifierType(identifierValue) : "email",
    [identifierValue]
  );

  const Icon = getIdentifierIcon(identifierType);

  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-1"
      >
        ← Back
      </button>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label htmlFor="identifier" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Email, Username, or Phone
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="identifier"
              type="text"
              autoComplete="username"
              placeholder={getIdentifierPlaceholder(identifierType)}
              className={`pl-10 w-full rounded-lg border bg-white dark:bg-neutral-700 py-3 px-4 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 text-sm transition-colors ${
                errors.identifier
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 dark:border-neutral-600 focus:border-primary-500 focus:ring-primary-500"
              }`}
              {...register("identifier")}
            />
          </div>
          {errors.identifier && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {errors.identifier.message}
            </p>
          )}
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <span>Auto-detected: </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-neutral-700 rounded">
              <Icon className="h-3 w-3" />
              <span className="capitalize">{identifierType}</span>
            </span>
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <LockClosedIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className={`pl-10 pr-10 w-full rounded-lg border bg-white dark:bg-neutral-700 py-3 px-4 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 text-sm transition-colors ${
                errors.password
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 dark:border-neutral-600 focus:border-primary-500 focus:ring-primary-500"
              }`}
              {...register("password")}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              id="rememberMe"
              className="w-4 h-4 rounded border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-primary-500 focus:ring-primary-500"
              {...register("rememberMe")}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
              Remember me
            </span>
          </label>

          <Link
            to="/password-reset"
            className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 hover:underline transition-colors"
          >
            Forgot password?
          </Link>
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
      </form>
    </>
  );
}
