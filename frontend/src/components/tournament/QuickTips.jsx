const QuickTips = () => (
  <div className="mt-6 sm:mt-8 bg-neutral-800 rounded-lg p-4 border border-neutral-700">
    <h4 className="text-white font-medium mb-2 text-sm sm:text-base">💡 Quick Tips</h4>
    <ul className="text-gray-400 text-xs sm:text-sm space-y-1">
      <li>• Tournaments need at least 2 participants to start</li>
      <li>• You can edit tournaments until participants join</li>
      <li>• Finalize results after all matches are completed</li>
      <li>• Cancelled tournaments will refund all participants</li>
    </ul>
  </div>
);

export default QuickTips;