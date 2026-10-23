import '../../domain/entities/review.dart';

class ReviewDto {
  final String id;
  final String businessId;
  final int rating;
  final String? comment;
  final String authorName;
  final String createdAt;
  final bool? isMine;
  final bool isVerified;
  final String? ownerReply;
  final String? ownerRepliedAt;

  ReviewDto({
    required this.id,
    required this.businessId,
    required this.rating,
    this.comment,
    required this.authorName,
    required this.createdAt,
    this.isMine,
    this.isVerified = false,
    this.ownerReply,
    this.ownerRepliedAt,
  });

  factory ReviewDto.fromJson(Map<String, dynamic> json) {
    String author = 'Anonymous User';
    if (json['user'] != null && json['user'] is Map) {
      author = json['user']['name'] ?? json['user']['displayName'] ?? 'User';
    } else if (json['authorName'] != null) {
      author = json['authorName'] as String;
    }

    return ReviewDto(
      id: json['id']?.toString() ?? '',
      businessId: json['businessId']?.toString() ?? '',
      rating: (json['rating'] as num?)?.toInt() ?? 5,
      comment: json['comment'] ?? json['content'] as String?,
      authorName: author,
      createdAt: json['createdAt'] ?? json['created_at'] ?? DateTime.now().toIso8601String(),
      isMine: json['isMine'] as bool?,
      isVerified: json['isVerified'] == true || json['is_verified'] == true,
      ownerReply: json['ownerReply'] ?? json['owner_reply'] as String?,
      ownerRepliedAt: json['ownerRepliedAt'] ?? json['owner_replied_at'] as String?,
    );
  }

  Review toEntity({bool? forceIsMine}) {
    DateTime parsedDate;
    try {
      parsedDate = DateTime.parse(createdAt);
    } catch (_) {
      parsedDate = DateTime.now();
    }

    DateTime? replyDate;
    if (ownerRepliedAt != null) {
      try {
        replyDate = DateTime.parse(ownerRepliedAt!);
      } catch (_) {}
    }

    return Review(
      id: id,
      businessId: businessId,
      rating: rating,
      comment: comment,
      authorName: authorName,
      createdAt: parsedDate,
      isMine: forceIsMine ?? isMine ?? false,
      isVerified: isVerified,
      ownerReply: ownerReply,
      ownerRepliedAt: replyDate,
    );
  }
}

