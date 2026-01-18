import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { authService } from "../../services/authService";
import AuthMethodSelector from "../../components/auth/AuthMethodSelector";
import StatusBanners from "../../components/auth/StatusBanners";
import GoogleLoginSection from "../../components/auth/GoogleLoginSection";
import EmailLoginForm from "../../components/auth/EmailLoginForm";
import LegacyLoginForm from "../../components/auth/LegacyLoginForm";
import ForgotPasswordModal from "../../components/auth/ForgotPasswordModal";

const AUTH_METHODS = {
  GOOGLE: 'google',
  EMAIL: 'email',
  LEGACY: 'legacy',
};

export default function Login() {
  const [authMethod, setAuthMethod] = useState(AUTH_METHODS.GOOGLE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const { login, loginWithFirebase, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Helper to reset state before auth attempt
  const beginAuthAttempt = useCallback(() => {
    setIsLoading(true);
    setError("");
    setSuccess("");
    setNeedsEmailVerification(false);
  }, []);

  // Handle legacy form submission
  const handleLegacySubmit = useCallback(
    async (data) => {
      beginAuthAttempt();

      try {
        const cleanedData = {
          ...data,
          identifier: data.identifier.trim(),
        };

        const response = await authService.login(cleanedData);
        login(response);

        if (data.rememberMe) {
          localStorage.setItem("rememberLogin", "true");
        }

        setSuccess("Login successful! Redirecting...");
        setTimeout(() => navigate("/dashboard", { replace: true }), 1500);
      } catch (err) {
        console.error("Login error:", err);

        const status = err.response?.status;
        let message = "Login failed. Please try again";

        if (status === 401) {
          message = "Invalid credentials. Please check your email/username and password.";
        } else if (status === 403) {
          message = "Account not verified. Please check your email for verification.";
        } else if (status === 404) {
          message = "Account not found. Please check your credentials or sign up.";
        } else if (status === 429) {
          message = "Too many attempts. Please try again in a few minutes.";
        } else if (err.response?.data?.message) {
          message = err.response.data.message;
        }

        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [beginAuthAttempt, login, navigate]
  );

  // Handle Firebase email login
  const handleEmailSubmit = useCallback(
    async (data) => {
      beginAuthAttempt();

      try {
        const result = await authService.signInWithEmail(data.email, data.password);

        if (result.needsEmailVerification) {
          setNeedsEmailVerification(true);
          setError("Please verify your email address before signing in. Check your inbox for a verification link.");
          setIsLoading(false);
          return;
        }

        loginWithFirebase(result);
        setSuccess("Login successful! Redirecting...");
        setTimeout(() => navigate("/dashboard", { replace: true }), 1500);
      } catch (err) {
        console.error("Firebase email login error:", err);

        let message = "Login failed. Please try again.";

        if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
          message = "Invalid email or password. Please try again.";
        } else if (err.code === 'auth/invalid-credential') {
          message = "Invalid credentials. Please check your email and password.";
        } else if (err.code === 'auth/too-many-requests') {
          message = "Too many failed attempts. Please try again later or reset your password.";
        } else if (err.code === 'auth/user-disabled') {
          message = "This account has been disabled. Please contact support.";
        } else if (err.message) {
          message = err.message;
        }

        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [beginAuthAttempt, loginWithFirebase, navigate]
  );

  // Resend verification email
  const handleResendVerification = useCallback(async () => {
    try {
      await authService.resendEmailVerification();
      setSuccess("Verification email sent! Please check your inbox.");
      setError("");
    } catch (err) {
      console.error("Failed to resend verification:", err);
      setError("Failed to send verification email. Please try again.");
    }
  }, []);

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center bg-gradient-to-b from-gray-50 to-white dark:from-neutral-900 dark:to-neutral-950 transition-colors py-6 sm:py-12">
      <div className="mx-auto w-full max-w-md px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Welcome Back
          </h1>
        </div>

        {/* Auth Card */}
        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-lg border border-gray-200 dark:border-neutral-700 overflow-hidden">
          {/* Card Header */}
          <div className="px-6 sm:px-8 pt-6 sm:pt-8">
            <h2 className="text-center text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
              Sign In
            </h2>

            {/* Auth Method Selector */}
            <AuthMethodSelector 
              authMethod={authMethod}
              onMethodChange={setAuthMethod}
            />
          </div>

          {/* Form Content */}
          <div className="px-6 sm:px-8 py-6">
            <StatusBanners
              error={error}
              success={success}
              needsEmailVerification={needsEmailVerification}
              onClearError={() => setError("")}
              onResendVerification={handleResendVerification}
            />

            {/* Google Sign-In */}
            {authMethod === AUTH_METHODS.GOOGLE && (
              <GoogleLoginSection 
                onSwitchToLegacy={() => setAuthMethod(AUTH_METHODS.LEGACY)}
              />
            )}

            {/* Email Sign-In (Firebase) */}
            {authMethod === AUTH_METHODS.EMAIL && (
              <EmailLoginForm
                isLoading={isLoading}
                onSubmit={handleEmailSubmit}
                onForgotPassword={() => setShowForgotPassword(true)}
                onSwitchToLegacy={() => setAuthMethod(AUTH_METHODS.LEGACY)}
              />
            )}

            {/* Legacy Sign-In (Username/Phone) */}
            {authMethod === AUTH_METHODS.LEGACY && (
              <LegacyLoginForm
                isLoading={isLoading}
                onSubmit={handleLegacySubmit}
                onBack={() => setAuthMethod(AUTH_METHODS.GOOGLE)}
              />
            )}
          </div>

          {/* Card Footer */}
          <div className="px-6 sm:px-8 py-6 bg-gray-50 dark:bg-neutral-700/30 border-t border-gray-200 dark:border-neutral-700">
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 hover:underline transition-colors"
              >
                Create account
              </Link>
            </p>
          </div>
        </div>

        {/* Forgot Password Modal */}
        <ForgotPasswordModal
          isOpen={showForgotPassword}
          onClose={() => setShowForgotPassword(false)}
        />
      </div>
    </div>
  );
}
