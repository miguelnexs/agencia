from django.contrib import admin
from django.contrib.admin import AdminSite
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import UserProfile
from .forms import UserRegistrationForm

# Define un administrador en línea para el modelo UserProfile
class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Perfil de Usuario'
    fieldsets = (
        ('Información Personal', {
            'fields': ('phone', 'address', 'birth_date', 'cedula')
        }),
        ('Información Laboral', {
            'fields': ('role', 'position', 'department', 'hire_date')
        }),
    )

# Define un nuevo administrador de usuarios
class UserAdmin(BaseUserAdmin):
    inlines = (UserProfileInline,)
    list_display = ('username', 'email', 'first_name', 'last_name', 'get_role', 'is_staff')
    list_filter = ('is_staff', 'is_superuser')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('username',)

    # Formulario de creación que incluye usuario, contraseñas y rol
    add_form = UserRegistrationForm
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'first_name', 'last_name', 'password1', 'password2', 'role'),
        }),
    )
    
    def get_role(self, obj):
        try:
            return obj.profile.get_role_display()
        except UserProfile.DoesNotExist:
            return "Sin rol asignado"
    get_role.short_description = 'Rol'
    
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Información Personal', {'fields': ('first_name', 'last_name', 'email')}),
        ('Permisos', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Fechas importantes', {'fields': ('last_login', 'date_joined')}),
    )

class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'cedula', 'position', 'department')
    list_filter = ('role', 'department')
    search_fields = ('user__username', 'user__email', 'cedula', 'position', 'department')
    ordering = ('user__username',)


# AdminSite restringido por rol (solo Super Administrador)
class RoleRestrictedAdminSite(AdminSite):
    site_header = 'Administración de Agencia'
    site_title = 'Admin Agencia'
    index_title = 'Panel de Administración'

    def has_permission(self, request):
        user = request.user
        if not user.is_authenticated or not user.is_active:
            return False
        try:
            return user.profile.is_super_admin()
        except UserProfile.DoesNotExist:
            return False


# Instancia del admin restringido
role_admin_site = RoleRestrictedAdminSite(name='role_admin')

# Registrar modelos en el admin restringido
role_admin_site.register(User, UserAdmin)
role_admin_site.register(UserProfile, UserProfileAdmin)
