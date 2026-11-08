from threading import local
from pathlib import Path
from django.conf import settings
from django.db import connections
from django.utils.deprecation import MiddlewareMixin
from .models import Tenant, UserProfile, PrivateNote

_tl = local()

def get_current_tenant_alias():
    return getattr(_tl, 'tenant_alias', None)

def ensure_tenant_for_user(user):
    """Ensure tenant DB exists for the admin linked to the user and set thread-local alias."""
    try:
        profile = user.profile
    except UserProfile.DoesNotExist:
        _tl.tenant_alias = None
        return None

    if profile.role == 'super_admin':
        _tl.tenant_alias = None
        return None

    if profile.role == 'admin':
        admin = user
    else:
        # employee: must have a tenant assigned
        if profile.tenant and profile.tenant.admin:
            admin = profile.tenant.admin
        else:
            _tl.tenant_alias = None
            return None

    alias = f"tenant_{admin.id}"
    tenants_dir = Path(settings.BASE_DIR) / 'tenants'
    tenants_dir.mkdir(exist_ok=True)
    db_path = str(tenants_dir / f"{alias}.sqlite3")

    tenant, created = Tenant.objects.get_or_create(
        admin=admin,
        defaults={'db_alias': alias, 'db_path': db_path}
    )
    if tenant.db_alias != alias or tenant.db_path != db_path:
        tenant.db_alias = alias
        tenant.db_path = db_path
        tenant.save()

    # Asegurar que el perfil del admin está vinculado al tenant
    try:
        admin_profile = admin.profile
        if admin_profile.tenant_id != tenant.id:
            admin_profile.tenant = tenant
            admin_profile.save()
    except UserProfile.DoesNotExist:
        pass

    # Register alias dynamically if missing
    if alias not in settings.DATABASES:
        settings.DATABASES[alias] = {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': db_path,
            # Añadir claves esperadas por Django para evitar KeyError
            'ATOMIC_REQUESTS': False,
            'AUTOCOMMIT': True,
            'CONN_MAX_AGE': 0,
            'OPTIONS': {},
            'TIME_ZONE': settings.TIME_ZONE,
        }
        # connections.databases = settings.DATABASES  # Removed to fix AttributeError

    # Initialize tables for tenant-routed models (example: PrivateNote)
    try:
        conn = connections[alias]
        with conn.schema_editor() as editor:
            try:
                editor.create_model(PrivateNote)
            except Exception:
                # Table likely exists
                pass
    except Exception:
        pass

    _tl.tenant_alias = alias
    return alias


class TenantMiddleware(MiddlewareMixin):
    def process_request(self, request):
        user = getattr(request, 'user', None)
        if user and user.is_authenticated:
            ensure_tenant_for_user(user)
        else:
            _tl.tenant_alias = None
        return None