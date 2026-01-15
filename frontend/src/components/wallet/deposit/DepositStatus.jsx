import React from "react";
import DepositStatusDisplay from "../../payments/DepositStatusDisplay";

const DepositStatus = ({
  status,
  orderReference,
  onCancel,
  onReconcile,
  onForceReconcile,
  isCancelling,
  isReconciling,
  user,
}) => {
  if (!status || !orderReference) return null;

  return (
    <DepositStatusDisplay
      status={status}
      orderReference={orderReference}
      onCancel={onCancel}
      onReconcile={onReconcile}
      onForceReconcile={onForceReconcile}
      isCancelling={isCancelling}
      isReconciling={isReconciling}
      user={user}
    />
  );
};

export default DepositStatus;
