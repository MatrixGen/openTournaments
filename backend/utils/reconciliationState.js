const isReversalCompleted = (metadata = {}) =>
  metadata?.reversal_status === "completed";

const markReversalPending = (metadata = {}) => ({
  ...metadata,
  reversal_status: "pending",
});

const markReversalCompleted = (metadata = {}) => ({
  ...metadata,
  reversal_status: "completed",
  reversal_completed_at: new Date().toISOString(),
});

module.exports = {
  isReversalCompleted,
  markReversalPending,
  markReversalCompleted,
};
