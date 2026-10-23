class Review {
  final String id;
  final String businessId;
  final int rating;
  final String? comment;
  final String authorName;
  final DateTime createdAt;
  final bool isMine;
  final bool isVerified;
  final String? ownerReply;
  final DateTime? ownerRepliedAt;

  Review({
    required this.id,
    required this.businessId,
    required this.rating,
    this.comment,
    required this.authorName,
    required this.createdAt,
    this.isMine = false,
    this.isVerified = false,
    this.ownerReply,
    this.ownerRepliedAt,
  });
}

