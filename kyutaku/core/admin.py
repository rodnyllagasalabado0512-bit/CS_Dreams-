from django.contrib import admin
from .models import Profile, Album, Photo, Post, Comment

admin.site.register(Profile)
admin.site.register(Album)
admin.site.register(Photo)
admin.site.register(Post)
admin.site.register(Comment)