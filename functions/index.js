/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const functions = require("firebase-functions");
const {setGlobalOptions} = require("firebase-functions/v2");
const {onRequest} = require("firebase-functions/v2/https");
const {onDocumentUpdated} = require("firebase-functions/v2/firestore");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

// Initialize Firebase Admin
admin.initializeApp();

// Import email verification function module
const sendEmailModule = require('./sendEmailVerification');

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// Export email verification function
exports.sendVerificationEmail = sendEmailModule.sendVerificationEmail;

/**
 * Function to monitor reservation status changes
 * When a reservation is cancelled, it schedules deletion after 2 hours
 */
exports.onReservationStatusChange = onDocumentUpdated(
  "reservations/{reservationId}",
  async (event) => {
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();

    // Check if status changed to 'cancelled'
    if (beforeData.status !== 'cancelled' && afterData.status === 'cancelled') {
      logger.info(`Reservation ${event.params.reservationId} cancelled. Scheduling deletion.`);

      // Calculate deletion time (2 hours from now)
      const deletionTime = new Date();
      deletionTime.setHours(deletionTime.getHours() + 2);

      // Update the document with deletion scheduled time
      await event.data.after.ref.update({
        deletionScheduledAt: admin.firestore.Timestamp.fromDate(deletionTime),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      logger.info(`Deletion scheduled for ${event.params.reservationId} at ${deletionTime.toISOString()}`);
    }
  }
);

/**
 * Scheduled function to run every 10 minutes
 * Deletes cancelled reservations that are past their deletion time
 */
exports.cleanupCancelledReservations = onSchedule(
  {
    schedule: "every 10 minutes",
    timeZone: "Asia/Seoul", // Korean timezone
  },
  async (context) => {
    logger.info("Running cleanup for cancelled reservations");

    const now = admin.firestore.Timestamp.now();
    const db = admin.firestore();

    try {
      // Query for cancelled reservations past their deletion time
      const snapshot = await db.collection('reservations')
        .where('status', '==', 'cancelled')
        .where('deletionScheduledAt', '<=', now)
        .limit(100) // Process up to 100 at a time to avoid timeout
        .get();

      if (snapshot.empty) {
        logger.info("No cancelled reservations to delete");
        return null;
      }

      logger.info(`Found ${snapshot.size} reservations to delete`);

      // Delete reservations in batches
      const batch = db.batch();
      let deleteCount = 0;

      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        deleteCount++;
        logger.info(`Scheduling deletion of reservation: ${doc.id}`);
      });

      await batch.commit();
      logger.info(`Successfully deleted ${deleteCount} cancelled reservations`);

      return { deleted: deleteCount };
    } catch (error) {
      logger.error("Error deleting cancelled reservations:", error);
      throw error;
    }
  }
);

/**
 * Alternative: Function to immediately delete a reservation after 2 hours
 * This can be called directly when a reservation is cancelled
 */
exports.scheduleReservationDeletion = onRequest(async (req, res) => {
  const { reservationId } = req.body;

  if (!reservationId) {
    res.status(400).send({ error: "Reservation ID is required" });
    return;
  }

  try {
    const db = admin.firestore();
    const reservationRef = db.collection('reservations').doc(reservationId);
    const reservation = await reservationRef.get();

    if (!reservation.exists) {
      res.status(404).send({ error: "Reservation not found" });
      return;
    }

    const data = reservation.data();

    if (data.status !== 'cancelled') {
      res.status(400).send({ error: "Reservation is not cancelled" });
      return;
    }

    // Calculate deletion time (2 hours from now)
    const deletionTime = new Date();
    deletionTime.setHours(deletionTime.getHours() + 2);

    // Update with deletion scheduled time
    await reservationRef.update({
      deletionScheduledAt: admin.firestore.Timestamp.fromDate(deletionTime),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).send({
      message: "Deletion scheduled",
      deletionTime: deletionTime.toISOString()
    });
  } catch (error) {
    logger.error("Error scheduling deletion:", error);
    res.status(500).send({ error: "Internal server error" });
  }
});