import { useState, useCallback } from 'react';

export function useConfirmDialog() {
  const [dialog, setDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: null,
  });

  const confirm = useCallback(({ title, message, confirmText, cancelText }) => {
    return new Promise((resolve) => {
      setDialog({
        isOpen: true,
        title,
        message,
        confirmText: confirmText || 'Confirm',
        cancelText: cancelText || 'Cancel',
        onConfirm: (confirmed) => {
          setDialog((prev) => ({ ...prev, isOpen: false }));
          resolve(confirmed);
        },
      });
    });
  }, []);

  const handleCancel = useCallback(() => dialog.onConfirm?.(false), [dialog]);
  const handleConfirm = useCallback(() => dialog.onConfirm?.(true), [dialog]);

  return {
    confirm,
    dialogProps: {
      isOpen: dialog.isOpen,
      title: dialog.title,
      message: dialog.message,
      confirmText: dialog.confirmText,
      cancelText: dialog.cancelText,
      onConfirm: handleConfirm,
      onCancel: handleCancel,
    },
  };
}
