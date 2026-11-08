from django.urls import path
from . import views
from . import api as api_views
from . import whatsapp_views
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth.decorators import login_required
from .decorators import super_admin_required, admin_required

urlpatterns = [
    # API WhatsApp Cloud & Webhook
    path('api/whatsapp/webhook/', whatsapp_views.WhatsAppWebhookView.as_view(), name='whatsapp_webhook'),
    path('api/whatsapp/conversations/', whatsapp_views.WhatsAppConversationsView.as_view(), name='whatsapp_conversations'),
    path('api/whatsapp/messages/<str:phone>/', whatsapp_views.WhatsAppMessagesDetailView.as_view(), name='whatsapp_messages_detail'),
    path('api/whatsapp/messages/<str:phone>/send-voucher/', whatsapp_views.WhatsAppSendVoucherManualView.as_view(), name='whatsapp_send_voucher_manual'),
    path('api/whatsapp/voucher/<str:code>/', whatsapp_views.WhatsAppBookingVoucherPDFView.as_view(), name='whatsapp_voucher_pdf'),
    path('api/whatsapp/config/', whatsapp_views.WhatsAppConfigView.as_view(), name='whatsapp_config'),
    path('api/whatsapp/simulate/', whatsapp_views.WhatsAppSimulateWebhookView.as_view(), name='whatsapp_simulate'),
    # API segura (auth)
    path('api/auth/register/', api_views.RegisterView.as_view(), name='api_register'),
    path('api/auth/login/', api_views.LoginView.as_view(), name='api_login'),
    path('api/auth/me/', api_views.MeView.as_view(), name='api_me'),
    path('api/auth/change-password/', api_views.ChangePasswordView.as_view(), name='api_change_password'),
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # API de gestión de usuarios con RBAC
    path('api/users/', api_views.UsersView.as_view(), name='api_users'),
    path('api/users/<int:user_id>/', api_views.UserDetailView.as_view(), name='api_user_detail'),

    # API de reservas
    path('api/bookings/', api_views.BookingListCreateView.as_view(), name='api_bookings'),
    path('api/bookings/<int:booking_id>/', api_views.BookingDetailView.as_view(), name='api_booking_detail'),
    path('api/bookings/<int:booking_id>/send-receipt/', api_views.BookingReceiptEmailView.as_view(), name='api_booking_send_receipt'),
    path('api/bookings/by-code/', api_views.BookingByCodePublicView.as_view(), name='api_booking_by_code'),
    path('api/stats/', api_views.StatsView.as_view(), name='api_stats'),

    # Rutas públicas
    path('', views.home, name='home'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('register/', views.register, name='register'),
    
    # Rutas protegidas por login
    path('profile/', login_required(views.profile), name='profile'),
    
    # Rutas para administradores y super administradores
    path('users/', login_required(admin_required(views.user_list)), name='user_list'),
    path('users/create/', login_required(admin_required(views.user_create)), name='user_create'),
    path('users/<int:user_id>/edit/', login_required(admin_required(views.user_edit)), name='user_edit'),
    path('users/<int:user_id>/delete/', login_required(admin_required(views.user_delete)), name='user_delete'),
    path('admin-dashboard/', login_required(admin_required(views.admin_dashboard)), name='admin_dashboard'),
    
    # Rutas exclusivas para super administradores
    path('statistics/', login_required(super_admin_required(views.statistics)), name='statistics'),
]
