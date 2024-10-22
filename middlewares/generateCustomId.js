const generateCustomId = async (Model, idField, prefix) => {
  // Fetch the existing IDs from the provided model, sorting them by the custom ID field
  const records = await Model.find({}, { [idField]: 1, _id: 0 }).sort({
    [idField]: 1,
  });

  // Extract and map the IDs, converting them to integers by stripping the prefix
  const ids = records.map((record) =>
    parseInt(record[idField].replace(prefix, ""), 10)
  );

  // Generate the next ID by finding the first available number
  let newId = 1;
  for (let i = 0; i < ids.length; i++) {
    if (newId < ids[i]) {
      break;
    }
    newId++;
  }

  // Return the new custom ID with the prefix and padded number
  return `${prefix}${String(newId).padStart(4, "0")}`;
};
