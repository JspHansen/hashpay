(function() {
  'use strict';

  var elements = _stripe.elements({
    fonts: [{
      cssSrc: 'https://fonts.googleapis.com/css?family=Roboto',
    }]
  });

  var card = elements.create('card', {
    iconStyle: 'solid',
    style: {
      base: {
        iconColor: '#c4f0ff',
        color: '#fff',
        fontWeight: 500,
        fontFamily: 'Roboto, Open Sans, Segoe UI, sans-serif',
        fontSize: '16px',
        fontSmoothing: 'antialiased',
        ':-webkit-autofill': {
          color: '#fce883',
        },
        '::placeholder': {
          color: '#87BBFD',
        },
      },
      invalid: {
        iconColor: '#FFC7EE',
        color: '#FFC7EE',
      },
    },
  });
  card.mount('#card');

  /**
   * Payment Request Element
   */
  var paymentRequest = _stripe.paymentRequest({
    country: "US",
    currency: "usd",
    total: {
      amount: 2500,
      label: "Total"
    },
    requestShipping: true,
    shippingOptions: [{
      id: "free-shipping",
      label: "Free shipping",
      detail: "Arrives in 5 to 7 days",
      amount: 0
    }]
  });

  paymentRequest.on("token", function(result) {
    var checkout = document.querySelector(".checkout-form");
    checkout.querySelector(".token").innerText = result.token.id;
    checkout.classList.add("submitted");
    result.complete("success");
  });

  var paymentRequestElement = elements.create("paymentRequestButton", {
    paymentRequest: paymentRequest,
    style: {
      paymentRequestButton: {
        theme: "light"
      }
    }
  });

  paymentRequest.canMakePayment()
    .then(function(result) {
      if (result) {
        document.querySelector(
          ".checkout-form .payment-request-available"
        ).style.display =
          "block";
        paymentRequestElement.mount("#checkout-paymentRequest");
      }
    });

  registerElements([card], 'checkout-form');
})();
