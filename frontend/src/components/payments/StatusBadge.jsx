import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,

} from "@heroicons/react/24/outline";

// Status badge component - Mobile Optimized (unchanged)
const StatusBadge = ({ status }) => {
  const statusConfig = {
    initiated: { 
      color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300", 
      text: "Initiated", 
      icon: ClockIcon 
    },
    pending: { 
      color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300", 
      text: "Pending", 
      icon: ClockIcon 
    },
    processing: { 
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300", 
      text: "Processing", 
      icon: ArrowPathIcon 
    },
    successful: { 
      color: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300", 
      text: "Successful", 
      icon: CheckCircleIcon 
    },
    failed: { 
      color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300", 
      text: "Failed", 
      icon: XCircleIcon 
    },
    cancelled: { 
      color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300", 
      text: "Cancelled", 
      icon: XCircleIcon 
    },
    expired: { 
      color: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300", 
      text: "Expired", 
      icon: ExclamationTriangleIcon 
    },
  };
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 md:px-3 md:py-1 rounded-full text-xs md:text-sm font-medium ${config.color}`}
    >
      <Icon className="h-3 w-3 md:h-4 md:w-4 mr-1" />
      {config.text}
    </span>
  );
};

export default StatusBadge;