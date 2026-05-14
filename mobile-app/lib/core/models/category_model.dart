class CategoryModel {
  final int id;
  final int businessId;
  final String name;
  final int? parentId;
  final bool isActive;

  const CategoryModel({
    required this.id,
    required this.businessId,
    required this.name,
    this.parentId,
    required this.isActive,
  });

  factory CategoryModel.fromJson(Map<String, dynamic> json) => CategoryModel(
        id: json['id'] as int,
        businessId: json['business_id'] as int,
        name: json['name'] as String,
        parentId: json['parent_id'] as int?,
        isActive: (json['is_active'] as bool?) ?? true,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'business_id': businessId,
        'name': name,
        'parent_id': parentId,
        'is_active': isActive,
      };
}

class BrandModel {
  final int id;
  final int businessId;
  final String name;
  final bool isActive;

  const BrandModel({
    required this.id,
    required this.businessId,
    required this.name,
    required this.isActive,
  });

  factory BrandModel.fromJson(Map<String, dynamic> json) => BrandModel(
        id: json['id'] as int,
        businessId: json['business_id'] as int,
        name: json['name'] as String,
        isActive: (json['is_active'] as bool?) ?? true,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'business_id': businessId,
        'name': name,
        'is_active': isActive,
      };
}

class UnitModel {
  final int id;
  final int businessId;
  final String name;
  final String? shortName;
  final bool isActive;

  const UnitModel({
    required this.id,
    required this.businessId,
    required this.name,
    this.shortName,
    required this.isActive,
  });

  factory UnitModel.fromJson(Map<String, dynamic> json) => UnitModel(
        id: json['id'] as int,
        businessId: json['business_id'] as int,
        name: json['name'] as String,
        shortName: json['short_name'] as String?,
        isActive: (json['is_active'] as bool?) ?? true,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'business_id': businessId,
        'name': name,
        'short_name': shortName,
        'is_active': isActive,
      };

  String get displayName => shortName ?? name;
}
