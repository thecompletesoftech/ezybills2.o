class BusinessModel {
  final int id;
  final String name;
  final int ownerId;
  final String businessType;
  final String? gstNumber;
  final String? address;
  final String? mobileNumber;
  final String? email;
  final String? logoUrl;
  final String? invoiceFooter;
  final String? bankAccountNumber;
  final String? bankIfsc;
  final String? upiId;
  final String? qrCodeUrl;
  final bool isActive;
  final int? subscriptionPlanId;
  final DateTime? subscriptionExpiresAt;
  final bool kotEnabled;

  const BusinessModel({
    required this.id,
    required this.name,
    required this.ownerId,
    required this.businessType,
    this.gstNumber,
    this.address,
    this.mobileNumber,
    this.email,
    this.logoUrl,
    this.invoiceFooter,
    this.bankAccountNumber,
    this.bankIfsc,
    this.upiId,
    this.qrCodeUrl,
    required this.isActive,
    this.subscriptionPlanId,
    this.subscriptionExpiresAt,
    this.kotEnabled = false,
  });

  factory BusinessModel.fromJson(Map<String, dynamic> json) => BusinessModel(
        id: json['id'] as int,
        name: json['name'] as String,
        ownerId: json['owner_id'] as int,
        businessType: json['business_type'] as String,
        gstNumber: json['gst_number'] as String?,
        address: json['address'] as String?,
        mobileNumber: json['mobile_number'] as String?,
        email: json['email'] as String?,
        logoUrl: json['logo_url'] as String?,
        invoiceFooter: json['invoice_footer'] as String?,
        bankAccountNumber: json['bank_account_number'] as String?,
        bankIfsc: json['bank_ifsc'] as String?,
        upiId: json['upi_id'] as String?,
        qrCodeUrl: json['qr_code_url'] as String?,
        isActive: (json['is_active'] as bool?) ?? true,
        subscriptionPlanId: json['subscription_plan_id'] as int?,
        subscriptionExpiresAt: json['subscription_expires_at'] != null
            ? DateTime.tryParse(json['subscription_expires_at'] as String)
            : null,
        kotEnabled: (json['settings']?['enable_restaurant_features'] as bool?) ??
            _defaultKotEnabled(json['business_type'] as String? ?? ''),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'owner_id': ownerId,
        'business_type': businessType,
        'gst_number': gstNumber,
        'address': address,
        'mobile_number': mobileNumber,
        'email': email,
        'logo_url': logoUrl,
        'invoice_footer': invoiceFooter,
        'bank_account_number': bankAccountNumber,
        'bank_ifsc': bankIfsc,
        'upi_id': upiId,
        'qr_code_url': qrCodeUrl,
        'is_active': isActive,
        'subscription_plan_id': subscriptionPlanId,
        'subscription_expires_at': subscriptionExpiresAt?.toIso8601String(),
      };

  static bool _defaultKotEnabled(String businessType) => const [
        'restaurant',
        'cafe',
        'food_cart',
        'bakery',
      ].contains(businessType);

  bool get isRestaurant => const [
        'restaurant',
        'cafe',
        'food_cart',
        'bakery',
      ].contains(businessType);

  bool get hasUpi => upiId != null && upiId!.isNotEmpty;
}
