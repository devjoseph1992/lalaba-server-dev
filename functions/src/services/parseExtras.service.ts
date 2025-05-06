import * as admin from "firebase-admin";

interface ExtraInput {
  id: string;
  quantity: number;
}

interface ParsedExtra {
  id: string;
  name: string;
  price: number;
  quantity: number; // final quantity used for billing
}

interface ParseExtrasResult {
  extraProducts: ParsedExtra[];
  extrasTotal: number;
}

/**
 * Parses extras input and fetches product data with price calculation.
 * @param merchantId Firestore UID of the merchant
 * @param extras Array of extras { id, quantity }
 * @param estimatedKilo Estimated kilos to scale quantities
 * @returns Object containing parsed extras and total price
 */
export async function parseExtras(
  merchantId: string,
  extras: ExtraInput[] = [],
  estimatedKilo: number = 1
): Promise<ParseExtrasResult> {
  const validExtras = extras.filter((extra) => extra?.id);

  if (validExtras.length === 0) {
    return { extraProducts: [], extrasTotal: 0 };
  }

  const extrasSnap = await Promise.all(
    validExtras.map((extra) =>
      admin
        .firestore()
        .collection("businesses")
        .doc(merchantId)
        .collection("products")
        .doc(extra.id)
        .get()
    )
  );

  const extraProducts: ParsedExtra[] = [];
  let extrasTotal = 0;

  extrasSnap.forEach((snap, index) => {
    const data = snap.data();
    const input = validExtras[index];

    const price = typeof data?.price === "string" ? parseFloat(data.price) : (data?.price ?? 0);
    const rawQuantity = input.quantity || 1;
    const scaledQuantity = rawQuantity * estimatedKilo;

    extraProducts.push({
      id: input.id,
      name: data?.name || "Unknown Extra",
      price,
      quantity: scaledQuantity,
    });

    extrasTotal += price * scaledQuantity;
  });

  return { extraProducts, extrasTotal };
}
