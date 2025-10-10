export default function EvidenceDisplay({ evidenceUrl, className = '' }) {
  if (!evidenceUrl) return null;

  const getFileExtension = (url) => {
    return url.split('.').pop().toLowerCase();
  };

  const renderEvidence = () => {
    const extension = getFileExtension(evidenceUrl);
    const isImage = ['jpg', 'jpeg', 'png', 'gif'].includes(extension);
    const isVideo = ['mp4', 'avi', 'mov', 'wmv'].includes(extension);
    const isPDF = extension === 'pdf';

    if (isImage) {
      return (
        <img 
          src={evidenceUrl} 
          alt="Match evidence" 
          className="max-w-full max-h-64 rounded border border-gray-600"
        />
      );
    } else if (isVideo) {
      return (
        <video 
          controls 
          className="max-w-full max-h-64 rounded border border-gray-600"
        >
          <source src={evidenceUrl} type={`video/${extension}`} />
          Your browser does not support the video tag.
        </video>
      );
    } else if (isPDF) {
      return (
        <div className="border border-gray-600 rounded p-4">
          <a 
            href={evidenceUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary-500 hover:text-primary-400 flex items-center"
          >
            <span className="mr-2">📄</span>
            View PDF Evidence
          </a>
        </div>
      );
    } else {
      return (
        <a 
          href={evidenceUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-primary-500 hover:text-primary-400"
        >
          Download Evidence
        </a>
      );
    }
  };

  return (
    <div className={className}>
      <p className="text-sm text-gray-400 mb-2">Evidence:</p>
      {renderEvidence()}
    </div>
  );
}