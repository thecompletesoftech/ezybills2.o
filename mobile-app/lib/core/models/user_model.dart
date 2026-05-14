class UserModel {
  final int id;
  final String name;
  final String? email;
  final String? phone;
  final String role;
  final int? businessId;
  final bool isActive;
  final String? token;

  const UserModel({
    required this.id,
    required this.name,
    this.email,
    this.phone,
    required this.role,
    this.businessId,
    required this.isActive,
    this.token,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) => UserModel(
        id: json['id'] as int,
        name: json['name'] as String,
        email: json['email'] as String?,
        phone: json['phone'] as String?,
        role: json['role'] as String,
        businessId: json['business_id'] as int?,
        isActive: (json['is_active'] as bool?) ?? true,
        token: json['token'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'email': email,
        'phone': phone,
        'role': role,
        'business_id': businessId,
        'is_active': isActive,
        'token': token,
      };

  UserModel copyWith({
    int? id,
    String? name,
    String? email,
    String? phone,
    String? role,
    int? businessId,
    bool? isActive,
    String? token,
  }) =>
      UserModel(
        id: id ?? this.id,
        name: name ?? this.name,
        email: email ?? this.email,
        phone: phone ?? this.phone,
        role: role ?? this.role,
        businessId: businessId ?? this.businessId,
        isActive: isActive ?? this.isActive,
        token: token ?? this.token,
      );

  bool get isSuperAdmin => role == 'super_admin';
  bool get isOwner => role == 'owner';
  bool get isManager => role == 'manager';
  bool get isCashier => role == 'cashier';
}
