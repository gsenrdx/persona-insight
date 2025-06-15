import { PRODUCT_STATUS, PRODUCT_STATUS_TEXT, USER_TYPE, DISCOUNT_RATE } from '../constants/product.constants';

// ProductStatus 타입을 숫자 값들로 제한 (0, 1, 2)
type ProductStatusCode = typeof PRODUCT_STATUS[keyof typeof PRODUCT_STATUS];
// UserType을 문자열 값들로 제한 ("GOLD_MEMBER", "SILVER_MEMBER", "BRONZE_MEMBER")
type UserTypeCode = typeof USER_TYPE[keyof typeof USER_TYPE];


export function getProductStatus(status: ProductStatusCode): string {
  return PRODUCT_STATUS_TEXT[status] || "UNKNOWN";
}

export function applyDiscount(productPrice: number, userType: UserTypeCode): number {
  const discount = DISCOUNT_RATE[userType];
  if (discount !== undefined) {
    return productPrice * (1 - discount);
  }
  return productPrice;
}

// 예시 사용
// const product = { price: 10000, status: PRODUCT_STATUS.ACTIVE };
// const user = { type: USER_TYPE.GOLD };

// console.log(getProductStatus(product.status)); // "ACTIVE"
// console.log(applyDiscount(product.price, user.type)); // 8000
