export const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '0';
  return new Intl.NumberFormat('en-TZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatPhoneDisplay = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 12 && cleaned.startsWith('255')) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    return `+255 ${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
};

export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-TZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const formatTimeAgo = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return formatDate(dateString);
};

export const getPaymentStatusColor = (status) => {
  const colors = {
    initiated: 'text-yellow-500',
    pending: 'text-yellow-500',
    processing: 'text-blue-500',
    successful: 'text-green-500',
    failed: 'text-red-500',
    cancelled: 'text-gray-500',
    expired: 'text-orange-500',
  };
  return colors[status] || 'text-gray-500';
};

export const getPaymentStatusBgColor = (status) => {
  const colors = {
    initiated: 'bg-yellow-500/10',
    pending: 'bg-yellow-500/10',
    processing: 'bg-blue-500/10',
    successful: 'bg-green-500/10',
    failed: 'bg-red-500/10',
    cancelled: 'bg-gray-500/10',
    expired: 'bg-orange-500/10',
  };
  return colors[status] || 'bg-gray-500/10';
};

export const formatName = (name) => {
  if (!name) return "";

  // Remove emojis
  const noEmojis = name.replace(
    /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu,
    ""
  );

  // Trim extra spaces
  const trimmed = noEmojis.trim();

  // Capitalize first character
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};
