'use strict';

const Account = require('../models/Account');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Product = require('../models/Product');

function getCart(req) {
  return new Cart(req.session.cart || {});
}

function productFormView(req, res, options = {}) {
  res.render('staff-product-form', {
    product: options.product || {},
    error: options.error || null,
    isEdit: Boolean(options.isEdit),
    title: options.title || 'Product',
    action: options.action || '/staff/products',
    categories: Product.getCategories(),
    types: Product.getTypes(),
    cartCount: getCart(req).count,
  });
}

function customerOrderView(req, res, options = {}) {
  res.render('staff-customer-order', {
    error: options.error || null,
    customers: Account.getCustomers(),
    products: Product.getAll(),
    form: options.form || {},
    cartCount: getCart(req).count,
  });
}

exports.listProducts = (req, res) => {
  res.render('staff-products', {
    products: Product.getAll(),
    cartCount: getCart(req).count,
  });
};

exports.showCreateProduct = (req, res) => {
  productFormView(req, res, {
    title: 'Add Product',
    action: '/staff/products',
  });
};

exports.createProduct = (req, res) => {
  try {
    Product.add(req.body);
    res.redirect('/staff/products');
  } catch (err) {
    productFormView(req, res, {
      title: 'Add Product',
      action: '/staff/products',
      product: req.body,
      error: err.message,
    });
  }
};

exports.showEditProduct = (req, res) => {
  const product = Product.getById(req.params.id);
  if (!product) return res.status(404).send('Product not found');

  return productFormView(req, res, {
    title: 'Edit Product',
    action: `/staff/products/${product.id}`,
    product,
    isEdit: true,
  });
};

exports.updateProduct = (req, res) => {
  try {
    Product.update(req.params.id, req.body);
    res.redirect('/staff/products');
  } catch (err) {
    if (err.message === 'Product not found.') {
      return res.status(404).send('Product not found');
    }

    return productFormView(req, res, {
      title: 'Edit Product',
      action: `/staff/products/${req.params.id}`,
      product: { ...req.body, id: req.params.id },
      isEdit: true,
      error: err.message,
    });
  }
};

exports.deleteProduct = (req, res) => {
  try {
    Product.remove(req.params.id);
    res.redirect('/staff/products');
  } catch (_) {
    res.status(404).send('Product not found');
  }
};

exports.showCreateCustomerOrder = (req, res) => {
  customerOrderView(req, res);
};

exports.createCustomerOrder = (req, res) => {
  const productIds = Array.isArray(req.body.productId) ? req.body.productId : [req.body.productId];
  const quantities = Array.isArray(req.body.qty) ? req.body.qty : [req.body.qty];
  const customer = Account.findById(req.body.customerId);

  try {
    if (!customer || !Account.isCustomer(customer)) {
      throw new Error('Customer account is required.');
    }

    const orderCart = new Cart();
    productIds.forEach((productId, index) => {
      const qty = Number(quantities[index] || 0);
      if (qty <= 0) return;

      const product = Product.getById(productId);
      if (!product) throw new Error('Product not found.');
      orderCart.add(product, qty);
    });

    if (orderCart.count === 0) {
      throw new Error('Please choose at least one product.');
    }

    const order = Order.add({
      id: 'ORD-' + Date.now(),
      userId: customer.id,
      email: customer.email,
      items: orderCart.lines,
      total: orderCart.total,
      name: String(req.body.name || customer.name).trim(),
      address: String(req.body.address || customer.address).trim(),
      placedAt: new Date().toLocaleString('vi-VN'),
      createdByStaffId: req.session.user.id,
      createdByStaffEmail: req.session.user.email,
      channel: 'staff',
    });

    res.render('order-complete', {
      order,
      cartCount: getCart(req).count,
    });
  } catch (err) {
    customerOrderView(req, res, {
      error: err.message,
      form: req.body,
    });
  }
};
