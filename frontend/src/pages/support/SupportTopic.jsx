// SupportTopic.jsx
import { useParams } from 'react-router-dom';

export default function SupportTopic() {
  const { category, topic } = useParams();
  
  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-white mb-4">
        {category} - {topic}
      </h1>
      <p className="text-gray-300">
        Specific support page for {category}/{topic}
      </p>
    </div>
  );
}