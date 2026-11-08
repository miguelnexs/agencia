from django.shortcuts import redirect
from django.contrib import messages
from functools import wraps

def role_required(allowed_roles):
    """
    Decorador para restringir el acceso a vistas según el rol del usuario.
    allowed_roles: lista de roles permitidos ('super_admin', 'admin', 'employee')
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                messages.error(request, 'Debe iniciar sesión para acceder a esta página.')
                return redirect('login')
            
            try:
                user_role = request.user.profile.role
                if user_role in allowed_roles:
                    return view_func(request, *args, **kwargs)
                else:
                    messages.error(request, 'No tiene permisos para acceder a esta página.')
                    return redirect('home')
            except:
                messages.error(request, 'Error al verificar permisos.')
                return redirect('home')
        return wrapper
    return decorator

def super_admin_required(view_func):
    """Decorador para restringir acceso solo a super administradores"""
    return role_required(['super_admin'])(view_func)

def admin_required(view_func):
    """Decorador para restringir acceso a administradores y super administradores"""
    return role_required(['super_admin', 'admin'])(view_func)