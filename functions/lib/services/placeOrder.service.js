"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.placeOrder = void 0;
const admin = __importStar(require("firebase-admin"));
const createLinkedGcashPayment_1 = require("../utils/createLinkedGcashPayment");
const createLinkedBankPayment_1 = require("../utils/createLinkedBankPayment"); // ✅ updated import
const calculateDistance_1 = require("../utils/calculateDistance");
const getMerchantDetails_service_1 = require("./getMerchantDetails.service");
const parseExtras_service_1 = require("./parseExtras.service");
async function placeOrder(input) {
    const { userId, userData, merchantId, serviceId, customerLocation, customerAddress, extras = [], estimatedKilo, orderType, paymentMethod, extraChoice, } = input;
    console.log(`📦 Starting order for user: ${userId}, payment: ${paymentMethod}`);
    const customerName = userData.name || "Unnamed Customer";
    const merchantDetails = await (0, getMerchantDetails_service_1.getMerchantDetails)(merchantId);
    const serviceSnap = await admin
        .firestore()
        .collection("businesses")
        .doc(merchantId)
        .collection("services")
        .doc(serviceId)
        .get();
    if (!serviceSnap.exists) {
        throw new Error("Service not found.");
    }
    const serviceData = serviceSnap.data();
    const pricePerKilo = typeof serviceData.price === "string" ? parseFloat(serviceData.price) : serviceData.price;
    const baseWashPrice = pricePerKilo * estimatedKilo;
    const { extraProducts, extrasTotal } = await (0, parseExtras_service_1.parseExtras)(merchantId, extras, estimatedKilo);
    const distance = (0, calculateDistance_1.calculateDistance)(customerLocation.latitude, customerLocation.longitude, merchantDetails.coordinates.lat, merchantDetails.coordinates.lng);
    const baseFare = 39;
    const distanceFee = Math.ceil(distance / 5) * 30;
    const riderFee = baseFare + distanceFee;
    const riderPlatformFee = riderFee * 0.2;
    const totalAmount = parseFloat((baseWashPrice + extrasTotal + riderFee).toFixed(2));
    const orderRef = admin.firestore().collection("orders").doc();
    const orderBase = {
        orderId: orderRef.id,
        customerId: userId,
        customerName,
        merchantId,
        merchantLocation: merchantDetails.coordinates,
        merchantAddress: merchantDetails.address,
        merchantName: merchantDetails.businessName,
        serviceId,
        serviceName: serviceData.name ?? "Unnamed Service",
        inclusions: serviceData.inclusions ?? [],
        orderType,
        paymentMethod,
        estimatedKilo,
        price: parseFloat((baseWashPrice + extrasTotal).toFixed(2)),
        customerLocation,
        customerAddress,
        extras,
        extraProducts,
        extraChoice,
        distance: parseFloat(distance.toFixed(2)),
        riderFee,
        riderPlatformFee: parseFloat(riderPlatformFee.toFixed(2)),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const referenceId = `preorder-${orderRef.id}-${userId}`;
    const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 15 * 60 * 1000));
    // ✅ GCash Tokenized Flow
    if (paymentMethod === "GCash") {
        const gcashSnap = await admin
            .firestore()
            .collection("payment_methods")
            .doc(userId)
            .collection("gcash")
            .where("status", "==", "ACTIVE")
            .orderBy("linkedAt", "desc")
            .limit(1)
            .get();
        if (gcashSnap.empty)
            throw new Error("No linked GCash payment method found.");
        const gcashData = gcashSnap.docs[0].data();
        if (!gcashData.tokenId)
            throw new Error("Missing GCash tokenId.");
        const { chargeId, checkoutUrl, status } = await (0, createLinkedGcashPayment_1.createLinkedGcashPayment)({
            amount: totalAmount,
            customerId: userId,
            tokenId: gcashData.tokenId,
            referenceId,
        });
        const isPaid = status === "SUCCEEDED";
        await orderRef.set({
            ...orderBase,
            status: isPaid ? "pending" : "awaiting_payment",
            paymentStatus: isPaid ? "paid" : "pending",
            paidAt: isPaid ? admin.firestore.FieldValue.serverTimestamp() : null,
            referenceId,
            expiresAt,
            xenditChargeId: chargeId,
        });
        return {
            message: `GCash payment ${status.toLowerCase()}`,
            checkoutUrl,
            referenceId,
            orderId: orderRef.id,
            amount: totalAmount,
            riderFee,
            riderPlatformFee,
            merchantDetails,
        };
    }
    // ✅ Linked Bank/Card Payment (Tokenized)
    if (paymentMethod === "Bank") {
        if (!userData.email)
            throw new Error("Customer email is required for Bank payment.");
        const bankSnap = await admin
            .firestore()
            .collection("payment_methods")
            .doc(userId)
            .collection("bank")
            .where("status", "in", ["ACTIVE", "SUCCESSFUL"])
            .orderBy("linkedAt", "desc")
            .limit(1)
            .get();
        if (bankSnap.empty)
            throw new Error("No linked Bank/Card payment method found.");
        const bankData = bankSnap.docs[0].data();
        if (!bankData.tokenId)
            throw new Error("Missing Bank tokenId.");
        const { status, checkoutUrl, referenceId: xenditRefId, } = await (0, createLinkedBankPayment_1.createLinkedBankPayment)({
            amount: totalAmount,
            customerId: userId,
            tokenId: bankData.tokenId,
            referenceId,
        });
        const isPaid = status === "SUCCEEDED";
        await orderRef.set({
            ...orderBase,
            status: isPaid ? "pending" : "awaiting_payment",
            paymentStatus: isPaid ? "paid" : "pending",
            paidAt: isPaid ? admin.firestore.FieldValue.serverTimestamp() : null,
            referenceId,
            expiresAt,
            xenditChargeId: xenditRefId,
        });
        return {
            message: `Bank payment ${status.toLowerCase()}`,
            checkoutUrl,
            referenceId,
            orderId: orderRef.id,
            amount: totalAmount,
            riderFee,
            riderPlatformFee,
            merchantDetails,
        };
    }
    // ✅ Cash fallback
    await orderRef.set({
        ...orderBase,
        status: "pending",
        paymentStatus: "unpaid",
    });
    console.log(`📤 Cash order placed: ${orderRef.id}`);
    return {
        message: "Order placed successfully (Cash)",
        orderId: orderRef.id,
        price: orderBase.price,
        distance: `${distance.toFixed(2)} km`,
        riderFee,
        riderPlatformFee: orderBase.riderPlatformFee,
        merchantDetails,
    };
}
exports.placeOrder = placeOrder;
//# sourceMappingURL=placeOrder.service.js.map