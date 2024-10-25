const generateCustomId = require("../middlewares/generateCustomId");
const Prescriptions = require("../models/prescriptionModel");
const Patients = require("../models/patientModel");
const NodeCache = require("node-cache");
const cache = new NodeCache({ stdTTL: 300 });

// const generatepatientId = async () => {
//   const Patient = await Patients.find({}, { patientId: 1, _id: 0 }).sort({
//     patientId: 1,
//   });
//   const patientIds = Patient.map((Patient) =>
//     parseInt(Patient.patientId.replace("patientId", ""), 10)
//   );

//   let patientId = 1;
//   for (let i = 0; i < patientIds.length; i++) {
//     if (patientId < patientIds[i]) {
//       break;
//     }
//     patientId++;
//   }

//   return `patientId${String(patientId).padStart(4, "0")}`;
// };

exports.createPatients = async (req, res) => {
  try {
    // Generate a custom patientId
    const patientId = await generateCustomId(
      Patients,
      "patientId",
      "patientId"
    );

    // Extract prescription data from the request body
    const { prescriptions, ...patientData } = req.body;

    // Array to store the prescription ObjectIds after saving them
    const prescriptionIds = [];

    // Check if prescription data is provided
    if (prescriptions && prescriptions.length > 0) {
      // Loop through each prescription in the request body and save them
      for (let prescription of prescriptions) {
        const newPrescription = new Prescriptions(prescription);
        const savedPrescription = await newPrescription.save();
        // Store the saved prescription _id
        prescriptionIds.push(savedPrescription._id);
      }
    }

    // Now create the patient with the generated prescription ObjectIds
    const newPatient = new Patients({
      ...patientData, // Spread other patient data
      patientId, // Add generated patientId
      prescriptions: prescriptionIds, // Add the prescription ObjectIds
    });

    await newPatient.save();

    // Invalidate cache keys related to patients
    const cacheKeysToInvalidate = cache
      .keys()
      .filter((key) => key.includes("allPatients") || key.includes("page:"));
    cacheKeysToInvalidate.forEach((key) => cache.del(key));

    res.status(201).json({
      message: "Patient Created Successfully",
      data: newPatient,
    });
  } catch (error) {
    console.error("Error creating Patient:", error);
    res.status(500).json({
      message: "Error creating Patient",
      error: error.message,
    });
  }
};

exports.getPatients = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const match = {};

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      match.$or = [{ patientName: searchRegex }, { mobileNumber: searchRegex }];
    }

    let cacheKey = `page:${page}-limit:${limit}`;

    if (req.query.search) {
      cacheKey += `-search:${req.query.search}`;
    }

    const cachedPatients = cache.get(cacheKey);
    if (cachedPatients) {
      return res.status(200).json(cachedPatients);
    }

    // Use Mongoose's `find` with `populate` to get patients and their prescriptions
    const totalDocuments = await Patients.countDocuments(match);
    const patients = await Patients.find(match)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("prescriptions"); // Populate prescriptions field with full prescription data

    const totalPages = Math.ceil(totalDocuments / limit);

    const result = {
      page,
      totalPages,
      totalDocuments,
      data: patients,
    };

    cache.set(cacheKey, result);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching Patients:", error);
    res.status(500).json({
      message: "Error fetching Patients",
      error: error.message,
    });
  }
};

exports.updatePatients = async (req, res) => {
  try {
    const { patientId } = req.params;
    const updateData = req.body;

    if (!patientId) {
      return res.status(400).json({
        message: "Patient ID is required",
      });
    }

    // Find and update patient record based on the provided patientId
    const updatedPatient = await Patients.findOneAndUpdate(
      { patientId }, // Find by patientId
      { $set: updateData }, // Only update fields provided in req.body
      { new: true, runValidators: true } // Return updated document and run validations
    );

    if (!updatedPatient) {
      return res.status(404).json({
        message: "Patient not found",
      });
    }

    // Invalidate related cache keys after update
    const cacheKeysToInvalidate = cache
      .keys()
      .filter((key) => key.includes("allPatients") || key.includes("page:"));
    cacheKeysToInvalidate.forEach((key) => cache.del(key));

    res.status(200).json({
      message: "Patient Updated Successfully",
      data: updatedPatient,
    });
  } catch (error) {
    console.error("Error updating Patient:", error);
    res.status(500).json({
      message: "Error updating Patient",
      error: error.message,
    });
  }
};

exports.deletePatients = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({
        message: "Patient ID is required",
      });
    }

    // Delete patient record based on patientId
    const deletedPatient = await Patients.findOneAndDelete({ patientId });

    if (!deletedPatient) {
      return res.status(404).json({
        message: "Patient not found",
      });
    }

    // Invalidate related cache keys after deletion
    const cacheKeysToInvalidate = cache
      .keys()
      .filter((key) => key.includes("allPatients") || key.includes("page:"));
    cacheKeysToInvalidate.forEach((key) => cache.del(key));

    res.status(200).json({
      message: "Patient Deleted Successfully",
      data: deletedPatient,
    });
  } catch (error) {
    console.error("Error deleting Patient:", error);
    res.status(500).json({
      message: "Error deleting Patient",
      error: error.message,
    });
  }
};
