// src/components/VerificationBanner.jsx
import { useAuth } from '../../contexts/AuthContext';
import Banner from '../common/Banner';

export default function VerificationBanner() {
  const { user } = useAuth();

  if (!user || user.email_verified) {
    return null;
  }

  return (
    <Banner
      type="warning"
      title="Email Verification Required"
      message="Please verify your email address to access all features."
      action={{
        text: 'Verify Email',
        to: '/verify-email'
      }}
    />
  );
}