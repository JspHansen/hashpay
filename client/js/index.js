'use strict';

const jStripe = Stripe('pk_test_ZbLym6LFKkbNowX0vXSq5NKH');
const jAxios = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 20000,
  headers: {'X-Custom-Header': 'foobar'}
});

function registerElements(elements, checkoutForm) {
  var formClass = '.' + checkoutForm;
  var checkout = document.querySelector(formClass);

  var form = checkout.querySelector('form');
  var resetButton = checkout.querySelector('a.reset');
  var error = form.querySelector('.error');
  var errorMessage = error.querySelector('.message');

  function enableInputs() {
    Array.prototype.forEach.call(
      form.querySelectorAll(
        "input[type='text'], input[type='email'], input[type='tel']"
      ),
      function(input) {
        input.removeAttribute('disabled');
      }
    );
  }

  function disableInputs() {
    Array.prototype.forEach.call(
      form.querySelectorAll(
        "input[type='text'], input[type='email'], input[type='tel']"
      ),
      function(input) {
        input.setAttribute('disabled', 'true');
      }
    );
  }

  function triggerBrowserValidation() {
    var submit = document.createElement('input');
    submit.type = 'submit';
    submit.style.display = 'none';
    form.appendChild(submit);
    submit.click();
    submit.remove();
  }

  function getFormData() {
    var name = form.querySelector('#' + checkoutForm + '-name');
    var email = form.querySelector('#' + checkoutForm + '-email');
    var line1 = form.querySelector('#' + checkoutForm + '-address');
    var city = form.querySelector('#' + checkoutForm + '-city');
    var state = form.querySelector('#' + checkoutForm + '-state');
    var zip = form.querySelector('#' + checkoutForm + '-zip');
    return {
      name: name ? name.value : '',
      email: email ? email.value : '',
      address_line1: line1 ? line1.value : '',
      address_city: city ? city.value : '',
      address_state: state ? state.value : '',
      address_zip: zip ? zip.value : '',
    };
  }

  function createCharge(token, formData) {
    formData = getFormData();
    jAxios.post('/charge', {
      amount: 2500,
      currency: "usd",
      source: token.id,
      description: '',
      receipt_email: formData.email,
      shipping: {
        name: formData.name,
        address: {
          line1: formData.address_line1,
          city: formData.address_city,
          state: formData.address_state,
          postal_code: formData.address_zip,
          country: 'US'
        }
      }
    })
    .then(response => {
      if (response.data.success) {
        savePayment(response.data.charge);
      } else {
        checkout.querySelector('.charge-amount').innerText = "payment failed";
        checkout.classList.add('submitted');
        checkout.classList.remove('submitting');
      }
    })
    .catch(error => {
      checkout.classList.remove('submitting');
    });
  }

  function savePayment(data) {
    jAxios.post('/save-payment', {
      name: data.source.name,
      email: data.receipt_email,
      amount: Math.floor(data.amount / 100),
      tokenId: data.id
    })
    .then(response => {
      checkout.classList.add('submitted');
      checkout.classList.remove('submitting');
      checkout.querySelector('.charge-amount').innerText = Math.floor(data.amount / 100);
    })
  }

  var savedErrors = {};
  elements.forEach(function(element, idx) {
    element.on('change', function(event) {
      if (event.error) {
        error.classList.add('visible');
        savedErrors[idx] = event.error.message;
        errorMessage.innerText = event.error.message;
      } else {
        savedErrors[idx] = null;
        var nextError = Object.keys(savedErrors)
          .sort()
          .reduce(function(maybeFoundError, key) {
            return maybeFoundError || savedErrors[key];
          }, null);

        if (nextError) {
          errorMessage.innerText = nextError;
        } else {
          error.classList.remove('visible');
        }
      }
    });
  });

  form.addEventListener('submit', function(e) {
    e.preventDefault();

    var plainInputsValid = true;
    Array.prototype.forEach.call( form.querySelectorAll('input'), function(input) {
      if (input.checkValidity && !input.checkValidity()) {
        plainInputsValid = false;
        return;
      }
    });

    if (!plainInputsValid) {
      triggerBrowserValidation();
      return;
    }

    checkout.classList.add('submitting');
    disableInputs();

    var formData = getFormData();
    jStripe.createToken(elements[0], formData)
      .then(function(result) {
        if (result.token) {
          createCharge(result.token);
        } else {
          enableInputs();
          checkout.classList.remove('submitting');
        }
      })
      .catch(error => {
        checkout.classList.remove('submitting');
      });
  });

  resetButton.addEventListener('click', function(e) {
    e.preventDefault();
    form.reset();
    elements.forEach(function(element) {
      element.clear();
    });
    error.classList.remove('visible');
    enableInputs();
    checkout.classList.remove('submitted');
  });
}
