declare module 'iyzipay' {
  interface IyzipayConfig {
    apiKey: string;
    secretKey: string;
    uri: string;
  }

  interface PaymentCard {
    cardHolderName: string;
    cardNumber: string;
    expireMonth: string;
    expireYear: string;
    cvc: string;
    registerCard?: string;
  }

  interface Buyer {
    id: string;
    name: string;
    surname: string;
    gsmNumber: string;
    email: string;
    identityNumber: string;
    registrationAddress: string;
    ip: string;
    city: string;
    country: string;
  }

  interface Address {
    contactName: string;
    city: string;
    country: string;
    address: string;
  }

  interface BasketItem {
    id: string;
    name: string;
    category1: string;
    itemType: string;
    price: string;
  }

  interface ThreeDSInitializeRequest {
    locale: string;
    conversationId: string;
    price: string;
    paidPrice: string;
    currency: string;
    installment: string;
    basketId: string;
    paymentChannel: string;
    paymentGroup: string;
    callbackUrl: string;
    paymentCard: PaymentCard;
    buyer: Buyer;
    shippingAddress: Address;
    billingAddress: Address;
    basketItems: BasketItem[];
  }

  interface ThreeDSPaymentRequest {
    locale: string;
    conversationId: string;
    paymentId: string;
  }

  interface IyzipayResult {
    status: string;
    errorCode?: string;
    errorMessage?: string;
    threeDSHtmlContent?: string;
    paymentId?: string;
    paidPrice?: string;
  }

  class Iyzipay {
    constructor(config: IyzipayConfig);
    
    threedsInitialize: {
      create(request: ThreeDSInitializeRequest, callback: (err: any, result: IyzipayResult) => void): void;
    };
    
    threedsPayment: {
      create(request: ThreeDSPaymentRequest, callback: (err: any, result: IyzipayResult) => void): void;
    };

    static LOCALE: {
      TR: string;
      EN: string;
    };

    static CURRENCY: {
      TRY: string;
      EUR: string;
      USD: string;
    };

    static PAYMENT_CHANNEL: {
      WEB: string;
      MOBILE: string;
      MOBILE_WEB: string;
    };

    static PAYMENT_GROUP: {
      PRODUCT: string;
      LISTING: string;
      SUBSCRIPTION: string;
    };

    static BASKET_ITEM_TYPE: {
      PHYSICAL: string;
      VIRTUAL: string;
    };
  }

  export = Iyzipay;
}

