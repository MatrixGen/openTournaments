import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export const ModalWrapper = ({ 
  show, 
  onClose, 
  title, 
  icon: Icon, 
  children,
  maxWidth = 'md', // 'sm', 'md', 'lg', 'xl', '2xl', 'full'
  closeOnOverlayClick = true,
  showCloseButton = true
}) => {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full mx-4'
  };

  return (
    <Transition appear show={show} as={Fragment}>
      <Dialog 
        as="div" 
        className="relative z-50" 
        onClose={closeOnOverlayClick ? onClose : () => {}}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 dark:bg-black/75" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-3 sm:p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className={`w-full ${maxWidthClasses[maxWidth]} transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 p-4 sm:p-6 text-left align-middle shadow-xl transition-all border border-gray-200 dark:border-gray-700`}>
                <Dialog.Title 
                  as="div" 
                  className="flex justify-between items-center mb-4 sm:mb-6"
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    {Icon && (
                      <div className="p-1.5 sm:p-2 rounded-lg bg-primary-50 dark:bg-primary-900/30">
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600 dark:text-primary-400" />
                      </div>
                    )}
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {title}
                    </h3>
                  </div>
                  
                  {showCloseButton && (
                    <button
                      onClick={onClose}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                      aria-label="Close"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  )}
                </Dialog.Title>
                
                <div className="text-gray-600 dark:text-gray-300">
                  {children}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};