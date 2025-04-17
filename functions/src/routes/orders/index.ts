import acceptMerchantRoute from "./acceptMerchant.route";
import acceptRiderRoute from "./acceptRider.route";
import updateWeightRoute from "./updateWeight.route";
import completeOrderRoute from "./completeOrder.route";
import cancelOrderRoute from "./cancelOrder.route";
import placeOrderRoute from "./placeOrder.route";
import getCustomerOrdersRoute from "./getCustomerOrders.route";
import getOrderByIdRoute from "./getOrderById.route";

export default [
  getCustomerOrdersRoute,
  placeOrderRoute,
  acceptMerchantRoute,
  acceptRiderRoute,
  updateWeightRoute,
  completeOrderRoute,
  cancelOrderRoute,
  getOrderByIdRoute,
];
