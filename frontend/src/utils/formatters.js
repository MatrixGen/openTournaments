// utils/formatters.js

/**
 * Format currency with commas
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-TZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format phone number for display (255712345678 -> 0712 345 678)
 */
export const formatPhoneDisplay = (phone) => {
  if (!phone) return '';
  
  const digits = phone.replace(/\D/g, '');
  
  if (digits.startsWith('255')) {
    const localNumber = `0${digits.slice(3)}`;
    // Format as 0712 345 678
    return `${localNumber.slice(0, 4)} ${localNumber.slice(4, 7)} ${localNumber.slice(7)}`;
  }
  
  // If it's already a local number
  if (digits.startsWith('0')) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  
  return phone;
};

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (date) => {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return new Date(date).toLocaleDateString();
};