class TaxRateModel {
  final int id;
  final int businessId;
  final String name;
  final double rate;
  final String type;
  final bool isActive;

  const TaxRateModel({
    required this.id,
    required this.businessId,
    required this.name,
    required this.rate,
    required this.type,
    required this.isActive,
  });

  factory TaxRateModel.fromJson(Map<String, dynamic> json) => TaxRateModel(
        id: json['id'] as int,
        businessId: json['business_id'] as int,
        name: json['name'] as String,
        rate: _toDouble(json['rate']),
        type: json['type'] as String? ?? 'GST',
        isActive: (json['is_active'] as bool?) ?? true,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'business_id': businessId,
        'name': name,
        'rate': rate,
        'type': type,
        'is_active': isActive,
      };

  static double _toDouble(dynamic val) {
    if (val == null) return 0.0;
    if (val is double) return val;
    if (val is int) return val.toDouble();
    return double.tryParse(val.toString()) ?? 0.0;
  }
}
