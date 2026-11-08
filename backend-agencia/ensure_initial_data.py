import os
import sqlite3
from pathlib import Path
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'globetrek_backend.settings')
django.setup()

from django.contrib.auth.models import User
from users.models import UserProfile, Tenant, Booking


def ensure_data():
    base_dir = Path(__file__).resolve().parent

    # 1. Ensure Super Admin account: miguel / migel1457
    miguel, created = User.objects.get_or_create(
        username='miguel',
        defaults={
            'first_name': 'Miguel',
            'last_name': 'Admin',
            'email': 'miguel@agencia.com',
            'is_staff': True,
            'is_superuser': True,
        },
    )
    if created:
        miguel.set_password('migel1457')
        miguel.save()

    miguel_tenant, _ = Tenant.objects.get_or_create(
        admin=miguel,
        defaults={
            'db_alias': f'tenant_{miguel.id}',
            'db_path': str(base_dir / 'tenants' / f'tenant_{miguel.id}.sqlite3'),
        },
    )

    miguel_profile, _ = UserProfile.objects.get_or_create(user=miguel)
    miguel_profile.role = 'super_admin'
    miguel_profile.tenant = miguel_tenant
    miguel_profile.can_create_bookings = True
    miguel_profile.can_edit_bookings = True
    miguel_profile.can_delete_bookings = True
    miguel_profile.can_manage_users = True
    miguel_profile.save()

    # 2. Ensure Integrante account: integrante / integrante123
    integrante, int_created = User.objects.get_or_create(
        username='integrante',
        defaults={
            'first_name': 'Laura',
            'last_name': 'Gómez',
            'email': 'laura.gomez@aeroagencia.com',
            'is_staff': False,
            'is_superuser': False,
        },
    )
    if int_created:
        integrante.set_password('integrante123')
        integrante.save()

    int_profile, _ = UserProfile.objects.get_or_create(user=integrante)
    if int_created:
        int_profile.role = 'employee'
        int_profile.position = 'Agente de Cabina'
        int_profile.department = 'Operaciones de Vuelo'
        int_profile.can_create_bookings = False
        int_profile.can_edit_bookings = False
        int_profile.can_delete_bookings = False
        int_profile.can_manage_users = False
        int_profile.save()

    # 3. Sync any bookings from db.sqlite3 if active database is PostgreSQL
    sqlite_path = base_dir / 'db.sqlite3'
    if sqlite_path.exists():
        try:
            conn = sqlite3.connect(str(sqlite_path))
            conn.row_factory = sqlite3.Row
            rows = conn.execute('SELECT * FROM users_booking').fetchall()
            for r in rows:
                row = dict(r)
                if not Booking.objects.filter(code=row['code']).exists():
                    Booking.objects.create(
                        code=row['code'],
                        first_name=row['first_name'],
                        first_image=row.get('first_image') or '',
                        email=row['email'],
                        address=row['address'],
                        check_in_date=row['check_in_date'],
                        check_out_date=row['check_out_date'],
                        hotel_name=row['hotel_name'],
                        second_image=row.get('second_image') or '',
                        room_type=row['room_type'],
                        location=row['location'],
                        phone=row['phone'],
                        currency_code=row.get('currency_code') or 'EUR',
                        room_value=row['room_value'],
                        rooms_count=row['rooms_count'],
                        guests_count=row['guests_count'],
                        children_count=row.get('children_count') or 0,
                        pets_count=row.get('pets_count') or 0,
                        notes=row.get('notes') or '',
                        created_by=miguel,
                        tenant=miguel_tenant,
                    )
            conn.close()
        except Exception as exc:
            print(f'Notice: SQLite booking sync skipped ({exc})')

    print('Initial users, roles, and bookings verified.')


if __name__ == '__main__':
    ensure_data()

