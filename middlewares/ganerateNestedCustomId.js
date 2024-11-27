const generateNestedCustomId = async (Model, nestedField, prefix) => {
  try {
    const records = await Model.find({}, { [nestedField]: 1, _id: 0 });

    const ids = [];

    records.forEach((record) => {
      if (record[nestedField] && Array.isArray(record[nestedField])) {
        record[nestedField].forEach((entry) => {
          const customId =
            nestedField === "paymentDetails" ? entry.paymentId : entry.tcCardId;
          if (customId && customId.startsWith(prefix)) {
            const numericId = parseInt(customId.replace(prefix, ""), 10);
            if (!isNaN(numericId)) {
              ids.push(numericId);
            }
          }
        });
      }
    });

    ids.sort((a, b) => a - b);

    let newId = 1;
    for (let i = 0; i < ids.length; i++) {
      if (newId < ids[i]) {
        break;
      }
      newId++;
    }

    return `${prefix}${String(newId).padStart(4, "0")}`;
  } catch (error) {
    console.error("Error generating custom ID:", error);
    throw new Error("Error generating custom ID");
  }
};

module.exports = generateNestedCustomId;
