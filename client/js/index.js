(async () => {
  'use strict';

  const config = await store.getConfig();
  const form = document.getElementById('payment-form');
  const submitButton = form.querySelector('button[type=submit]');

  let country = config.stripeCountry;
  let currency = config.stripeCurrency;

  const style = {
    base: {
      iconColor: '#666ee8',
      color: '#31325f',
      fontWeight: 400,
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '15px',
      '::placeholder': {
        color: '#aab7c4',
      },
      ':-webkit-autofill': {
        color: '#666ee8',
      },
    }
  };

  const stripe = Stripe(config.stripePublishableKey);
  const elements = stripe.elements();
  const card = elements.create('card', { style: style, hidePostalCode: true });

  card.mount('#card-element');
  card.on('change', ({error}) => {
    const cardErrors = document.getElementById('card-errors');
    if (error) {
      cardErrors.textContent = error.message;
      cardErrors.classList.add('visible');
    } else {
      cardErrors.classList.remove('visible');
    }
    submitButton.disabled = false;
  });

  // Create a IBAN Element and pass the right options for styles and supported countries.
  const ibanOptions = {
    style,
    supportedCountries: ['SEPA'],
  };
  const iban = elements.create('iban', ibanOptions);

  iban.mount('#iban-element');
  iban.on('change', ({error, bankName}) => {
    const ibanErrors = document.getElementById('iban-errors');
    if (error) {
      ibanErrors.textContent = error.message;
      ibanErrors.classList.add('visible');
    } else {
      ibanErrors.classList.remove('visible');
      if (bankName) {
        updateButtonLabel('sepa_debit', bankName);
      }
    }
    submitButton.disabled = false;
  });

  const idealBank = elements.create('idealBank', {
    style: {base: Object.assign({padding: '10px 15px'}, style.base)},
  });
  idealBank.mount('#ideal-bank-element');

  const paymentRequest = stripe.paymentRequest({
    country: country,
    currency: currency,
    total: {
      label: 'Total',
      amount: store.getOrderTotal(),
    },
    requestShipping: true,
    requestPayerEmail: true,
    shippingOptions: [
      {
        id: 'free',
        label: 'Free Shipping',
        detail: 'Delivery within 5 days',
        amount: 0,
      },
    ],
  });

  paymentRequest.on('source', async event => {
    try {
      const order = await store.createOrder(
        currency,
        store.getOrderItems(),
        event.payerEmail,
        {
          name: event.shippingAddress.recipient,
          address: {
            line1: event.shippingAddress.addressLine[0],
            city: event.shippingAddress.city,
            country: event.shippingAddress.country,
            postal_code: event.shippingAddress.postalCode,
            state: event.shippingAddress.region,
          },
        }
      );
      await handlePayment(order, event.source);
      event.complete('success');
    } catch (error) {
      event.complete('fail');
    }
  });

  // Callback when the shipping address is updated.
  paymentRequest.on('shippingaddresschange', event => {
    event.updateWith({status: 'success'});
  });

  // Create the Payment Request Button.
  const paymentRequestButton = elements.create('paymentRequestButton', {
    paymentRequest,
  });

  // Check if the Payment Request is available (or Apple Pay on the Web).
  const paymentRequestSupport = await paymentRequest.canMakePayment();
  if (paymentRequestSupport) {
    paymentRequestButton.mount('#payment-request-button');
    document.querySelector('.instruction').innerText = 'Or enter your shipping and payment details below';
    document.getElementById('payment-request').classList.add('visible');
  }

  form
    .querySelector('select[name=country]')
    .addEventListener('change', event => {
      event.preventDefault();
      selectCountry(event.target.value);
    });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const payment = form.querySelector('input[name=payment]:checked').value;
    const name = form.querySelector('input[name=name]').value;
    const country = form.querySelector('select[name=country] option:checked').value;
    const email = form.querySelector('input[name=email]').value;
    const shipping = {
      name,
      email: email,
      address: {
        line1: form.querySelector('input[name=address]').value,
        city: form.querySelector('input[name=city]').value,
        postal_code: form.querySelector('input[name=postal_code]').value,
        state: form.querySelector('input[name=state]').value,
        country,
      },
    };
    submitButton.disabled = true;

    const status = store.status.CREATED;
    if (payment === 'card') {
      const { source } = await stripe.createSource(card, {
        owner: shipping,
        amount: store.getOrderTotal(),
        currency: currency,
      });
      console.log(source);
      await handlePayment(status, source);
    } else if (payment === 'sepa_debit') {
      const sourceData = {
        type: payment,
        currency: currency,
        owner: {
          name,
          email,
        },
        mandate: {
          notification_method: 'email',
        },
      };
      const {source} = await stripe.createSource(iban, sourceData);
      await handlePayment(status, source);
    } else {
      const sourceData = {
        type: payment,
        amount: store.getOrderTotal(),
        currency: currency,
        owner: {
          name,
          email,
        },
        redirect: {
          return_url: window.location.href,
        },
        statement_descriptor: 'Stripe Payments'
      };
      switch (payment) {
        case 'ideal':
          const {source, error} = await stripe.createSource(
            idealBank,
            sourceData
          );
          await handlePayment(status, source, error);
          return;
        case 'sofort':
          sourceData.sofort = {
            country,
          };
          break;
        case 'ach_credit_transfer':
          sourceData.owner.email = `amount_${store.getOrderTotal()}@example.com`;
          break;
      }
      const {source, error} = await stripe.createSource(sourceData);
      await handlePayment(status, source, error);
    }
  });

  // Handle the order and source activation if required
  const handlePayment = async (status, source, error = null) => {
    const mainElement = document.getElementById('main');
    const confirmationElement = document.getElementById('confirmation');
    if (error) {
      mainElement.classList.remove('processing');
      mainElement.classList.remove('receiver');
      confirmationElement.querySelector('.error-message').innerText = error.message;
      mainElement.classList.add('error');
    }
    switch (status) {
      case store.status.CREATED:
        switch (source.status) {
          case 'chargeable':
            submitButton.textContent = 'Processing Payment…';
            const response = await store.payWithCard(status, source);
            console.log(response);
            await handlePayment(response.status, response.source);
            break;
          case 'pending':
            switch (source.flow) {
              case 'none':
                if (source.type === 'wechat') {
                  const qrCode = new QRCode('wechat-qrcode', {
                    text: source.wechat.qr_code_url,
                    width: 128,
                    height: 128,
                    colorDark: '#424770',
                    colorLight: '#f8fbfd',
                    correctLevel: QRCode.CorrectLevel.H,
                  });
                  // Hide the previous text and update the call to action.
                  form.querySelector('.payment-info.wechat p').style.display = 'none';
                  let amount = store.formatPrice(
                    store.getOrderTotal(),
                    currency
                  );
                  submitButton.textContent = `Scan this QR code on WeChat to pay ${amount}`;
                  pollOrderStatus(order.id, 300000);
                } else {
                  console.log('Unhandled none flow.', source);
                }
                break;
              case 'redirect':
                // Immediately redirect the customer.
                submitButton.textContent = 'Redirecting…';
                window.location.replace(source.redirect.url);
                break;
              case 'code_verification':
                // Display a code verification input to verify the source.
                break;
              case 'receiver':
                // Display the receiver address to send the funds to.
                mainElement.classList.add('success', 'receiver');
                const receiverInfo = confirmationElement.querySelector(
                  '.receiver .info'
                );
                let amount = store.formatPrice(source.amount, currency);
                switch (source.type) {
                  case 'ach_credit_transfer':
                    // Display the ACH Bank Transfer information to the user.
                    const ach = source.ach_credit_transfer;
                    receiverInfo.innerHTML = `
                      <ul>
                        <li>
                          Amount:
                          <strong>${amount}</strong>
                        </li>
                        <li>
                          Bank Name:
                          <strong>${ach.bank_name}</strong>
                        </li>
                        <li>
                          Account Number:
                          <strong>${ach.account_number}</strong>
                        </li>
                        <li>
                          Routing Number:
                          <strong>${ach.routing_number}</strong>
                        </li>
                      </ul>`;
                    break;
                  case 'multibanco':
                    // Display the Multibanco payment information to the user.
                    const multibanco = source.multibanco;
                    receiverInfo.innerHTML = `
                      <ul>
                        <li>
                          Amount (Montante):
                          <strong>${amount}</strong>
                        </li>
                        <li>
                          Entity (Entidade):
                          <strong>${multibanco.entity}</strong>
                        </li>
                        <li>
                          Reference (Referencia):
                          <strong>${multibanco.reference}</strong>
                        </li>
                      </ul>`;
                    break;
                  default:
                    console.log('Unhandled receiver flow.', source);
                }
                // Poll the backend and check for an order status.
                // The backend updates the status upon receiving webhooks,
                // specifically the `source.chargeable` and `charge.succeeded` events.
                pollOrderStatus(order.id);
                break;
              default:
                // Order is received, pending payment confirmation.
                break;
            }
            break;
          case 'failed':
          case 'canceled':
            // Authentication failed, offer to select another payment method.
            break;
          default:
            // Order is received, pending payment confirmation.
            break;
        }
        break;

      case store.status.PENDING:
        // Success! Now waiting for payment confirmation. Update the interface to display the confirmation screen.
        mainElement.classList.remove('processing');
        // Update the note about receipt and shipping (the payment is not yet confirmed by the bank).
        confirmationElement.querySelector('.note').innerText =
          'We’ll send your receipt and ship your items as soon as your payment is confirmed.';
        mainElement.classList.add('success');
        break;

      case store.status.FAILED:
        // Payment for the order has failed.
        mainElement.classList.remove('success');
        mainElement.classList.remove('processing');
        mainElement.classList.remove('receiver');
        mainElement.classList.add('error');
        break;

      case store.status.PAID:
        // Success! Payment is confirmed. Update the interface to display the confirmation screen.
        mainElement.classList.remove('processing');
        mainElement.classList.remove('receiver');
        // Update the note about receipt and shipping (the payment has been fully confirmed by the bank).
        confirmationElement.querySelector('.note').innerText =
          'We just sent your receipt to your email address, and your items will be on their way shortly.';
        mainElement.classList.add('success');
        break;
    }
  };

  /**
   * Monitor the status of a source after a redirect flow.
   *
   * This means there is a `source` parameter in the URL, and an active order.
   * When this happens, we'll monitor the status of the order and present real-time
   * information to the user.
   */

  const pollOrderStatus = async (
    orderId,
    timeout = 30000,
    interval = 500,
    start = null
  ) => {
    start = start ? start : Date.now();
    const endStates = ['paid', 'failed'];
    // Retrieve the latest order status.
    const order = await store.getOrderStatus(orderId);
    await handlePayment(order, {status: null});
    if (
      !endStates.includes(order.metadata.status) &&
      Date.now() < start + timeout
    ) {
      // Not done yet. Let's wait and check again.
      setTimeout(pollOrderStatus, interval, orderId, timeout, interval, start);
    } else {
      if (!endStates.includes(order.metadata.status)) {
        // Status has not changed yet. Let's time out.
        console.warn(new Error('Polling timed out.'));
      }
    }
  };

  const orderId = store.getActiveOrderId();
  const mainElement = document.getElementById('main');
  if (orderId && window.location.search.includes('source')) {
    mainElement.classList.add('success', 'processing');
    pollOrderStatus(orderId);
  } else {
    mainElement.classList.add('checkout');
  }

  const paymentMethods = {
    ach_credit_transfer: {
      name: 'Bank Transfer',
      flow: 'receiver',
      countries: ['US'],
      currencies: ['usd'],
    },
    alipay: {
      name: 'Alipay',
      flow: 'redirect',
      countries: ['CN', 'HK', 'SG', 'JP'],
      currencies: [
        'aud',
        'cad',
        'eur',
        'gbp',
        'hkd',
        'jpy',
        'nzd',
        'sgd',
        'usd',
      ],
    },
    bancontact: {
      name: 'Bancontact',
      flow: 'redirect',
      countries: ['BE'],
      currencies: ['eur'],
    },
    card: {
      name: 'Card',
      flow: 'none',
    },
    eps: {
      name: 'EPS',
      flow: 'redirect',
      countries: ['AT'],
      currencies: ['eur'],
    },
    ideal: {
      name: 'iDEAL',
      flow: 'redirect',
      countries: ['NL'],
      currencies: ['eur'],
    },
    giropay: {
      name: 'Giropay',
      flow: 'redirect',
      countries: ['DE'],
      currencies: ['eur'],
    },
    multibanco: {
      name: 'Multibanco',
      flow: 'receiver',
      countries: ['PT'],
      currencies: ['eur'],
    },
    sepa_debit: {
      name: 'SEPA Direct Debit',
      flow: 'none',
      countries: ['FR', 'DE', 'ES', 'BE', 'NL', 'LU', 'IT', 'PT', 'AT', 'IE', 'FI'],
      currencies: ['eur'],
    },
    sofort: {
      name: 'SOFORT',
      flow: 'redirect',
      countries: ['DE', 'AT'],
      currencies: ['eur'],
    },
    wechat: {
      name: 'WeChat',
      flow: 'none',
      countries: ['CN', 'HK', 'SG', 'JP'],
      currencies: [
        'aud',
        'cad',
        'eur',
        'gbp',
        'hkd',
        'jpy',
        'nzd',
        'sgd',
        'usd',
      ],
    },
  };

  const updateButtonLabel = (paymentMethod, bankName) => {
    let amount = store.formatPrice(store.getOrderTotal(), currency);
    let name = paymentMethods[paymentMethod].name;
    let label = `Pay ${amount}`;
    if (paymentMethod !== 'card') {
      label = `Pay ${amount} with ${name}`;
    }
    if (paymentMethod === 'wechat') {
      label = `Generate QR code to pay ${amount} with ${name}`;
    }
    if (paymentMethod === 'sepa_debit' && bankName) {
      label = `Debit ${amount} from ${bankName}`;
    }
    submitButton.innerText = label;
  };

  const selectCountry = country => {
    const selector = document.getElementById('country');
    selector.querySelector(`option[value=${country}]`).selected = 'selected';
    selector.className = `field ${country}`;

    showRelevantFormFields();
    showRelevantPaymentMethods();
  };

  const showRelevantFormFields = country => {
    if (!country) {
      country = form.querySelector('select[name=country] option:checked').value;
    }
    const zipLabel = form.querySelector('label.zip');
    zipLabel.parentElement.classList.toggle('with-state', country === 'US');
    form.querySelector('label.zip span').innerText =
      country === 'US' ? 'ZIP' : country === 'GB' ? 'Postcode' : 'Postal Code';
  };

  const showRelevantPaymentMethods = country => {
    if (!country) {
      country = form.querySelector('select[name=country] option:checked').value;
      country = store.countries.find(_country => _country.value == country);
      currency = country.currency;
      country = country.value;
    }
    const paymentInputs = form.querySelectorAll('input[name=payment]');
    for (let i = 0; i < paymentInputs.length; i++) {
      let input = paymentInputs[i];
      input.parentElement.classList.toggle(
        'visible',
        input.value === 'card' ||
          (paymentMethods[input.value].countries.includes(country) &&
            paymentMethods[input.value].currencies.includes(currency))
      );
    }

    const paymentMethodsTabs = document.getElementById('payment-methods');
    paymentMethodsTabs.classList.toggle(
      'visible',
      paymentMethodsTabs.querySelectorAll('li.visible').length > 1
    );

    paymentInputs[0].checked = 'checked';
    form.querySelector('.payment-info.card').classList.add('visible');
    form.querySelector('.payment-info.ideal').classList.remove('visible');
    form.querySelector('.payment-info.sepa_debit').classList.remove('visible');
    form.querySelector('.payment-info.wechat').classList.remove('visible');
    form.querySelector('.payment-info.redirect').classList.remove('visible');
    updateButtonLabel(paymentInputs[0].value);
  };

  for (let input of document.querySelectorAll('input[name=payment]')) {
    input.addEventListener('change', event => {
      event.preventDefault();
      const payment = form.querySelector('input[name=payment]:checked').value;
      const flow = paymentMethods[payment].flow;
      updateButtonLabel(event.target.value);
      form
        .querySelector('.payment-info.card')
        .classList.toggle('visible', payment === 'card');
      form
        .querySelector('.payment-info.ideal')
        .classList.toggle('visible', payment === 'ideal');
      form
        .querySelector('.payment-info.sepa_debit')
        .classList.toggle('visible', payment === 'sepa_debit');
      form
        .querySelector('.payment-info.wechat')
        .classList.toggle('visible', payment === 'wechat');
      form
        .querySelector('.payment-info.redirect')
        .classList.toggle('visible', flow === 'redirect');
      form
        .querySelector('.payment-info.receiver')
        .classList.toggle('visible', flow === 'receiver');
      document
        .getElementById('card-errors')
        .classList.remove('visible', payment !== 'card');
    });
  }

  var urlParams = new URLSearchParams(window.location.search);
  let countryParam = urlParams.get('country')
    ? urlParams.get('country').toUpperCase()
    : country;
  if (form.querySelector(`option[value="${countryParam}"]`)) {
    country = countryParam;
  }
  selectCountry(country);
})();
