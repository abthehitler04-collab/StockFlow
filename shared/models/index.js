class User {
  constructor({ id, name, email, role, location, status }) {
    this.id = id || '';
    this.name = name || '';
    this.email = email || '';
    this.role = role || 'Viewer';
    this.location = location || '';
    this.status = status || 'Active';
  }
}

class Employee extends User {
  constructor(data = {}) {
    super(data);
    this.employeeId = data.employeeId || '';
    this.phone = data.phone || '';
    this.department = data.department || '';
  }
}

class Permission {
  constructor({ name, description, allowedRoles = [] }) {
    this.name = name || '';
    this.description = description || '';
    this.allowedRoles = allowedRoles;
  }
}

class Product {
  constructor({ id, sku, brand, model, specs, variant, color, stockType, status }) {
    this.id = id || '';
    this.sku = sku || '';
    this.brand = brand || '';
    this.model = model || '';
    this.specs = specs || '';
    this.variant = variant || '';
    this.color = color || '';
    this.stockType = stockType || 'Regular';
    this.status = status || 'Active';
  }
}

class InventoryItem {
  constructor({ id, sku, brand, model, color, location, quantity, unitCost, sellingPrice, status }) {
    this.id = id || '';
    this.sku = sku || '';
    this.brand = brand || '';
    this.model = model || '';
    this.color = color || '';
    this.location = location || '';
    this.quantity = quantity || 0;
    this.unitCost = unitCost || 0;
    this.sellingPrice = sellingPrice || 0;
    this.status = status || 'In Stock';
  }
}

class IMEI {
  constructor({ id, imei1, imei2, serialNumber, sku, status, currentLocation, currentHolder }) {
    this.id = id || '';
    this.imei1 = imei1 || '';
    this.imei2 = imei2 || '';
    this.serialNumber = serialNumber || '';
    this.sku = sku || '';
    this.status = status || 'In Stock';
    this.currentLocation = currentLocation || '';
    this.currentHolder = currentHolder || '';
  }
}

class Transfer {
  constructor({ id, transferRef, fromLocation, toLocation, status, items = [], totalUnits = 0 }) {
    this.id = id || '';
    this.transferRef = transferRef || '';
    this.fromLocation = fromLocation || '';
    this.toLocation = toLocation || '';
    this.status = status || 'Pending';
    this.items = items;
    this.totalUnits = totalUnits;
  }
}

class Sale {
  constructor({ id, invoiceNo, customerName, salesperson, location, total, paid, due, paymentStatus }) {
    this.id = id || '';
    this.invoiceNo = invoiceNo || '';
    this.customerName = customerName || '';
    this.salesperson = salesperson || '';
    this.location = location || '';
    this.total = total || 0;
    this.paid = paid || 0;
    this.due = due || 0;
    this.paymentStatus = paymentStatus || 'Due';
  }
}

class Payment {
  constructor({ id, paymentId, customer, amount, method, status, receivedBy }) {
    this.id = id || '';
    this.paymentId = paymentId || '';
    this.customer = customer || '';
    this.amount = amount || 0;
    this.method = method || 'Cash';
    this.status = status || 'Due';
    this.receivedBy = receivedBy || '';
  }
}

class Repair {
  constructor({ id, ticketNo, imei, product, customer, status, technician }) {
    this.id = id || '';
    this.ticketNo = ticketNo || '';
    this.imei = imei || '';
    this.product = product || '';
    this.customer = customer || '';
    this.status = status || 'Received';
    this.technician = technician || '';
  }
}

class AuditLog {
  constructor({ id, who, when, action, reference, oldValue, newValue, reason }) {
    this.id = id || '';
    this.who = who || 'System';
    this.when = when || new Date().toISOString();
    this.action = action || 'UPDATE';
    this.reference = reference || '';
    this.oldValue = oldValue || '';
    this.newValue = newValue || '';
    this.reason = reason || '';
  }
}

module.exports = {
  User,
  Employee,
  Permission,
  Product,
  InventoryItem,
  IMEI,
  Transfer,
  Sale,
  Payment,
  Repair,
  AuditLog,
};
