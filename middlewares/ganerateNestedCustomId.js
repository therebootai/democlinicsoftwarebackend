const generateNestedCustomId = async (Model, nestedField, prefix) => {
  try {
    // Get all patient records, extracting only the nested field (paymentDetails or patientTcCard)
    const records = await Model.find({}, { [nestedField]: 1, _id: 0 });

    const ids = [];

    // Loop through each patient record
    records.forEach((record) => {
      // Check if the nested field exists and is an array
      if (record[nestedField] && Array.isArray(record[nestedField])) {
        // Loop through each entry in the nested field (paymentDetails or patientTcCard)
        record[nestedField].forEach((entry) => {
          // Check if the entry has the custom ID and if it starts with the prefix
          const customId =
            nestedField === "paymentDetails" ? entry.paymentId : entry.tcCardId;
          if (customId && customId.startsWith(prefix)) {
            // Extract the numeric part of the ID (after removing the prefix)
            const numericId = parseInt(customId.replace(prefix, ""), 10);
            if (!isNaN(numericId)) {
              ids.push(numericId);
            }
          }
        });
      }
    });

    // Sort the IDs to find the next unique ID
    ids.sort((a, b) => a - b);

    // Find the next unique ID
    let newId = 1;
    for (let i = 0; i < ids.length; i++) {
      if (newId < ids[i]) {
        break;
      }
      newId++;
    }

    // Return the new ID with the prefix, padded to 4 digits
    return `${prefix}${String(newId).padStart(4, "0")}`;
  } catch (error) {
    console.error("Error generating custom ID:", error);
    throw new Error("Error generating custom ID");
  }
};

module.exports = generateNestedCustomId;
