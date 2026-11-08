from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from .models import UserProfile
from .forms import LoginForm, UserRegistrationForm, UserProfileForm, UserUpdateForm
from .decorators import super_admin_required, admin_required, role_required

def home(request):
    """Vista para la página principal"""
    return render(request, 'users/home.html')

def login_view(request):
    """Vista para el inicio de sesión"""
    if request.method == 'POST':
        form = LoginForm(request.POST)
        if form.is_valid():
            username = form.cleaned_data['username']
            password = form.cleaned_data['password']
            user = authenticate(username=username, password=password)
            if user is not None:
                login(request, user)
                messages.success(request, f'Bienvenido {username}!')
                return redirect('home')
            else:
                messages.error(request, 'Usuario o contraseña incorrectos.')
    else:
        form = LoginForm()
    return render(request, 'users/login.html', {'form': form})

def register(request):
    """Vista para el registro de usuarios"""
    if request.method == 'POST':
        # Pasamos el rol del usuario que está creando (si está autenticado)
        user_role = None
        if request.user.is_authenticated:
            user_role = request.user.profile.role
            
        user_form = UserRegistrationForm(request.POST, user_role=user_role)
        profile_form = UserProfileForm(request.POST)
        
        if user_form.is_valid() and profile_form.is_valid():
            # Crear usuario pero no guardar aún
            user = user_form.save(commit=False)
            # La contraseña ya se establece en el formulario UserCreationForm
            user.save()
            
            # Crear perfil de usuario
            profile = profile_form.save(commit=False)
            profile.user = user
            profile.role = user_form.cleaned_data['role']
            profile.save()
            
            messages.success(request, f'Registro exitoso para el usuario {user.username}. Ahora puede iniciar sesión con las credenciales proporcionadas.')
            return redirect('login')
    else:
        # Pasamos el rol del usuario que está creando (si está autenticado)
        user_role = None
        if request.user.is_authenticated:
            user_role = request.user.profile.role
            
        user_form = UserRegistrationForm(user_role=user_role)
        profile_form = UserProfileForm()
    
    return render(request, 'users/register.html', {
        'user_form': user_form,
        'profile_form': profile_form
    })

def logout_view(request):
    logout(request)
    messages.success(request, 'Has cerrado sesión correctamente.')
    return redirect('login')

@login_required
def profile(request):
    """Vista para el perfil de usuario"""
    if request.method == 'POST':
        user_form = UserUpdateForm(request.POST, instance=request.user)
        profile_form = UserProfileForm(request.POST, instance=request.user.profile)
        
        if user_form.is_valid() and profile_form.is_valid():
            user_form.save()
            profile_form.save()
            messages.success(request, 'Su perfil ha sido actualizado.')
            return redirect('profile')
    else:
        user_form = UserUpdateForm(instance=request.user)
        profile_form = UserProfileForm(instance=request.user.profile)
    
    return render(request, 'users/profile.html', {
        'user_form': user_form,
        'profile_form': profile_form
    })

@admin_required
def user_list(request):
    """Vista para listar usuarios (solo para administradores)"""
    if request.user.profile.is_super_admin():
        # Super admin ve todos los usuarios
        users = User.objects.all().select_related('profile')
    else:
        # Admin normal solo ve empleados
        users = User.objects.filter(profile__role='employee').select_related('profile')
    
    return render(request, 'users/user_list.html', {'users': users})

@admin_required
def user_create(request):
    """Vista para crear usuarios (solo para administradores)"""
    if request.method == 'POST':
        user_form = UserRegistrationForm(request.POST, creating_user=request.user)
        profile_form = UserProfileForm(request.POST)
        
        if user_form.is_valid() and profile_form.is_valid():
            user = user_form.save(commit=False)
            user.set_password(user_form.cleaned_data['password'])
            user.save()
            
            profile = profile_form.save(commit=False)
            profile.user = user
            profile.role = user_form.cleaned_data['role']
            profile.save()
            
            messages.success(request, f'Usuario {user.username} creado exitosamente.')
            return redirect('user_list')
    else:
        user_form = UserRegistrationForm(creating_user=request.user)
        profile_form = UserProfileForm()
    
    return render(request, 'users/user_form.html', {
        'user_form': user_form,
        'profile_form': profile_form,
        'title': 'Crear Usuario'
    })

@admin_required
def user_edit(request, user_id):
    """Vista para editar usuarios (solo para administradores)"""
    user_to_edit = get_object_or_404(User, id=user_id)
    
    # Verificar permisos
    if user_to_edit.profile.is_admin() and not request.user.profile.is_super_admin():
        messages.error(request, 'No tiene permisos para editar administradores.')
        return redirect('user_list')
    
    if user_to_edit.profile.is_super_admin() and not user_to_edit == request.user:
        messages.error(request, 'No puede editar al Super Administrador.')
        return redirect('user_list')
    
    if request.method == 'POST':
        user_form = UserUpdateForm(request.POST, instance=user_to_edit)
        profile_form = UserProfileForm(request.POST, instance=user_to_edit.profile)
        
        if user_form.is_valid() and profile_form.is_valid():
            user_form.save()
            profile_form.save()
            messages.success(request, f'Usuario {user_to_edit.username} actualizado exitosamente.')
            return redirect('user_list')
    else:
        user_form = UserUpdateForm(instance=user_to_edit)
        profile_form = UserProfileForm(instance=user_to_edit.profile)
    
    return render(request, 'users/user_form.html', {
        'user_form': user_form,
        'profile_form': profile_form,
        'title': f'Editar Usuario: {user_to_edit.username}'
    })

@admin_required
def user_delete(request, user_id):
    """Vista para eliminar usuarios (solo para administradores)"""
    user_to_delete = get_object_or_404(User, id=user_id)
    
    # Verificar permisos
    if user_to_delete.profile.is_admin() and not request.user.profile.is_super_admin():
        messages.error(request, 'No tiene permisos para eliminar administradores.')
        return redirect('user_list')
    
    if user_to_delete.profile.is_super_admin():
        messages.error(request, 'No puede eliminar al Super Administrador.')
        return redirect('user_list')
    
    if request.method == 'POST':
        username = user_to_delete.username
        user_to_delete.delete()
        messages.success(request, f'Usuario {username} eliminado exitosamente.')
        return redirect('user_list')
    
    return render(request, 'users/user_confirm_delete.html', {
        'user': user_to_delete
    })

@super_admin_required
def statistics(request):
    """Vista para estadísticas (solo para super administrador)"""
    total_users = User.objects.count()
    admins = User.objects.filter(profile__role='admin').count()
    employees = User.objects.filter(profile__role='employee').count()
    
    context = {
        'total_users': total_users,
        'admins': admins,
        'employees': employees,
    }
    
    return render(request, 'users/statistics.html', context)

@admin_required
def admin_dashboard(request):
    """Dashboard para administradores"""
    employees = User.objects.filter(profile__role='employee').select_related('profile')
    
    context = {
        'employees': employees,
        'employee_count': employees.count(),
    }
    
    return render(request, 'users/admin_dashboard.html', context)
