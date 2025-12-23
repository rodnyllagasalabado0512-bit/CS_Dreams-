from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.contrib.auth.models import User
from django.views.decorators.http import require_POST
from django.http import JsonResponse
from .forms import LoginForm, RegisterForm, ProfileForm
from .models import Profile, Album, Photo, Post, Comment
from django.core.serializers import serialize
from django.utils import timezone

def login_page(request):
    if request.user.is_authenticated:
        return redirect("home")

    if request.method == "POST":
        form = LoginForm(request.POST)
        if form.is_valid():
            username = form.cleaned_data["username"]
            password = form.cleaned_data["password"]
            user = authenticate(request, username=username, password=password)
            if user:
                login(request, user)
                Profile.objects.get_or_create(user=user)
                return redirect("home")
            messages.error(request, "Invalid username or password.")
    else:
        form = LoginForm()
    return render(request, "core/login.html", {"form": form})

def register_page(request):
    if request.user.is_authenticated:
        return redirect("home")

    if request.method == "POST":
        form = RegisterForm(request.POST)
        if form.is_valid():
            username = form.cleaned_data["username"]
            password = form.cleaned_data["password"]
            if User.objects.filter(username=username).exists():
                messages.error(request, "Username already exists.")
            else:
                user = User.objects.create_user(username=username, password=password)
                Profile.objects.create(user=user)
                messages.success(request, "Account created! Please log in.")
                return redirect("login")
    else:
        form = RegisterForm()
    return render(request, "core/register.html", {"form": form})

def logout_view(request):
    logout(request)
    return redirect("login")

@login_required
def home_view(request):
    user = request.user
    profile, _ = Profile.objects.get_or_create(user=user)

    albums = Album.objects.filter(user=user).order_by("-created_at")
    photos = Photo.objects.filter(user=user).order_by("-created_at")
    posts = Post.objects.all().order_by("-created_at").select_related("user")

    context = {
        "profile": profile,
        "albums": albums,
        "photos": photos,
        "posts": posts,
    }
    return render(request, "core/home.html", context)

@require_POST
@login_required
def update_profile_view(request):
    profile, _ = Profile.objects.get_or_create(user=request.user)
    form = ProfileForm(request.POST, request.FILES, instance=profile)
    if form.is_valid():
        form.save()
        messages.success(request, "Profile updated.")
    else:
        messages.error(request, "Failed to update profile.")
    return redirect("home")

@require_POST
@login_required
def update_profile_api(request):
    profile, _ = Profile.objects.get_or_create(user=request.user)
    profile.full_name = request.POST.get("full_name", profile.full_name)
    age = request.POST.get("age", "")
    profile.age = int(age) if age.isdigit() else (profile.age if profile.age is not None else None)
    profile.birthday = request.POST.get("birthday", profile.birthday)
    profile.gender = request.POST.get("gender", profile.gender)
    profile.location = request.POST.get("location", profile.location)
    profile.favorites = request.POST.get("favorites", profile.favorites)
    profile.life_status = request.POST.get("life_status", profile.life_status)
    profile.bio = request.POST.get("bio", profile.bio)

    if "image" in request.FILES:
        profile.image = request.FILES["image"]

    profile.save()
    image_url = profile.image.url if profile.image else ""
    return JsonResponse({
        "ok": True,
        "profile": {
            "full_name": profile.full_name,
            "age": profile.age,
            "birthday": str(profile.birthday) if profile.birthday else "",
            "gender": profile.gender,
            "location": profile.location,
            "favorites": profile.favorites,
            "life_status": profile.life_status,
            "bio": profile.bio,
            "image_url": image_url,
            "username": profile.user.username,
        }
    })

# ------------------------
# Album AJAX endpoints
# ------------------------
@login_required
def album_list_ajax(request):
    albums = Album.objects.filter(user=request.user).order_by("-created_at")
    data = [{"id": a.id, "name": a.name, "created_at": a.created_at.isoformat()} for a in albums]
    return JsonResponse({"ok": True, "albums": data})

@login_required
def album_get_ajax(request):
    photos = Photo.objects.filter(user=request.user).order_by("-created_at")
    data = [{"id": p.id, "album": p.album.id if p.album else None, "image_url": p.image.url, "created_at": p.created_at.isoformat()} for p in photos]
    return JsonResponse({"ok": True, "photos": data})

@require_POST
@login_required
def create_album_ajax(request):
    name = request.POST.get("name", "").strip()
    if not name:
        return JsonResponse({"ok": False, "error": "Name required"}, status=400)
    album = Album.objects.create(user=request.user, name=name)
    return JsonResponse({"ok": True, "album": {"id": album.id, "name": album.name}})

