// 상품 상태
export const PRODUCT_STATUS = {
  PENDING: 0,
  ACTIVE: 1,
  SOLD_OUT: 2,
} as const; // TypeScript 3.4+ as const assertion for stricter typing

export const PRODUCT_STATUS_TEXT = {
  [PRODUCT_STATUS.PENDING]: "PENDING",
  [PRODUCT_STATUS.ACTIVE]: "ACTIVE",
  [PRODUCT_STATUS.SOLD_OUT]: "SOLD_OUT",
} as const;

// 사용자 타입
export const USER_TYPE = {
  GOLD: "GOLD_MEMBER",
  SILVER: "SILVER_MEMBER",
  BRONZE: "BRONZE_MEMBER",
} as const;

// 할인율
export const DISCOUNT_RATE = {
  [USER_TYPE.GOLD]: 0.2, // 20%
  [USER_TYPE.SILVER]: 0.1, // 10%
  [USER_TYPE.BRONZE]: 0.05, // 5%
} as const;
