class ProductModel {
  final int id;
  final int businessId;
  final String name;
  final String? productCode;
  final String? sku;
  final String? barcode;
  final int? categoryId;
  final String? categoryName;
  final int? brandId;
  final String? brandName;
  final String? hsnCode;
  final double gstPercentage;
  final String? description;
  final double purchasePrice;
  final double salePrice;
  final double? wholesalePrice;
  final double? mrp;
  final double discountPercentage;
  final int? primaryUnitId;
  final String? primaryUnitName;
  final String? imageUrl;
  final bool isActive;
  final double currentStock;
  final double minimumStock;

  const ProductModel({
    required this.id,
    required this.businessId,
    required this.name,
    this.productCode,
    this.sku,
    this.barcode,
    this.categoryId,
    this.categoryName,
    this.brandId,
    this.brandName,
    this.hsnCode,
    this.gstPercentage = 0,
    this.description,
    required this.purchasePrice,
    required this.salePrice,
    this.wholesalePrice,
    this.mrp,
    this.discountPercentage = 0,
    this.primaryUnitId,
    this.primaryUnitName,
    this.imageUrl,
    required this.isActive,
    this.currentStock = 0,
    this.minimumStock = 0,
  });

  factory ProductModel.fromJson(Map<String, dynamic> json) => ProductModel(
        id: json['id'] as int,
        businessId: json['business_id'] as int,
        name: json['name'] as String,
        productCode: json['product_code'] as String?,
        sku: json['sku'] as String?,
        barcode: json['barcode'] as String?,
        categoryId: json['category_id'] as int?,
        categoryName: json['category']?['name'] as String?,
        brandId: json['brand_id'] as int?,
        brandName: json['brand']?['name'] as String?,
        hsnCode: json['hsn_code'] as String?,
        gstPercentage: _toDouble(json['gst_percentage']),
        description: json['description'] as String?,
        purchasePrice: _toDouble(json['purchase_price']),
        salePrice: _toDouble(json['sale_price']),
        wholesalePrice: json['wholesale_price'] != null
            ? _toDouble(json['wholesale_price'])
            : null,
        mrp: json['mrp'] != null ? _toDouble(json['mrp']) : null,
        discountPercentage: _toDouble(json['discount_percentage']),
        primaryUnitId: json['primary_unit_id'] as int?,
        primaryUnitName: json['primary_unit']?['short_name'] as String? ??
            json['primary_unit']?['name'] as String?,
        imageUrl: json['image_url'] as String?,
        isActive: (json['is_active'] as bool?) ?? true,
        currentStock: _toDouble(json['stock']?['current_stock']),
        minimumStock: _toDouble(json['stock']?['minimum_stock']),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'business_id': businessId,
        'name': name,
        'product_code': productCode,
        'sku': sku,
        'barcode': barcode,
        'category_id': categoryId,
        'brand_id': brandId,
        'hsn_code': hsnCode,
        'gst_percentage': gstPercentage,
        'description': description,
        'purchase_price': purchasePrice,
        'sale_price': salePrice,
        'wholesale_price': wholesalePrice,
        'mrp': mrp,
        'discount_percentage': discountPercentage,
        'primary_unit_id': primaryUnitId,
        'image_url': imageUrl,
        'is_active': isActive,
      };

  bool get isLowStock => currentStock <= minimumStock;
  bool get isOutOfStock => currentStock <= 0;
  double get effectivePrice =>
      discountPercentage > 0
          ? salePrice * (1 - discountPercentage / 100)
          : salePrice;

  static double _toDouble(dynamic val) {
    if (val == null) return 0.0;
    if (val is double) return val;
    if (val is int) return val.toDouble();
    return double.tryParse(val.toString()) ?? 0.0;
  }
}
