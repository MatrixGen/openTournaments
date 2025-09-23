import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const TournamentJoinModal = ({ 
  isOpen, 
  onClose, 
  tournament, 
  onJoin, 
  joinError, 
  joinSuccess,
  isJoining,
  setJoinError,
  setJoinSuccess 
}) => {
  const [gamerTag, setGamerTag] = useState('');

  const handleJoin = async () => {
    if (!gamerTag.trim()) {
      setJoinError('Please enter your gamer tag');
      return;
    }

    setJoinError('');
    setJoinSuccess('');
    await onJoin(gamerTag);
  };

  const handleClose = () => {
    setGamerTag('');
    setJoinError('');
    setJoinSuccess('');
    onClose();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-75" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-3 sm:p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-neutral-800 p-4 sm:p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-white flex justify-between items-center"
                >
                  Join Tournament
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-300"
                    onClick={handleClose}
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </Dialog.Title>

                <div className="mt-4">
                  <p className="text-sm text-gray-400 mb-4">
                    You're about to join "{tournament.name}". The entry fee of ${tournament.entry_fee} will be deducted from your wallet.
                  </p>

                  <div className="mb-4">
                    <label htmlFor="gamerTag" className="block text-sm font-medium text-white mb-2">
                      Your Gamer Tag *
                    </label>
                    <input
                      type="text"
                      id="gamerTag"
                      value={gamerTag}
                      onChange={(e) => setGamerTag(e.target.value)}
                      className="w-full rounded-md border border-neutral-600 bg-neutral-700 py-2 px-3 text-white placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-primary-500 text-sm"
                      placeholder="Enter your in-game username"
                    />
                  </div>

                  {joinError && (
                    <div className="mb-4 rounded-md bg-red-800/50 py-2 px-3 text-sm text-red-200">
                      {joinError}
                    </div>
                  )}

                  {joinSuccess && (
                    <div className="mb-4 rounded-md bg-green-800/50 py-2 px-3 text-sm text-green-200">
                      {joinSuccess}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-transparent px-3 sm:px-4 py-2 text-sm font-medium text-gray-300 hover:bg-neutral-700 focus:outline-none"
                    onClick={handleClose}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isJoining}
                    className="inline-flex justify-center rounded-md border border-transparent bg-primary-500 px-3 sm:px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleJoin}
                  >
                    {isJoining ? 'Joining...' : 'Join Tournament'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default TournamentJoinModal;