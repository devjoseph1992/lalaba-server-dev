// utils/validators.ts

// ✅ Detect credit card brand
export const getCardBrand = (cardNumber: string): string => {
  const cleaned = cardNumber.replace(/\D/g, "");

  const patterns: { [key: string]: RegExp } = {
    Visa: /^4[0-9]{12}(?:[0-9]{3})?$/,
    MasterCard: /^(5[1-5][0-9]{14}|2[2-7][0-9]{14})$/,
    AmericanExpress: /^3[47][0-9]{13}$/,
    Discover: /^6(?:011|5[0-9]{2})[0-9]{12}$/,
    JCB: /^(?:2131|1800|35\d{3})\d{11}$/,
    UnionPay: /^62[0-9]{14,17}$/,
  };

  for (const brand in patterns) {
    if (patterns[brand].test(cleaned)) return brand;
  }

  return "Unknown";
};

// ✅ Luhn Algorithm for credit card validation
export const isValidCardNumber = (cardNumber: string): boolean => {
  const cleaned = cardNumber.replace(/\D/g, "");
  if (cleaned.length < 13 || cleaned.length > 19) return false;

  let sum = 0;
  let shouldDouble = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
};

// ✅ Expiry: supports MM/YY or MM/YYYY, must be future date
export const isValidExpiry = (expiry: string): boolean => {
  const match = expiry.match(/^(0[1-9]|1[0-2])\/(\d{2}|\d{4})$/);
  if (!match) return false;

  const [monthStr, yearStr] = expiry.split("/");
  const month = parseInt(monthStr, 10);
  let year = parseInt(yearStr, 10);

  if (yearStr.length === 2) {
    // convert YY -> YYYY
    year += 2000;
  }

  const now = new Date();
  const expiryDate = new Date(year, month - 1, 1);

  return expiryDate >= new Date(now.getFullYear(), now.getMonth(), 1);
};

// ✅ CVC: 3 or 4 digits
export const isValidCVC = (cvc: string): boolean => {
  return /^\d{3,4}$/.test(cvc);
};
