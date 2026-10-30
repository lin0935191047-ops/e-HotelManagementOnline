import { Router } from "express";
import { authenticateToken } from "../common/middlewares/auth.middleware.js";
import { requireRole } from "../common/middlewares/rbac.middleware.js";
import { OperationController } from "../controllers/operation.controller.js";

const router = Router();

router.use(authenticateToken);
router.use(requireRole("SALE"));

router.get("/ping", (req, res) => {
  res.json({
    success: true,
    module: "operation",
    message: "Sale operation module access granted.",
    user: req.user.username,
  });
});

// FEAT-09: Booking Management & Check-in
router.get("/bookings", OperationController.listBookings);
router.get("/bookings/:id", OperationController.getBookingDetails);
router.get("/bookings/:id/available-rooms", OperationController.getAvailableRoomsForCheckin);
router.post("/bookings/:id/check-in", OperationController.checkInBooking);

// FEAT-10: Use Services & HTML Ticket Printing
router.get("/services/occupied-rooms", OperationController.getOccupiedRooms);
router.get("/services/catalog", OperationController.getServicesCatalog);
router.get("/services/tickets", OperationController.listServiceTickets);
router.get("/services/tickets/:ticketId", OperationController.getServiceTicket);
router.post("/services/usage", OperationController.createServiceUsage);

// FEAT-11: Check-out, Invoice Calculation & HTML Invoice Printing
router.get("/bookings/:id/checkout-preview", OperationController.previewCheckout);
router.post("/bookings/:id/check-out", OperationController.checkOutBooking);
router.get("/invoices", OperationController.listInvoices);
router.get("/invoices/:invoiceId", OperationController.getInvoiceDetails);

// FEAT-12: Revenue Report & Excel/PDF Export
router.get("/reports/revenue", OperationController.getRevenueReport);
router.get("/reports/revenue/export-excel", OperationController.exportRevenueExcel);
router.get("/reports/revenue/export-pdf", OperationController.exportRevenuePdf);

export default router;
