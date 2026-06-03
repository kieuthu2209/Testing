'use strict';

const fs = require('fs');
const path = require('path');
const Category = require('./Category');

const dataFile = path.join(__dirname, '..', 'data', 'products.json');
const typesFile = path.join(__dirname, '..', 'data', 'types.json');

function readJsonArray(file) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

function writeProducts(products) {
  fs.writeFileSync(dataFile, JSON.stringify(products, null, 2));
}

function nextProductId(products) {
  const maxId = products.reduce((max, p) => Math.max(max, Number(p.id) || 0), 0);
  return maxId + 1;
}

function normalizeProduct(fields, existing = {}) {
  const name = String(fields.name ?? existing.name ?? '').trim();
  const category = String(fields.category ?? existing.category ?? '').trim();
  const type = String(fields.type ?? existing.type ?? '').trim();
  const desc = String(fields.desc ?? existing.desc ?? '').trim();
  const image = String(fields.image ?? existing.image ?? '').trim() || '/images/bolt-shirt.svg';
  const badgeValue = fields.badge ?? existing.badge ?? null;
  const badge = badgeValue ? String(badgeValue).trim() || null : null;
  const price = Number(fields.price ?? existing.price);

  if (!name) throw new Error('Product name is required.');
  if (!Number.isFinite(price) || price < 0) {
    throw new Error('Product price must be a non-negative number.');
  }
  if (!category) throw new Error('Product category is required.');
  if (!type) throw new Error('Product type is required.');

  return {
    name,
    price: +price.toFixed(2),
    image,
    category,
    type,
    badge,
    desc,
  };
}

class Product {
  static getAll() {
    return readJsonArray(dataFile);
  }

  static getById(id) {
    return Product.getAll().find(p => p.id === Number(id));
  }

  static getCategories() {
    return Category.getAll();
  }

  static getTypes() {
    return readJsonArray(typesFile);
  }

  static add(fields) {
    const products = Product.getAll();
    const product = {
      id: nextProductId(products),
      ...normalizeProduct(fields),
      createdAt: new Date().toISOString(),
    };
    products.push(product);
    writeProducts(products);
    return product;
  }

  static update(id, fields) {
    const products = Product.getAll();
    const idx = products.findIndex(p => String(p.id) === String(id));
    if (idx === -1) throw new Error('Product not found.');

    const updated = {
      ...products[idx],
      ...normalizeProduct(fields, products[idx]),
      id: products[idx].id,
      updatedAt: new Date().toISOString(),
    };
    products[idx] = updated;
    writeProducts(products);
    return updated;
  }

  static remove(id) {
    const products = Product.getAll();
    const idx = products.findIndex(p => String(p.id) === String(id));
    if (idx === -1) throw new Error('Product not found.');

    const [removed] = products.splice(idx, 1);
    writeProducts(products);
    return removed;
  }
}

module.exports = Product;
