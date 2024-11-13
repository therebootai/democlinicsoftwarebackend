const generateCustomId = require("../middlewares/generateCustomId");
const Prescriptions = require("../models/prescriptionModel");
const Patients = require("../models/patientModel");
const NodeCache = require("node-cache");
const { uploadFile, deleteFile } = require("../middlewares/cloudinary");
const generateNestedCustomId = require("../middlewares/ganerateNestedCustomId");
const cache = new NodeCache({ stdTTL: 300 });
const User = require("../models/User");
// create patient
exports.createPatients = async (req, res) => {
  try {
    const patientId = await generateCustomId(
      Patients,
      "patientId",
      "patientId"
    );

    const { prescriptions, medicalHistory = [], ...patientData } = req.body;

    const prescriptionIds = [];
    if (prescriptions && prescriptions.length > 0) {
      for (let prescription of prescriptions) {
        const newPrescription = new Prescriptions(prescription);
        const savedPrescription = await newPrescription.save();
        prescriptionIds.push(savedPrescription._id);
      }
    }

    const processedMedicalHistory = medicalHistory.map((historyItem) => ({
      medicalHistoryName: historyItem.medicalHistoryName,
      duration: historyItem.duration || "",
      medicalHistoryMedicine: historyItem.medicines || [],
    }));

    const newPatient = new Patients({
      ...patientData,
      patientId,
      prescriptions: prescriptionIds,
      medicalHistory: processedMedicalHistory,
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
    if (error.code === 11000) {
      return res.status(400).json({
        error: "Patient already exists.",
      });
    }
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
      match.$or = [
        { patientId: searchRegex },
        { patientName: searchRegex },
        { mobileNumber: searchRegex },
      ];
    }

    if (req.query.startdate || req.query.enddate) {
      const startDate = req.query.startdate
        ? new Date(req.query.startdate)
        : null;
      let endDate = req.query.enddate ? new Date(req.query.enddate) : null;

      if (startDate && endDate) {
        endDate.setHours(23, 59, 59, 999);
        match.appointmentdate = { $gte: startDate, $lte: endDate };
      } else if (startDate) {
        const endOfDay = new Date(startDate);
        endOfDay.setHours(23, 59, 59, 999);
        match.appointmentdate = { $gte: startDate, $lte: endOfDay };
      }
    }
    if (req.query.doctorId) {
      match.chooseDoctor = req.query.doctorId;
    }

    let cacheKey = `page:${page}-limit:${limit}`;

    if (req.query.startdate) {
      cacheKey += `-startdate:${req.query.startdate}`;
    }
    if (req.query.enddate) {
      cacheKey += `-enddate:${req.query.enddate}`;
    }

    if (req.query.search) {
      cacheKey += `-search:${req.query.search}`;
    }

    if (req.query.doctorId) {
      cacheKey += `-doctorId:${req.query.doctorId}`;
    }

    const cachedPatients = cache.get(cacheKey);
    if (cachedPatients) {
      return res.status(200).json(cachedPatients);
    }

    const totalDocuments = await Patients.countDocuments(match);
    const patients = await Patients.find(match)
      .sort({ appointmentdate: -1 })
      .skip(skip)
      .limit(limit)
      .populate("prescriptions");

    // Fetch doctor details for each patient if chooseDoctor exists
    const patientsWithDoctorDetails = await Promise.all(
      patients.map(async (patient) => {
        const patientObj = patient.toObject();

        if (patientObj.chooseDoctor) {
          const doctor = await User.findOne({
            userId: patientObj.chooseDoctor,
          }).select("name phone email role designation doctorDegree");

          if (doctor) {
            patientObj.chooseDoctorDetails = {
              name: doctor.name,
              phone: doctor.phone,
              email: doctor.email,
              role: doctor.role,
              designation: doctor.designation,
              doctorDegree: doctor.doctorDegree,
            };
          }
        }
        return patientObj;
      })
    );

    const totalPages = Math.ceil(totalDocuments / limit);

    const result = {
      page,
      totalPages,
      totalDocuments,
      data: patientsWithDoctorDetails,
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

exports.getPatientByPatientId = async (req, res) => {
  const { patientId } = req.params;
  const { prescriptionId } = req.query;

  try {
    // Fetch patient data and populate the prescriptions field
    const patient = await Patients.findOne({ patientId }).populate(
      "prescriptions"
    );

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    let filteredPatient = patient.toObject();

    if (filteredPatient.chooseDoctor) {
      const doctor = await User.findOne({
        userId: filteredPatient.chooseDoctor,
      }).select("name phone email role designation doctorDegree");

      if (doctor) {
        // Add doctor details to the patient object
        filteredPatient.chooseDoctorDetails = {
          name: doctor.name,
          phone: doctor.phone,
          email: doctor.email,
          role: doctor.role,
          designation: doctor.designation,
          doctorDegree: doctor.doctorDegree,
        };
      }
    }

    if (prescriptionId) {
      filteredPatient.prescriptions = filteredPatient.prescriptions.filter(
        (prescription) => prescription._id.toString() === prescriptionId
      );

      // Check if the specific prescription is found
      if (filteredPatient.prescriptions.length === 0) {
        return res.status(404).json({ message: "Prescription not found" });
      }
    }

    res.status(200).json(filteredPatient);
  } catch (error) {
    console.error("Error fetching patient data:", error);
    res.status(500).json({ message: "Server error" });
  }
};
// patient data update
exports.updatePatients = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { checkedMedicalHistory = [], uncheckedMedicalHistoryNames = [] } =
      req.body;

    if (!patientId) {
      return res.status(400).json({ message: "Patient ID is required" });
    }

    // Find the patient document by patientId
    const patient = await Patients.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Remove unchecked items from existing medicalHistory
    patient.medicalHistory = patient.medicalHistory.filter((entry) => {
      const shouldKeep = !uncheckedMedicalHistoryNames.includes(
        entry.medicalHistoryName
      );

      return shouldKeep;
    });

    // Update or add checked items in medical history
    checkedMedicalHistory.forEach((newEntry) => {
      const existingEntry = patient.medicalHistory.find(
        (entry) => entry.medicalHistoryName === newEntry.medicalHistoryName
      );

      if (existingEntry) {
        // Update existing entry in medical history
        existingEntry.medicalHistoryMedicine = [
          ...new Set([
            ...existingEntry.medicalHistoryMedicine,
            ...newEntry.medicalHistoryMedicine,
          ]),
        ]; // Use Set to avoid duplicate medicines
        existingEntry.duration = newEntry.duration || existingEntry.duration;
      } else {
        // Add new entry if it doesn't exist
        patient.medicalHistory.push(newEntry);
      }
    });

    // Update other fields dynamically, excluding `paymentDetails` and `patientDocuments`
    for (const key in req.body) {
      if (
        key !== "medicalHistory" &&
        key !== "checkedMedicalHistory" &&
        key !== "uncheckedMedicalHistoryNames" &&
        key !== "paymentDetails" &&
        key !== "patientDocuments"
      ) {
        patient[key] = req.body[key];
      }
    }

    // Optional cache invalidation (if necessary)
    try {
      const cacheKeysToInvalidate = cache
        .keys()
        .filter(
          (key) => key.includes("allPrescriptions") || key.includes("page:")
        );
      cacheKeysToInvalidate.forEach((key) => cache.del(key));
    } catch (cacheError) {
      console.warn("Cache invalidation failed:", cacheError);
    }

    // Save the updated patient data
    await patient.save();

    // Send success response
    res.status(200).json({
      message: "Patient's data updated successfully",
      data: patient,
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
exports.patientPrescriptionUpdate = async (req, res) => {
  try {
    const { patientId, prescriptionId } = req.params; // Get patientId and prescriptionId from request params
    const updatedData = req.body; // Get updated prescription data from request body

    // Validate patient existence
    const patient = await Patients.findOne({ patientId }).populate(
      "prescriptions"
    );

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Validate if prescription belongs to this patient
    const prescription = patient.prescriptions.find(
      (prescription) => prescription._id.toString() === prescriptionId
    );

    if (!prescription) {
      return res.status(404).json({
        message: "Prescription not found for this patient",
      });
    }

    // Update fields one by one, handling nested arrays
    if (updatedData.chiefComplain) {
      prescription.chiefComplain = [
        ...prescription.chiefComplain,
        ...updatedData.chiefComplain.filter(
          (newItem) =>
            !prescription.chiefComplain.some(
              (existingItem) =>
                existingItem.chiefComplainName === newItem.chiefComplainName
            )
        ),
      ];
    }

    if (updatedData.onExamination) {
      prescription.onExamination = [
        ...prescription.onExamination,
        ...updatedData.onExamination.filter(
          (newItem) =>
            !prescription.onExamination.some(
              (existingItem) =>
                existingItem.onExaminationName === newItem.onExaminationName
            )
        ),
      ];
    }

    if (updatedData.investigation) {
      prescription.investigation = [
        ...prescription.investigation,
        ...updatedData.investigation.filter(
          (newItem) =>
            !prescription.investigation.some(
              (existingItem) =>
                existingItem.investigationName === newItem.investigationName
            )
        ),
      ];
    }

    if (updatedData.radiography) {
      prescription.radiography = [
        ...prescription.radiography,
        ...updatedData.radiography.filter(
          (newItem) =>
            !prescription.radiography.some(
              (existingItem) =>
                existingItem.radiographyName === newItem.radiographyName
            )
        ),
      ];
    }

    if (updatedData.advices) {
      prescription.advices = [
        ...prescription.advices,
        ...updatedData.advices.filter(
          (newItem) =>
            !prescription.advices.some(
              (existingItem) => existingItem.advicesName === newItem.advicesName
            )
        ),
      ];
    }

    if (updatedData.medications) {
      prescription.medications = [
        ...prescription.medications,
        ...updatedData.medications.filter(
          (newItem) =>
            !prescription.medications.some(
              (existingItem) =>
                existingItem.medicineBrandName === newItem.medicineBrandName &&
                existingItem.medicineComposition === newItem.medicineComposition
            )
        ),
      ];
    }

    // Save the updated prescription
    const savedPrescription = await Prescriptions.findByIdAndUpdate(
      prescriptionId,
      { $set: updatedData }, // update fields
      { new: true }
    );

    res.status(200).json({
      message: "Prescription updated successfully",
      data: savedPrescription,
    });
  } catch (error) {
    console.error("Error editing prescription:", error);
    res.status(500).json({
      message: "Error editing prescription",
      error: error.message,
    });
  }
};

// Update Patient with New Prescriptions Using prescriptionId create prescription part for patient
exports.updatePatientWithPrescription = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { prescriptions } = req.body;

    if (!Array.isArray(prescriptions) || prescriptions.length === 0) {
      return res
        .status(400)
        .json({ message: "Prescription data must be a non-empty array" });
    }

    const prescriptionIds = [];

    for (const prescriptionData of prescriptions) {
      // Check if prescriptionData is a valid object
      if (!prescriptionData || typeof prescriptionData !== "object") {
        return res
          .status(400)
          .json({ message: "Each prescription must be a valid object" });
      }

      // Create a new object to explicitly define the fields without IDs
      const filteredPrescriptionData = {
        chiefComplain: prescriptionData.chiefComplain
          ? prescriptionData.chiefComplain.map((item) => ({
              chiefComplainName: item.chiefComplainName || "",
            }))
          : [],
        onExamination: prescriptionData.onExamination
          ? prescriptionData.onExamination.map((item) => ({
              onExaminationName: item.onExaminationName || "",
              onExaminationArea: item.onExaminationArea || [],
              onExaminationAdditionalNotes:
                item.onExaminationAdditionalNotes || "",
            }))
          : [],
        investigation: prescriptionData.investigation
          ? prescriptionData.investigation.map((item) => ({
              investigationName: item.investigationName || "",
            }))
          : [],
        radiography: prescriptionData.radiography
          ? prescriptionData.radiography.map((item) => ({
              radiographyName: item.radiographyName || "",
            }))
          : [],
        advices: prescriptionData.advices
          ? prescriptionData.advices.map((item) => ({
              advicesName: item.advicesName || "",
            }))
          : [],
        medications: prescriptionData.medications
          ? prescriptionData.medications.map((item) => ({
              medicineBrandName: item.medicineBrandName || "",
              medicineComposition: item.medicineComposition || "",
              medicineStrength: item.medicineStrength || "",
              medicineDose: item.medicineDose || "",
              medicineFrequency: item.medicineFrequency || "",
              medicineTiming: item.medicineTiming || "",
              medicineDuration: item.medicineDuration || "",
              medicineStartfrom: item.medicineStartfrom || "",
              medicineInstructions: item.medicineInstructions || "",
              medicineQuantity: item.medicineQuantity || "",
            }))
          : [],
        referDoctor: prescriptionData.referDoctor
          ? prescriptionData.referDoctor.map((item) => ({
              referDoctor: item.referDoctor || "",
            }))
          : [],
      };

      try {
        // Save the new prescription document
        const newPrescription = new Prescriptions(filteredPrescriptionData);
        const savedPrescription = await newPrescription.save();
        prescriptionIds.push(savedPrescription._id);
      } catch (saveError) {
        console.error("Error saving individual prescription:", saveError);
        return res.status(500).json({
          message: "Error saving prescription to database",
          error: saveError.message,
        });
      }
    }

    // Update the patient's prescriptions array after saving all prescriptions
    const updatedPatient = await Patients.findOneAndUpdate(
      { patientId },
      { $push: { prescriptions: { $each: prescriptionIds } } },
      { new: true, runValidators: true }
    );

    if (!updatedPatient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    res.status(200).json({
      message: "Prescription data added successfully",
      data: updatedPatient,
      prescriptionIds: prescriptionIds,
    });
  } catch (error) {
    console.error("Error updating patient with prescription:", error);
    res.status(500).json({
      message: "Error updating patient with prescription",
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

exports.addPaymentDetails = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { paymentMethod, paymentDetails, totalCharges, totalPaid, anyDue } =
      req.body;

    if (!patientId) {
      return res.status(400).json({ message: "Patient ID is required" });
    }
    if (!paymentDetails || paymentDetails.length === 0) {
      return res.status(400).json({ message: "Payment details are missing" });
    }

    // Generate a unique payment ID for this payment group
    const paymentId = await generateNestedCustomId(
      Patients,
      "paymentDetails",
      "paymentId"
    );

    // Structure the payment data with a single paymentMethod and nested payment details
    const newPaymentData = {
      paymentId,
      paymentMethod,
      totalCharges,
      totalPaid,
      anyDue,
      paymentDetails: paymentDetails.map((detail) => ({
        iteamName: detail.iteamName,
        iteamCharges: detail.iteamCharges,
        paymentDescription: detail.paymentDescription,
      })),
    };

    // Push the new payment data into paymentDetails array
    const updatedPatient = await Patients.findOneAndUpdate(
      { patientId: patientId },
      { $push: { paymentDetails: newPaymentData } },
      { new: true }
    );

    if (!updatedPatient) {
      return res.status(404).json({ message: "Patient not found" });
    }
    const cacheKeysToInvalidate = cache
      .keys()
      .filter((key) => key.includes("allPatients") || key.includes("page:"));
    cacheKeysToInvalidate.forEach((key) => cache.del(key));

    res.status(200).json({
      message: "Payment details added successfully",
      paymentId: paymentId,
      data: updatedPatient,
    });
  } catch (error) {
    console.error("Error adding payment details:", error);
    res
      .status(500)
      .json({ message: "Error adding payment details", error: error.message });
  }
};

exports.updatePaymentDetails = async (req, res) => {
  try {
    const { patientId, paymentId } = req.params;
    const { paymentDetails, totalCharges, totalPaid } = req.body;

    // Ensure patientId and paymentId are provided
    if (!patientId || !paymentId) {
      return res
        .status(400)
        .json({ message: "Patient ID and Payment ID are required" });
    }

    // Calculate `anyDue` based on provided `totalPaid` or default to `totalCharges` if no payment made
    const calculatedTotalPaid = totalPaid
      ? Number(totalPaid)
      : Number(totalCharges);
    const anyDue = Number(totalCharges) - calculatedTotalPaid;

    // Find and update the payment record with matching `paymentId` in `paymentDetails`
    const updatedPatient = await Patients.findOneAndUpdate(
      { patientId, "paymentDetails.paymentId": paymentId },
      {
        $set: {
          "paymentDetails.$.paymentDetails": paymentDetails,
          "paymentDetails.$.totalCharges": totalCharges,
          "paymentDetails.$.totalPaid": calculatedTotalPaid.toString(),
          "paymentDetails.$.anyDue": anyDue.toString(),
        },
      },
      { new: true }
    );

    if (!updatedPatient) {
      return res
        .status(404)
        .json({ message: "Payment record not found for update" });
    }

    res.status(200).json({
      message: "Payment details updated successfully",
      data: updatedPatient,
    });
  } catch (error) {
    console.error("Error updating payment details:", error);
    res.status(500).json({
      message: "Error updating payment details",
      error: error.message,
    });
  }
};
