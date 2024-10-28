const generateCustomId = require("../middlewares/generateCustomId");
const Prescriptions = require("../models/prescriptionModel");
const Patients = require("../models/patientModel");
const NodeCache = require("node-cache");
const { uploadFile, deleteFile } = require("../middlewares/cloudinary");
const cache = new NodeCache({ stdTTL: 300 });
// create patient
exports.createPatients = async (req, res) => {
  try {
    const patientId = await generateCustomId(
      Patients,
      "patientId",
      "patientId"
    );

    const { prescriptions, ...patientData } = req.body;

    const prescriptionIds = [];

    if (prescriptions && prescriptions.length > 0) {
      for (let prescription of prescriptions) {
        const newPrescription = new Prescriptions(prescription);
        const savedPrescription = await newPrescription.save();

        prescriptionIds.push(savedPrescription._id);
      }
    }

    const newPatient = new Patients({
      ...patientData,
      patientId,
      prescriptions: prescriptionIds,
    });

    await newPatient.save();

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
// get all functionm
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

    const totalDocuments = await Patients.countDocuments(match);
    const patients = await Patients.find(match)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("prescriptions");

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
// patient data update
exports.updatePatients = async (req, res) => {
  try {
    const { patientId } = req.params;
    const updateData = req.body;

    if (!patientId) {
      return res.status(400).json({
        message: "Patient ID is required",
      });
    }

    const updatedPatient = await Patients.findOneAndUpdate(
      { patientId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedPatient) {
      return res.status(404).json({
        message: "Patient not found",
      });
    }

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

// add more array item , under prescription more item are create like if oralfinding have one array if want create two array then create once function
exports.addSubdocumentEntry = async (req, res) => {
  try {
    const { patientId, prescriptionId, subdocument } = req.params;
    const newEntry = req.body;

    if (!patientId || !prescriptionId || !subdocument) {
      return res.status(400).json({
        message: "Patient ID, Prescription ID, and Subdocument are required",
      });
    }

    const idPrefixMap = {
      oralFinding: "OF",
      vitals: "VIT",
      dentalProcedure: "DP",
      medications: "MED",
      symptoms: "SYM",
      diagnosis: "DIA",
      referDoctor: "RD",
      medicalHistory: "MH",
    };

    if (!idPrefixMap[subdocument]) {
      return res.status(400).json({ message: "Invalid subdocument type" });
    }

    const patient = await Patients.findOne({ patientId }).populate(
      "prescriptions"
    );
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const prescription = patient.prescriptions.find(
      (prescription) => prescription.prescriptionId === prescriptionId
    );
    if (!prescription) {
      return res.status(404).json({ message: "Prescription not found" });
    }

    const existingEntries = prescription[subdocument];
    const newIdNumber =
      existingEntries.length > 0
        ? Math.max(
            ...existingEntries.map((entry) => {
              const numPart = parseInt(
                entry[`${subdocument}Id`].replace(idPrefixMap[subdocument], ""),
                10
              );
              return isNaN(numPart) ? 0 : numPart;
            })
          ) + 1
        : 1;
    const newCustomId = `${idPrefixMap[subdocument]}${String(
      newIdNumber
    ).padStart(4, "0")}`;
    newEntry[`${subdocument}Id`] = newCustomId;

    existingEntries.push(newEntry);
    const cacheKeysToInvalidate = cache
      .keys()
      .filter((key) => key.includes("allPatients") || key.includes("page:"));
    cacheKeysToInvalidate.forEach((key) => cache.del(key));

    await prescription.save();

    res.status(200).json({
      message: `${subdocument} entry added successfully`,
      data: prescription,
    });
  } catch (error) {
    console.error("Error adding subdocument entry:", error);
    res.status(500).json({
      message: "Error adding subdocument entry",
      error: error.message,
    });
  }
};

// Update Patient with New Prescriptions Using prescriptionId create prescription part for patient
exports.updatePatientWithPrescription = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { prescriptions } = req.body;

    if (!patientId) {
      return res.status(400).json({ message: "Patient ID is required" });
    }

    if (!prescriptions || prescriptions.length === 0) {
      return res.status(400).json({ message: "Prescription data is required" });
    }

    const prescriptionIds = [];

    // Loop through each prescription and save it without handling customId generation here
    for (let prescriptionData of prescriptions) {
      const newPrescription = new Prescriptions(prescriptionData);
      const savedPrescription = await newPrescription.save(); // Model's pre-save hook will generate unique IDs
      prescriptionIds.push(savedPrescription._id);
    }

    // Update the patient's prescriptions array with the new prescription IDs
    const updatedPatient = await Patients.findOneAndUpdate(
      { patientId },
      { $push: { prescriptions: { $each: prescriptionIds } } },
      { new: true, runValidators: true }
    );

    if (!updatedPatient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Invalidate cache for relevant keys if using caching
    const cacheKeysToInvalidate = cache
      .keys()
      .filter((key) => key.includes("allPatients") || key.includes("page:"));
    cacheKeysToInvalidate.forEach((key) => cache.del(key));

    res.status(200).json({
      message: "Prescription data added successfully",
      data: updatedPatient,
    });
  } catch (error) {
    console.error("Error updating patient with prescription:", error);
    res.status(500).json({
      message: "Error updating patient with prescription",
      error: error.message,
    });
  }
};
// edit under prescription like find medical and update only medicalHistoryName
exports.updatePatientSubdocumentEntry = async (req, res) => {
  try {
    const { patientId, prescriptionId, subdocument, customId } = req.params;
    const updateData = req.body;

    if (!patientId || !prescriptionId || !subdocument || !customId) {
      return res.status(400).json({
        message:
          "Patient ID, Prescription ID, Subdocument type, and Custom ID are required",
      });
    }

    const customIdFieldMap = {
      medications: "medicationId",
      vitals: "vitalsId",
      oralFinding: "oralFindingId",
      dentalProcedure: "dentalProcedureId",
      medicalHistory: "medicalHistoryId",
      symptoms: "symptomId",
      diagnosis: "diagnosisId",
      referDoctor: "referDoctorId",
    };

    const customIdField = customIdFieldMap[subdocument];
    if (!customIdField) {
      return res.status(400).json({
        message: "Invalid subdocument type",
      });
    }

    const patient = await Patients.findOne({ patientId }).populate(
      "prescriptions"
    );
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const prescription = patient.prescriptions.find(
      (prescription) => prescription.prescriptionId === prescriptionId
    );
    if (!prescription) {
      return res.status(404).json({ message: "Prescription not found" });
    }

    const subdocumentArray = prescription[subdocument];
    const entry = subdocumentArray.find(
      (item) => item[customIdField] === customId
    );

    if (!entry) {
      return res
        .status(404)
        .json({ message: `${subdocument} entry not found` });
    }

    Object.assign(entry, updateData);

    const cacheKeysToInvalidate = cache
      .keys()
      .filter((key) => key.includes("allPatients") || key.includes("page:"));
    cacheKeysToInvalidate.forEach((key) => cache.del(key));

    await prescription.save();

    res.status(200).json({
      message: `${subdocument} entry updated successfully`,
      data: prescription,
    });
  } catch (error) {
    console.error("Error updating subdocument entry:", error);
    res.status(500).json({
      message: "Error updating subdocument entry",
      error: error.message,
    });
  }
};
// delete any of the array element like if oral finding have two array then if want then one is delete
exports.deleteSubdocumentEntry = async (req, res) => {
  try {
    const { patientId, prescriptionId, subdocument, customId } = req.params;

    if (!patientId || !prescriptionId || !subdocument || !customId) {
      return res.status(400).json({
        message:
          "Patient ID, Prescription ID, Subdocument type, and Custom ID are required",
      });
    }

    const customIdFieldMap = {
      medications: "medicationId",
      vitals: "vitalsId",
      oralFinding: "oralFindingId",
      dentalProcedure: "dentalProcedureId",
      medicalHistory: "medicalHistoryId",
      symptoms: "symptomId",
      diagnosis: "diagnosisId",
      referDoctor: "referDoctorId",
    };

    const customIdField = customIdFieldMap[subdocument];
    if (!customIdField) {
      return res.status(400).json({
        message: "Invalid subdocument type",
      });
    }

    const patient = await Patients.findOne({ patientId }).populate(
      "prescriptions"
    );
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const prescription = patient.prescriptions.find(
      (prescription) => prescription.prescriptionId === prescriptionId
    );
    if (!prescription) {
      return res.status(404).json({ message: "Prescription not found" });
    }

    const subdocumentArray = prescription[subdocument];
    const initialLength = subdocumentArray.length;

    prescription[subdocument] = subdocumentArray.filter(
      (item) => item[customIdField] !== customId
    );

    if (prescription[subdocument].length === initialLength) {
      return res
        .status(404)
        .json({ message: `${subdocument} entry not found` });
    }
    const cacheKeysToInvalidate = cache
      .keys()
      .filter((key) => key.includes("allPatients") || key.includes("page:"));
    cacheKeysToInvalidate.forEach((key) => cache.del(key));

    await prescription.save();

    res.status(200).json({
      message: `${subdocument} entry deleted successfully`,
      data: prescription,
    });
  } catch (error) {
    console.error("Error deleting subdocument entry:", error);
    res.status(500).json({
      message: "Error deleting subdocument entry",
      error: error.message,
    });
  }
};
// if patient have two prescription or more if wANT ANY onw are delete then one have delte function
exports.deletePatientPrescription = async (req, res) => {
  try {
    const { patientId, prescriptionId } = req.params;

    if (!patientId || !prescriptionId) {
      return res.status(400).json({
        message: "Patient ID and Prescription ID are required",
      });
    }

    const patient = await Patients.findOne({ patientId }).populate(
      "prescriptions"
    );
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const prescriptionToDelete = patient.prescriptions.find(
      (p) => p.prescriptionId === prescriptionId
    );

    if (!prescriptionToDelete) {
      return res.status(404).json({
        message: "Prescription not found for this patient",
      });
    }

    patient.prescriptions = patient.prescriptions.filter(
      (p) => p.prescriptionId !== prescriptionId
    );
    await patient.save();

    const deletedPrescription = await Prescriptions.findOneAndDelete({
      prescriptionId: prescriptionId,
    });

    if (!deletedPrescription) {
      return res.status(404).json({ message: "Prescription not found" });
    }
    const cacheKeysToInvalidate = cache
      .keys()
      .filter((key) => key.includes("allPatients") || key.includes("page:"));
    cacheKeysToInvalidate.forEach((key) => cache.del(key));

    res.status(200).json({
      message: "Prescription deleted successfully",
      data: deletedPrescription,
    });
  } catch (error) {
    console.error("Error deleting prescription:", error);
    res.status(500).json({
      message: "Error deleting prescription",
      error: error.message,
    });
  }
};
// full one patient are delete
exports.deletePatients = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({
        message: "Patient ID is required",
      });
    }

    const patientToDelete = await Patients.findOne({ patientId }).lean();
    if (!patientToDelete) {
      return res.status(404).json({
        message: "Patient not found",
      });
    }

    const prescriptionIds = patientToDelete.prescriptions;

    const deletedPatient = await Patients.findOneAndDelete({ patientId });

    await Prescriptions.deleteMany({ _id: { $in: prescriptionIds } });

    const cacheKeysToInvalidate = cache
      .keys()
      .filter((key) => key.includes("allPatients") || key.includes("page:"));
    cacheKeysToInvalidate.forEach((key) => cache.del(key));

    res.status(200).json({
      message: "Patient and associated prescriptions deleted successfully",
      data: deletedPatient,
    });
  } catch (error) {
    console.error("Error deleting patient:", error);
    res.status(500).json({
      message: "Error deleting patient",
      error: error.message,
    });
  }
};
//Add Patient Document
exports.addPatientDocument = async (req, res) => {
  try {
    const { patientId } = req.params;
    if (!patientId) {
      return res.status(400).json({
        message: "Patient ID is required",
      });
    }
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send("No files were uploaded.");
    }
    if (!req.body.title) {
      return res.status(400).send("Title is required.");
    }

    const documentId = await generateCustomId(
      Patients,
      "patientDocuments.documentId",
      "DOC"
    );
    let uploadedFile = req.files.file;
    const uploadResult = await uploadFile(
      uploadedFile.tempFilePath,
      uploadedFile.mimetype
    );
    const newDocumentData = {
      documentId,
      documentTitle: req.body.title,
      publicId: uploadResult.public_id,
      documentFile: uploadResult.secure_url,
    };
    const updatedPatient = await Patients.findOneAndUpdate(
      { patientId: patientId },
      { $push: { patientDocuments: newDocumentData } },
      { new: true }
    );

    if (!updatedPatient) {
      return res.status(400).json({ message: "Error adding document" });
    }

    // const cacheKeysToInvalidate = cache
    //   .keys()
    //   .filter((key) => key.includes("allPatients") || key.includes("page:"));
    // cacheKeysToInvalidate.forEach((key) => cache.del(key));

    res.status(200).json({
      message: `document added successfully`,
      data: updatedPatient,
    });
  } catch (error) {
    console.error("Error adding patient document:", error);
    res.status(500).json({
      message: "Error adding patient document",
      error: error.message,
    });
  }
};
//Update Patient Document
exports.updatePatientDocument = async (req, res) => {
  try {
    const { patientId, documentId } = req.params;

    if (!patientId || !documentId) {
      return res.status(400).json({
        message: "Patient ID and Document ID are required",
      });
    }

    // Find the patient and document to retrieve the current publicId
    const patient = await Patients.findOne(
      { patientId, "patientDocuments.documentId": documentId },
      { "patientDocuments.$": 1 } // Only get the matching document
    );

    if (!patient || !patient.patientDocuments.length) {
      return res.status(404).json({ message: "Patient or document not found" });
    }

    // Retrieve the existing publicId
    const existingDocument = patient.patientDocuments[0];
    const existingPublicId = existingDocument.publicId;

    let updatedData = {};

    // If a title is provided, add it to updatedData
    if (req.body.title) {
      updatedData.documentTitle = req.body.title;
    }

    // If a new file is provided, delete the old one and upload the new one
    if (req.files && req.files.file) {
      // Delete the old file using the existing publicId
      if (existingPublicId) {
        await deleteFile(existingPublicId);
      }

      // Upload the new file and add to updatedData
      let uploadedFile = req.files.file;
      const uploadResult = await uploadFile(
        uploadedFile.tempFilePath,
        uploadedFile.mimetype
      );
      updatedData.publicId = uploadResult.public_id;
      updatedData.documentFile = uploadResult.secure_url;
    }

    // Update the document with the new data
    const updatedPatient = await Patients.findOneAndUpdate(
      { patientId: patientId, "patientDocuments.documentId": documentId },
      {
        $set: {
          "patientDocuments.$[doc].documentTitle": updatedData.documentTitle,
          "patientDocuments.$[doc].publicId": updatedData.publicId,
          "patientDocuments.$[doc].documentFile": updatedData.documentFile,
        },
      },
      {
        arrayFilters: [{ "doc.documentId": documentId }],
        new: true,
      }
    );

    res.status(200).json({
      message: "Document updated successfully",
      data: updatedPatient,
    });
  } catch (error) {
    console.error("Error updating patient document:", error);
    res.status(500).json({
      message: "Error updating patient document",
      error: error.message,
    });
  }
};
//Delete Patient Document
exports.deletePatientDocument = async (req, res) => {
  try {
    const { patientId, documentId } = req.params;

    if (!patientId || !documentId) {
      return res.status(400).json({
        message: "Patient ID and Document ID are required",
      });
    }

    // Find the patient and document to retrieve the current publicId
    const patient = await Patients.findOne(
      { patientId, "patientDocuments.documentId": documentId },
      { "patientDocuments.$": 1 } // Only get the matching document
    );

    if (!patient || !patient.patientDocuments.length) {
      return res.status(404).json({ message: "Patient or document not found" });
    }

    // Retrieve the publicId of the document to be deleted
    const documentToDelete = patient.patientDocuments[0];
    const publicId = documentToDelete.publicId;

    // Delete the file using the publicId
    if (publicId) {
      await deleteFile(publicId);
    }

    // Remove the document from the patientDocuments array
    const updatedPatient = await Patients.findOneAndUpdate(
      { patientId },
      { $pull: { patientDocuments: { documentId } } },
      { new: true }
    );

    if (!updatedPatient) {
      return res.status(400).json({ message: "Error deleting document" });
    }

    res.status(200).json({
      message: "Document deleted successfully",
      data: updatedPatient,
    });
  } catch (error) {
    console.error("Error deleting patient document:", error);
    res.status(500).json({
      message: "Error deleting patient document",
      error: error.message,
    });
  }
};
