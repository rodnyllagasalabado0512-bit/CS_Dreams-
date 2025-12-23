from django.urls import path
from . import views

urlpatterns = [
    path("", views.login_page, name="login"),
    path("register/", views.register_page, name="register"),
    path("logout/", views.logout_view, name="logout"),
    path("home/", views.home_view, name="home"),

    # Profile update (normal + ajax)
    path("update-profile/", views.update_profile_view, name="update_profile"),
    path("update-profile/ajax/", views.update_profile_api, name="update_profile_ajax"),

    # Album endpoints (AJAX)
    path("album/create/ajax/", views.create_album_ajax, name="create_album_ajax"),
    path("album/delete/ajax/", views.delete_album_ajax, name="delete_album_ajax"),
    path("album/upload/ajax/", views.upload_photo_ajax, name="upload_photo_ajax"),
    path("album/delete-photo/ajax/", views.delete_photo_ajax, name="delete_photo_ajax"),
    path("album/list/ajax/", views.album_list_ajax, name="album_list_ajax"),
    path("album/get/ajax/", views.album_get_ajax, name="album_get_ajax"),

    # Backwards-compatible non-AJAX endpoints (keep if other code uses them)
    path("album/create/", views.create_album_ajax, name="create_album"),  # maps to ajax handler
    path("album/delete/<int:album_id>/", views.delete_album_ajax, name="delete_album"),
    path("album/upload/", views.upload_photo_ajax, name="upload_photo"),
    path("album/delete-photo/<int:photo_id>/", views.delete_photo_ajax, name="delete_photo"),

    # Post endpoints (AJAX)
    path("post/create/ajax/", views.create_post_ajax, name="create_post_ajax"),
    path("post/edit/ajax/", views.edit_post_ajax, name="edit_post_ajax"),
    path("post/delete/ajax/", views.delete_post_ajax, name="delete_post_ajax"),
    path("post/toggle-like/ajax/", views.post_like_ajax, name="post_like_ajax"),

    # Backwards-compatible non-AJAX post URLs mapping to ajax handlers
    path("post/create/", views.create_post_ajax, name="create_post"),
    path("post/edit/<int:post_id>/", views.edit_post_ajax, name="edit_post"),
    path("post/delete/<int:post_id>/", views.delete_post_ajax, name="delete_post"),
    path("post/toggle-like/<int:post_id>/", views.post_like_ajax, name="toggle_like"),

    # Comments (AJAX)
    path("comment/add/ajax/", views.add_comment_ajax, name="add_comment_ajax"),
    path("comment/delete/ajax/", views.delete_comment_ajax, name="delete_comment_ajax"),

    # Backwards-compatible non-AJAX comment URLs mapped to ajax handlers
    path("comment/add/<int:post_id>/", views.add_comment_ajax, name="add_comment"),
    path("comment/delete/<int:comment_id>/", views.delete_comment_ajax, name="delete_comment"),
]