# ❌ INEFFICIENT: N+1 Query Problem
def get_users_with_posts():
    users = User.query.all()  # 1 query
    for user in users:
        posts = Post.query.filter_by(user_id=user.id).all()  # N queries
        user.posts = posts
    return users
# Total queries: 1 + N (if 100 users = 101 queries)

# ✅ EFFICIENT: Eager Loading
def get_users_with_posts():
    users = User.query.options(
        joinedload(User.posts)
    ).all()  # 1 query with JOIN
    return users
# Total queries: 1 (100x more efficient)