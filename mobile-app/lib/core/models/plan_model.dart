class PlanModel {
  final int id;
  final String name;
  final String type;
  final double price;
  final String currency;
  final String billingCycle;
  final int? deviceLimit;
  final int? userLimit;
  final int? whatsappMessageLimit;
  final int? branchLimit;
  final List<String> features;
  final bool isActive;

  const PlanModel({
    required this.id,
    required this.name,
    required this.type,
    required this.price,
    required this.currency,
    required this.billingCycle,
    this.deviceLimit,
    this.userLimit,
    this.whatsappMessageLimit,
    this.branchLimit,
    required this.features,
    required this.isActive,
  });

  factory PlanModel.fromJson(Map<String, dynamic> json) => PlanModel(
        id: json['id'] as int,
        name: json['name'] as String,
        type: (json['type'] as String?) ?? 'standard',
        price: double.tryParse(json['price'].toString()) ?? 0.0,
        currency: (json['currency'] as String?) ?? 'INR',
        billingCycle: (json['billing_cycle'] as String?) ?? 'monthly',
        deviceLimit: json['device_limit'] as int?,
        userLimit: json['user_limit'] as int?,
        whatsappMessageLimit: json['whatsapp_message_limit'] as int?,
        branchLimit: json['branch_limit'] as int?,
        features: List<String>.from((json['features'] as List<dynamic>?) ?? []),
        isActive: (json['is_active'] as bool?) ?? true,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'type': type,
        'price': price,
        'currency': currency,
        'billing_cycle': billingCycle,
        'device_limit': deviceLimit,
        'user_limit': userLimit,
        'whatsapp_message_limit': whatsappMessageLimit,
        'branch_limit': branchLimit,
        'features': features,
        'is_active': isActive,
      };

  String get cycleShort {
    switch (billingCycle) {
      case 'yearly':
        return 'yr';
      case 'quarterly':
        return 'qtr';
      default:
        return 'mo';
    }
  }

  String get formattedPrice =>
      '${currency == 'INR' ? '₹' : currency}${price.toStringAsFixed(0)}/$cycleShort';
}
