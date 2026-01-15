export const normalizeFilters = (filters) => {
  const params = { ...filters };
  Object.keys(params).forEach((key) => {
    if (params[key] === "all" || params[key] === "" || params[key] == null) {
      delete params[key];
    }
  });
  return params;
};
