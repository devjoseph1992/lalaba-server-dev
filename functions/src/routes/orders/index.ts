import acceptMerchantRoute from "./acceptMerchant.route";
import cancelOrderRoute from "./cancelOrder.route";
import placeOrderRoute from "./placeOrder.route";
import getCustomerOrdersRoute from "./getCustomerOrders.route";
import getOrderByIdRoute from "./getOrderById.route";
import getMerchantOrdersRoute from "./getMerchantOrders.route";
import getRiderOrder from "./getRiderOrder";
import acceptRiderRoute from "./acceptRider.route";
import riderStatus from "./rider-status";
import bookReturnQr from "./book-return-qr";
import completeReturn from "./complete-return";
import verifyDeliveryQr from "./verify-delivery-qr";
import verifyReturnQr from "./verify-return-qr";
import riderDeliverRoute from "./riderDeliver.route";
import setCompletionTime from "./set-completion-time";

export default [
  getCustomerOrdersRoute,
  placeOrderRoute,
  acceptMerchantRoute,
  getRiderOrder,
  cancelOrderRoute,
  getOrderByIdRoute,
  getMerchantOrdersRoute,
  acceptRiderRoute,
  riderStatus,
  bookReturnQr,
  completeReturn,
  verifyDeliveryQr,
  verifyReturnQr,
  riderDeliverRoute,
  setCompletionTime,
];