@require_POST
@login_required
def delete_album_ajax(request):
    album_id = request.POST.get("album_id")
    try:
        a = Album.objects.get(id=album_id, user=request.user)
    except Album.DoesNotExist:
        return JsonResponse({"ok": False, "error": "Not found"}, status=404)
    a.delete()
    return JsonResponse({"ok": True})

@require_POST
@login_required
def upload_photo_ajax(request):
    album_id = request.POST.get("album_id")
    image = request.FILES.get("image")
    if not image:
        return JsonResponse({"ok": False, "error": "No image provided"}, status=400)
    album = None
    if album_id:
        try:
            album = Album.objects.get(id=album_id, user=request.user)
        except Album.DoesNotExist:
            album = None
    photo = Photo.objects.create(user=request.user, album=album, image=image)
    return JsonResponse({"ok": True, "photo": {"id": photo.id, "image_url": photo.image.url, "album": photo.album.id if photo.album else None}})

@require_POST
@login_required
def delete_photo_ajax(request):
    photo_id = request.POST.get("photo_id")
    try:
        photo = Photo.objects.get(id=photo_id, user=request.user)
    except Photo.DoesNotExist:
        return JsonResponse({"ok": False, "error": "Not found"}, status=404)
    photo.delete()
    return JsonResponse({"ok": True})

# ------------------------
# Post AJAX endpoints
# ------------------------
@require_POST
@login_required
def create_post_ajax(request):
    content = request.POST.get("content", "").strip()
    image = request.FILES.get("image")
    if not content and not image:
        return JsonResponse({"ok": False, "error": "Empty post"}, status=400)
    post = Post.objects.create(user=request.user, content=content, image=image)
    post_data = {
        "id": post.id,
        "content": post.content,
        "image_url": post.image.url if post.image else "",
        "username": post.user.username,
        "created_at": post.created_at.isoformat(),
        "likes_count": post.likes.count(),
    }
    return JsonResponse({"ok": True, "post": post_data})

@require_POST
@login_required
def edit_post_ajax(request):
    post_id = request.POST.get("post_id")
    try:
        post = Post.objects.get(id=post_id)
    except Post.DoesNotExist:
        return JsonResponse({"ok": False, "error": "Post not found"}, status=404)
    if post.user != request.user:
        return JsonResponse({"ok": False, "error": "Not allowed"}, status=403)
    content = request.POST.get("content", "").strip()
    image = request.FILES.get("image")
    post.content = content
    if image:
        post.image = image
    post.save()
    post_data = {
        "id": post.id,
        "content": post.content,
        "image_url": post.image.url if post.image else "",
        "created_at": post.created_at.isoformat(),
        "likes_count": post.likes.count(),
    }
    return JsonResponse({"ok": True, "post": post_data})

@require_POST
@login_required
def delete_post_ajax(request):
    post_id = request.POST.get("post_id")
    try:
        post = Post.objects.get(id=post_id)
    except Post.DoesNotExist:
        return JsonResponse({"ok": False, "error": "Not found"}, status=404)
    if post.user != request.user:
        return JsonResponse({"ok": False, "error": "Not allowed"}, status=403)
    post.delete()
    return JsonResponse({"ok": True})

@require_POST
@login_required
def post_like_ajax(request):
    post_id = request.POST.get("post_id")
    try:
        post = Post.objects.get(id=post_id)
    except Post.DoesNotExist:
        return JsonResponse({"ok": False, "error": "Not found"}, status=404)
    if request.user in post.likes.all():
        post.likes.remove(request.user)
        liked = False
    else:
        post.likes.add(request.user)
        liked = True
    return JsonResponse({"ok": True, "liked": liked, "likes_count": post.likes.count()})

# ------------------------
# Comments AJAX
# ------------------------
@require_POST
@login_required
def add_comment_ajax(request):
    post_id = request.POST.get("post_id")
    text = request.POST.get("text", "").strip()
    if not text:
        return JsonResponse({"ok": False, "error": "Empty"}, status=400)
    try:
        post = Post.objects.get(id=post_id)
    except Post.DoesNotExist:
        return JsonResponse({"ok": False, "error": "Not found"}, status=404)
    comment = Comment.objects.create(post=post, user=request.user, text=text)
    data = {
        "id": comment.id,
        "text": comment.text,
        "user_full_name": comment.user.get_full_name() or comment.user.username,
        "user_username": comment.user.username,
        "created_at": comment.created_at.isoformat(),
    }
    return JsonResponse({"ok": True, "comment": data})

@require_POST
@login_required
def delete_comment_ajax(request):
    comment_id = request.POST.get("comment_id")
    try:
        comment = Comment.objects.get(id=comment_id)
    except Comment.DoesNotExist:
        return JsonResponse({"ok": False, "error": "Not found"}, status=404)
    if comment.user != request.user and comment.post.user != request.user:
        return JsonResponse({"ok": False, "error": "Not allowed"}, status=403)
    comment.delete()
    return JsonResponse({"ok": True})