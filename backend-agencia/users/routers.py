from .tenant import get_current_tenant_alias


class TenantRouter:
    """Routes specific models to the current tenant database alias."""

    def db_for_read(self, model, **hints):
        if model._meta.app_label == 'users' and model.__name__ == 'PrivateNote':
            alias = get_current_tenant_alias()
            if alias:
                return alias
        return None

    def db_for_write(self, model, **hints):
        if model._meta.app_label == 'users' and model.__name__ == 'PrivateNote':
            alias = get_current_tenant_alias()
            if alias:
                return alias
        return None

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        # Allow migrations to run on any DB; we handle tenant table creation programmatically
        return None