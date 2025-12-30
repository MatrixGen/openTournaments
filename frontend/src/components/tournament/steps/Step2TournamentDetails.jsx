import { useState } from 'react';
import { PlusIcon, XMarkIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';

export default function Step2TournamentDetails({ register, errors, setValue, watch, rulesArray = [] }) {
  const [rules, setRules] = useState(rulesArray || []);
  const [newRule, setNewRule] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingText, setEditingText] = useState('');

  // Sync rules when rulesArray prop changes
  useEffect(() => {
    if (Array.isArray(rulesArray) && rulesArray.length > 0) {
      setRules(rulesArray);
    }
  }, [rulesArray]);

  const handleAddRule = () => {
    if (!newRule.trim()) return;
    
    const updatedRules = [...rules, newRule.trim()];
    setRules(updatedRules);
    setValue('rules', updatedRules, { shouldValidate: true });
    setNewRule('');
  };

  const handleRemoveRule = (index) => {
    const updatedRules = rules.filter((_, i) => i !== index);
    setRules(updatedRules);
    setValue('rules', updatedRules, { shouldValidate: true });
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditingText('');
    }
  };

  const handleStartEdit = (index, rule) => {
    setEditingIndex(index);
    setEditingText(rule);
  };

  const handleSaveEdit = (index) => {
    if (!editingText.trim()) return;
    
    const updatedRules = [...rules];
    updatedRules[index] = editingText.trim();
    setRules(updatedRules);
    setValue('rules', updatedRules, { shouldValidate: true });
    setEditingIndex(null);
    setEditingText('');
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingText('');
  };


  return (
    <div className="space-y-6">
      <div className="text-center mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
          Tournament Settings
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm md:text-base">
          Configure the tournament details and rules
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-6">
        {/* Entry Fee and Total Slots */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div>
            <label htmlFor="entry_fee" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Entry Fee ($) *
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 dark:text-gray-400">$</span>
              </div>
              <input
                type="number"
                id="entry_fee"
                step="0.01"
                min="0"
                {...register('entry_fee', { valueAsNumber: true })}
                className="block w-full pl-8 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-3 px-4 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base md:text-sm transition-colors"
                placeholder="0.00"
              />
            </div>
            {errors.entry_fee && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.entry_fee.message}</p>
            )}
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Set to 0 for a free tournament
            </p>
          </div>

          <div>
            <label htmlFor="total_slots" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Total Slots *
            </label>
            <input
              type="number"
              id="total_slots"
              min="2"
              max="128"
              {...register('total_slots', { valueAsNumber: true })}
              className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-3 px-4 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base md:text-sm transition-colors"
              placeholder="16"
            />
            {errors.total_slots && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.total_slots.message}</p>
            )}
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Number of participants (2-128)
            </p>
          </div>
        </div>

        {/* Start Time - Full width */}
        <div>
          <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Start Time *
          </label>
          <div className="mt-1">
            <input
              type="datetime-local"
              id="start_time"
              {...register('start_time')}
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-3 px-4 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base md:text-sm transition-colors"
            />
          </div>
          {errors.start_time && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.start_time.message}</p>
          )}
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Tournament must start at least 1 hour from now
          </p>
        </div>

        {/* Rules & Guidelines - Dynamic System */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Rules & Guidelines
            </label>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {rules.length} rule{rules.length !== 1 ? 's' : ''} added
            </span>
          </div>
          
          {/* Hidden input for form validation */}
          <input
            type="hidden"
            {...register('rules', {
              validate: (value) => {
                if (!Array.isArray(value) || value.length === 0) {
                  return 'At least one rule is required';
                }
                return true;
              }
            })}
          />

          {/* Add Rule Input */}
          <div className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newRule}
                onChange={(e) => setNewRule(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddRule();
                  }
                }}
                placeholder="Add a new rule (e.g., 'No cheating allowed')"
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-2.5 px-3 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
              <button
                type="button"
                onClick={handleAddRule}
                disabled={!newRule.trim()}
                className="inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
              >
                <PlusIcon className="h-4 w-4" />
                Add
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Press Enter or click Add to include a rule
            </p>
          </div>

          {/* Rules List */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {rules.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No rules added yet. Add your first rule above.
                </p>
              </div>
            ) : (
              rules.map((rule, index) => (
                <div
                  key={index}
                  className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex items-start gap-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  
                  {editingIndex === index ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEdit(index);
                          }
                          if (e.key === 'Escape') {
                            handleCancelEdit();
                          }
                        }}
                        className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(index)}
                        className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 p-1"
                        title="Save"
                      >
                        <CheckIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-1"
                        title="Cancel"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {rule}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(index, rule)}
                          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                          title="Edit rule"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveRule(index)}
                          className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Remove rule"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          {errors.rules && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.rules.message}</p>
          )}
          
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Tip:</strong> Add clear, specific rules. Common rules include:
            </p>
            <ul className="text-xs text-blue-600 dark:text-blue-400 mt-1 space-y-0.5 pl-4">
              <li>• No cheating or hacking</li>
              <li>• Respect all players</li>
              <li>• Matches must start within 10 minutes of schedule</li>
              <li>• Screenshot evidence required for disputes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// You'll need to import CheckIcon or use XMarkIcon with a different style
// If you don't have CheckIcon, add this import:
import { CheckIcon } from '@heroicons/react/24/outline';
import { useEffect } from 'react';
