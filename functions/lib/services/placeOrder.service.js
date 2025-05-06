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
const encryption_1 = require("../utils/encryption");
const gcashPreorder_1 = require("../utils/gcashPreorder");
const createBankOrCardPreorderPayment_1 = require("../utils/createBankOrCardPreorderPayment"); // ✅ import added
const calculateDistance_1 = require("../utils/calculateDistance");
const getMerchantDetails_service_1 = require("./getMerchantDetails.service");
const parseExtras_service_1 = require("./parseExtras.service");
async function placeOrder(input) {
    const { userId, userData, merchantId, serviceId, customerLocation, customerAddress, extras = [], estimatedKilo, orderType, paymentMethod, extraChoice, } = input;
    console.log(`📦 Starting order for user: ${userId}, payment: ${paymentMethod}`);
    const merchantDetails = await (0, getMerchantDetails_service_1.getMerchantDetails)(merchantId);
    console.log(`🏪 Merchant: ${merchantDetails.businessName}`);
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
        customerName: userData.name || "Unnamed Customer",
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
    if (paymentMethod === "GCash") {
        const pmSnap = await admin
            .firestore()
            .collection("payment_methods")
            .where("userId", "==", userId)
            .limit(1)
            .get();
        if (pmSnap.empty)
            throw new Error("No GCash number saved.");
        const gcashData = pmSnap.docs[0].data();
        if (!gcashData.gcashNumber)
            throw new Error("GCash number is required.");
        const customerPhone = (0, encryption_1.decrypt)(gcashData.gcashNumber);
        const { checkoutUrl } = await (0, gcashPreorder_1.createGcashPreorderPayment)({
            amount: totalAmount,
            customerId: userId,
            customerPhone,
            referenceId,
        });
        await orderRef.set({
            ...orderBase,
            status: "awaiting_payment",
            paymentStatus: "pending",
            referenceId,
            expiresAt,
        });
        return {
            message: "GCash checkout created successfully",
            checkoutUrl,
            referenceId,
            orderId: orderRef.id,
            amount: totalAmount,
            riderFee,
            riderPlatformFee,
            merchantDetails,
        };
    }
    if (paymentMethod === "Bank" || paymentMethod === "Card") {
        if (!userData.email)
            throw new Error("Customer email is required for Bank/Card.");
        const { checkoutUrl } = await (0, createBankOrCardPreorderPayment_1.createBankOrCardPreorderPayment)({
            amount: totalAmount,
            customerId: userId,
            customerEmail: userData.email,
            referenceId,
        });
        await orderRef.set({
            ...orderBase,
            status: "awaiting_payment",
            paymentStatus: "pending",
            referenceId,
            expiresAt,
        });
        return {
            message: "Bank/Card checkout created successfully",
            checkoutUrl,
            referenceId,
            orderId: orderRef.id,
            amount: totalAmount,
            riderFee,
            riderPlatformFee,
            merchantDetails,
        };
    }
    // Fallback: Cash
    const cashOrder = {
        ...orderBase,
        status: "pending",
        paymentStatus: "unpaid",
    };
    await orderRef.set(cashOrder);
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