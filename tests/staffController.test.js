'use strict';

const fs = require('fs');
const path = require('path');
const Account = require('../models/Account');
const Order = require('../models/Order');
const Product = require('../models/Product');
const staffCtrl = require('../controllers/staffController');

const accountsFile = path.join(__dirname, '..', 'data', 'accounts.json');
const ordersFile = path.join(__dirname, '..', 'data', 'orders.json');
const productsFile = path.join(__dirname, '..', 'data', 'products.json');
const accBackup = accountsFile + '.bak';
const ordBackup = ordersFile + '.bak';
const prodBackup = productsFile + '.bak';

const STAFF_SESSION = {
  user: { id: 10, name: 'Staff', email: 'staff@example.com', role: 'staff' },
};

const PRODUCT_FORM = {
  name: 'Staff Created Shirt',
  price: '19.95',
  image: '/images/red-tshirt.svg',
  category: 'Apparel',
  type: 'T-Shirt',
  badge: 'New',
  desc: 'Created from staff controller test.',
};

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.send = jest.fn(() => res);
  res.render = jest.fn(() => res);
  res.redirect = jest.fn(() => res);
  return res;
}

beforeAll(() => {
  if (fs.existsSync(accountsFile)) fs.copyFileSync(accountsFile, accBackup);
  if (fs.existsSync(ordersFile)) fs.copyFileSync(ordersFile, ordBackup);
  if (fs.existsSync(productsFile)) fs.copyFileSync(productsFile, prodBackup);
});

afterAll(() => {
  if (fs.existsSync(accBackup)) { fs.copyFileSync(accBackup, accountsFile); fs.unlinkSync(accBackup); }
  if (fs.existsSync(ordBackup)) { fs.copyFileSync(ordBackup, ordersFile); fs.unlinkSync(ordBackup); }
  if (fs.existsSync(prodBackup)) { fs.copyFileSync(prodBackup, productsFile); fs.unlinkSync(prodBackup); }
});

beforeEach(() => {
  fs.writeFileSync(accountsFile, '[]');
  fs.writeFileSync(ordersFile, '[]');
  if (fs.existsSync(prodBackup)) fs.copyFileSync(prodBackup, productsFile);
});

afterEach(() => {
  fs.writeFileSync(accountsFile, '[]');
  fs.writeFileSync(ordersFile, '[]');
  if (fs.existsSync(prodBackup)) fs.copyFileSync(prodBackup, productsFile);
});

describe('staff product actions', () => {
  test('listProducts renders all products', () => {
    const res = mockRes();
    staffCtrl.listProducts({ session: STAFF_SESSION }, res);

    expect(res.render).toHaveBeenCalledWith('staff-products', expect.objectContaining({
      products: expect.any(Array),
    }));
  });

  test('createProduct adds product and redirects', () => {
    const before = Product.getAll().length;
    const res = mockRes();
    staffCtrl.createProduct({ session: STAFF_SESSION, body: PRODUCT_FORM }, res);

    expect(res.redirect).toHaveBeenCalledWith('/staff/products');
    expect(Product.getAll()).toHaveLength(before + 1);
    expect(Product.getAll()).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: PRODUCT_FORM.name }),
    ]));
  });

  test('createProduct re-renders form when data is invalid', () => {
    const res = mockRes();
    staffCtrl.createProduct({ session: STAFF_SESSION, body: { ...PRODUCT_FORM, name: '' } }, res);

    expect(res.render).toHaveBeenCalledWith('staff-product-form', expect.objectContaining({
      error: 'Product name is required.',
      product: expect.objectContaining({ price: PRODUCT_FORM.price }),
    }));
  });

  test('showEditProduct returns 404 for missing product', () => {
    const res = mockRes();
    staffCtrl.showEditProduct({ session: STAFF_SESSION, params: { id: 99999 } }, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith('Product not found');
  });

  test('updateProduct changes product and redirects', () => {
    const product = Product.add(PRODUCT_FORM);
    const res = mockRes();
    staffCtrl.updateProduct({
      session: STAFF_SESSION,
      params: { id: product.id },
      body: { ...PRODUCT_FORM, name: 'Updated Staff Shirt', price: '22.50' },
    }, res);

    expect(res.redirect).toHaveBeenCalledWith('/staff/products');
    expect(Product.getById(product.id)).toMatchObject({
      name: 'Updated Staff Shirt',
      price: 22.5,
    });
  });

  test('deleteProduct removes product and redirects', () => {
    const product = Product.add(PRODUCT_FORM);
    const res = mockRes();
    staffCtrl.deleteProduct({ session: STAFF_SESSION, params: { id: product.id } }, res);

    expect(res.redirect).toHaveBeenCalledWith('/staff/products');
    expect(Product.getById(product.id)).toBeUndefined();
  });
});

describe('staff customer order actions', () => {
  test('showCreateCustomerOrder renders customers and products', () => {
    Account.add({ name: 'Customer', email: 'customer@example.com', password: 'pass', address: '1 St' });
    Account.add({ name: 'Staff User', email: 'staff@example.com', password: 'pass', address: '2 St', role: 'staff' });
    const res = mockRes();

    staffCtrl.showCreateCustomerOrder({ session: STAFF_SESSION }, res);

    expect(res.render).toHaveBeenCalledWith('staff-customer-order', expect.objectContaining({
      customers: [expect.objectContaining({ email: 'customer@example.com' })],
      products: expect.any(Array),
    }));
  });

  test('createCustomerOrder creates order for selected customer', () => {
    const customer = Account.add({ name: 'Customer', email: 'customer@example.com', password: 'pass', address: '1 St' });
    const product = Product.getById(1);
    const res = mockRes();

    staffCtrl.createCustomerOrder({
      session: STAFF_SESSION,
      body: {
        customerId: customer.id,
        productId: product.id,
        qty: '2',
      },
    }, res);

    const [order] = Order.getAll();
    expect(res.render).toHaveBeenCalledWith('order-complete', expect.objectContaining({
      order: expect.objectContaining({ userId: customer.id, channel: 'staff' }),
    }));
    expect(order).toMatchObject({
      userId: customer.id,
      email: customer.email,
      createdByStaffId: STAFF_SESSION.user.id,
      createdByStaffEmail: STAFF_SESSION.user.email,
    });
    expect(order.items).toHaveLength(1);
    expect(order.items[0].qty).toBe(2);
    expect(order.total).toBeGreaterThan(product.price);
  });

  test('createCustomerOrder rejects missing customer', () => {
    const res = mockRes();

    staffCtrl.createCustomerOrder({
      session: STAFF_SESSION,
      body: { customerId: 99999, productId: 1, qty: '1' },
    }, res);

    expect(Order.getAll()).toHaveLength(0);
    expect(res.render).toHaveBeenCalledWith('staff-customer-order', expect.objectContaining({
      error: 'Customer account is required.',
    }));
  });
});
