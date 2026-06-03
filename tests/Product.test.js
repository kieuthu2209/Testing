'use strict';

const fs = require('fs');
const path = require('path');
const Product = require('../models/Product');

const dataFile = path.join(__dirname, '..', 'data', 'products.json');
const backup = dataFile + '.bak';

const NEW_PRODUCT = {
  name: 'Staff Test Hoodie',
  price: 39.95,
  image: '/images/bolt-shirt.svg',
  category: 'Apparel',
  type: 'T-Shirt',
  badge: 'New',
  desc: 'Created by staff in a unit test.',
};

beforeAll(() => {
  if (fs.existsSync(dataFile)) fs.copyFileSync(dataFile, backup);
});

afterAll(() => {
  if (fs.existsSync(backup)) {
    fs.copyFileSync(backup, dataFile);
    fs.unlinkSync(backup);
  }
});

beforeEach(() => {
  if (fs.existsSync(backup)) fs.copyFileSync(backup, dataFile);
});

afterEach(() => {
  if (fs.existsSync(backup)) fs.copyFileSync(backup, dataFile);
});

describe('Product model', () => {
  test('getAll returns all products', () => {
    const products = Product.getAll();
    expect(products).toBeInstanceOf(Array);
    expect(products.length).toBeGreaterThanOrEqual(6);
  });

  test('getById returns the correct product', () => {
    const product = Product.getById(1);
    expect(product).toBeDefined();
    expect(product.id).toBe(1);
    expect(product.name).toContain('Sauce Labs Backpack');
  });

  test('getById returns undefined for missing product', () => {
    expect(Product.getById(999)).toBeUndefined();
  });

  test('getCategories returns unique categories', () => {
    const categories = Product.getCategories();
    expect(Array.isArray(categories)).toBe(true);
    expect(new Set(categories).size).toBe(categories.length);
    expect(categories).toEqual(expect.arrayContaining(['Accessories', 'Apparel', 'Outdoor']));
  });

  test('getTypes returns unique types from JSON', () => {
    const types = Product.getTypes();
    expect(Array.isArray(types)).toBe(true);
    expect(new Set(types).size).toBe(types.length);
    expect(types).toEqual(expect.arrayContaining(['Backpack', 'T-Shirt', 'Onesie']));
  });

  test('add creates and persists a new product', () => {
    const before = Product.getAll();
    const created = Product.add(NEW_PRODUCT);
    const after = Product.getAll();

    expect(created).toMatchObject({
      id: expect.any(Number),
      name: NEW_PRODUCT.name,
      price: NEW_PRODUCT.price,
    });
    expect(created.createdAt).toBeDefined();
    expect(after).toHaveLength(before.length + 1);
    expect(Product.getById(created.id)).toMatchObject({ name: NEW_PRODUCT.name });
  });

  test('add validates required product fields', () => {
    expect(() => Product.add({ ...NEW_PRODUCT, name: '' })).toThrow('Product name is required.');
    expect(() => Product.add({ ...NEW_PRODUCT, price: -1 })).toThrow('Product price must be a non-negative number.');
    expect(() => Product.add({ ...NEW_PRODUCT, category: '' })).toThrow('Product category is required.');
    expect(() => Product.add({ ...NEW_PRODUCT, type: '' })).toThrow('Product type is required.');
  });

  test('update changes product fields', () => {
    const created = Product.add(NEW_PRODUCT);
    const updated = Product.update(created.id, {
      name: 'Updated Staff Hoodie',
      price: 42,
      category: 'Apparel',
      type: 'T-Shirt',
      image: '/images/red-tshirt.svg',
      desc: 'Updated by staff.',
      badge: '',
    });

    expect(updated).toMatchObject({
      id: created.id,
      name: 'Updated Staff Hoodie',
      price: 42,
      badge: null,
    });
    expect(updated.updatedAt).toBeDefined();
  });

  test('update throws for missing product', () => {
    expect(() => Product.update(99999, NEW_PRODUCT)).toThrow('Product not found.');
  });

  test('remove deletes product', () => {
    const created = Product.add(NEW_PRODUCT);
    const removed = Product.remove(created.id);

    expect(removed.id).toBe(created.id);
    expect(Product.getById(created.id)).toBeUndefined();
  });

  test('remove throws for missing product', () => {
    expect(() => Product.remove(99999)).toThrow('Product not found.');
  });
});
