
class Store {
  constructor() {
    this.lineItems = [];
    this.products = {};
    this.axios = axios.create({
      baseURL: 'http://0.0.0.0:3000/v2',
      timeout: 20000,
      headers: {'X-Custom-Header': 'foobar'}
    });
    this.displayOrderSummary();
    this.status = {
      CREATED: 'created',
      PENDING: 'pending',
      FAILED: 'failed',
      PAID: 'paid'
    }
    this.countries = [{
      label: 'Australia',
      value: 'AU',
      currency: 'usd'
    },{
      label: 'Austria',
      value: 'AT',
      currency: 'eur'
    },{
      label: 'Belgium',
      value: 'BE',
      currency: 'eur'
    },{
      label: 'Brazil',
      value: 'BR',
      currency: 'usd'
    },{
      label: 'Australia',
      value: 'AU',
      currency: 'usd'
    },{
      label: 'Canada',
      value: 'CA',
      currency: 'usd'
    },{
      label: 'China',
      value: 'CN',
      currency: 'usd'
    },{
      label: 'Denmark',
      value: 'DK',
      currency: 'eur'
    },{
      label: 'Finland',
      value: 'FI',
      currency: 'eur'
    },{
      label: 'France',
      value: 'FR',
      currency: 'eur'
    },{
      label: 'Germany',
      value: 'DE',
      currency: 'eur'
    },{
      label: 'Hong Kong',
      value: 'HK',
      currency: 'usd'
    },{
      label: 'Ireland',
      value: 'IE',
      currency: 'eur'
    },{
      label: 'Italy',
      value: 'IT',
      currency: 'eur'
    },{
      label: 'Japan',
      value: 'JP',
      currency: 'usd'
    },{
      label: 'Luxembourg',
      value: 'LU',
      currency: 'eur'
    },{
      label: 'Mexico',
      value: 'MX',
      currency: 'usd'
    },{
      label: 'Netherlands',
      value: 'NL',
      currency: 'eur'
    },{
      label: 'New Zealand',
      value: 'NZ',
      currency: 'usd'
    },{
      label: 'Norway',
      value: 'NO',
      currency: 'eur'
    },{
      label: 'Portugal',
      value: 'PT',
      currency: 'eur'
    },{
      label: 'Singapore',
      value: 'SG',
      currency: 'usd'
    },{
      label: 'Spain',
      value: 'ES',
      currency: 'eur'
    },{
      label: 'Sweden',
      value: 'SE',
      currency: 'eur'
    },{
      label: 'Switzerland',
      value: 'CH',
      currency: 'eur'
    },{
      label: 'United Kingdom',
      value: 'GB',
      currency: 'eur'
    },{
      label: 'United States',
      value: 'US',
      currency: 'usd'
    }]
  }

  // Compute the total for the order based on the line items (SKUs and quantity).
  getOrderTotal() {
    return 3500;
  }

  // Expose the line items for the order (in a way that is friendly to the Stripe Orders API).
  getOrderItems() {
    let items = [];
    this.lineItems.forEach(item =>
      items.push({
        type: 'sku',
        parent: item.sku,
        quantity: item.quantity,
      })
    );
    return items;
  }

  // Retrieve the configuration from the API.
  async getConfig() {
    try {
      const response = await this.axios.get('/config');
      if (!response.data || !response.data.success) {
        throw { message: 'read config failed' }
      }
      const config = response.data;
      if (config.stripePublishableKey.includes('live')) {
        document.querySelector('#order-total .demo').style.display = 'none';
      }
      return config;
    } catch (err) {
      return { error: err.message };
    }
  }

  // Pay the specified order by sending a payment source alongside it.
  async payWithCard(status, source) {
    try {
      const response = await this.axios.post(`/card-payment`, {
        status: status,
        source: source
      });
      const data = response.data;
      if (data.error) {
        return { error: data.error };
      } else {
        return data;
      }
    } catch (err) {
      return { error: err.message };
    }
  }

  // Fetch an order status from the API.
  async getOrderStatus(orderId) {
    try {
      const response = await fetch(`/orders/${orderId}`);
      return await response.json();
    } catch (err) {
      return {error: err};
    }
  }

  // Format a price (assuming a two-decimal currency like EUR or USD for simplicity).
  formatPrice(amount, currency) {
    let price = (amount / 100).toFixed(2);
    let numberFormat = new Intl.NumberFormat(['en-US'], {
      style: 'currency',
      currency: currency,
      currencyDisplay: 'symbol',
    });
    return numberFormat.format(price);
  }

  // Set the active order ID in the local storage.
  setActiveOrderId(orderId) {
    localStorage.setItem('orderId', orderId);
  }

  // Get the active order ID from the local storage.
  getActiveOrderId() {
    return localStorage.getItem('orderId');
  }

  // Manipulate the DOM to display the order summary on the right panel.
  // Note: For simplicity, we're just using template strings to inject data in the DOM,
  // but in production you would typically use a library like React to manage this effectively.
  async displayOrderSummary() {
    const orderTotal = document.getElementById('order-total');
    const total = this.formatPrice(this.getOrderTotal(), 'usd');
    orderTotal.querySelector('[data-subtotal]').innerText = total;
    orderTotal.querySelector('[data-total]').innerText = total;
    document.getElementById('main').classList.remove('loading');
  }
}

window.store = new Store();
