import json
import logging
import re
import urllib.request
import urllib.error
from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views import View
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated

from .models import WhatsAppConfig, WhatsAppMessage, Booking

logger = logging.getLogger(__name__)


def get_whatsapp_config():
    config, _ = WhatsAppConfig.objects.get_or_create(id=1)
    return config


def send_meta_whatsapp_message(phone_number_id, access_token, to_phone, message_text):
    """Envía un mensaje de texto a través de WhatsApp Cloud API (Meta)."""
    if not phone_number_id or not access_token:
        logger.warning("WhatsApp API no configurada (falta phone_number_id o access_token).")
        return False, "WhatsApp API no configurada (falta Phone ID o Token)."

    # Normalizar número (quitar signos +, espacios o guiones)
    clean_to = re.sub(r'\D', '', to_phone)
    url = f"https://graph.facebook.com/v21.0/{phone_number_id}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": clean_to,
        "type": "text",
        "text": {
            "preview_url": False,
            "body": message_text
        }
    }
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    try:
        req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return True, data
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode('utf-8')
        logger.error(f"Error enviando mensaje WhatsApp a {clean_to}: {err_msg}")
        try:
            parsed = json.loads(err_msg)
            error_detail = parsed.get('error', {}).get('message', err_msg)
        except Exception:
            error_detail = err_msg
        return False, error_detail
    except Exception as e:
        logger.error(f"Excepción enviando mensaje WhatsApp: {e}")
        return False, str(e)


def generate_auto_reply(incoming_text, sender_name, config):
    """Motor de auto-respuesta inteligente para reservas y soporte."""
    clean_text = incoming_text.strip().upper()

    # 1. Comandos de menú o bienvenida
    if clean_text in ['HOLA', 'HOLA!', 'BUENOS DIAS', 'BUENAS TARDES', 'BUENAS NOCHES', 'HELLO', 'HI', 'INICIO', 'START']:
        saludo = f"¡Hola {sender_name}! " if sender_name else "¡Hola! "
        return f"{saludo}{config.welcome_message}\n\n{config.menu_message}"

    if clean_text in ['MENU', 'MENÚ', 'AYUDA', 'OPCIONES', 'HELP', '3']:
        return config.menu_message

    if clean_text in ['ASESOR', 'AGENTE', 'HUMANO', '2']:
        return "👨‍✈️ *Atención al Cliente AeroAgencia*\nUn asesor de nuestro equipo de operaciones se comunicará contigo por este mismo chat en breve. Por favor descríbenos tu consulta."

    # 2. Buscar si escribió un código de reserva (patrón 5 letras + 1-2 números o buscar en la BD)
    # Detectar cualquier token en el texto que se parezca a un código de reserva
    potential_codes = re.findall(r'[A-Z0-9]{4,8}', clean_text)
    for code_candidate in potential_codes:
        booking = Booking.objects.filter(code__iexact=code_candidate).first()
        if booking:
            nights = (booking.check_out_date - booking.check_in_date).days if (booking.check_out_date and booking.check_in_date) else 1
            total = float(booking.room_value or 0) * max(nights, 1) * max(booking.rooms_count or 1, 1)
            return (
                f"✈️ *Detalles de tu Reserva en AeroAgencia*\n"
                f"━━━━━━━━━━━━━━━━━━━\n"
                f"🎫 *Código:* {booking.code}\n"
                f"👤 *Pasajero:* {booking.first_name}\n"
                f"🏨 *Alojamiento:* {booking.hotel_name}\n"
                f"📍 *Destino:* {booking.location or 'No especificado'}\n"
                f"🛏 *Tipo de Habitación:* {booking.room_type}\n"
                f"📅 *Check-in:* {booking.check_in_date}\n"
                f"📅 *Check-out:* {booking.check_out_date} ({nights} noches)\n"
                f"👥 *Huéspedes:* {booking.guests_count} | Habitaciones: {booking.rooms_count}\n"
                f"💰 *Total:* {booking.currency_code} {total:,.2f}\n"
                f"━━━━━━━━━━━━━━━━━━━\n"
                f"Si necesitas asistencia personalizada, escribe *ASESOR*."
            )

    # 3. Respuesta por defecto
    return (
        f"Hemos recibido tu mensaje: \"{incoming_text}\".\n\n"
        f"• Para consultar una reserva, escribe el *CÓDIGO* de reserva (ej: GRXEB3).\n"
        f"• Escribe *MENU* para ver las opciones disponibles o *ASESOR* para hablar con una persona."
    )


@method_decorator(csrf_exempt, name='dispatch')
class WhatsAppWebhookView(View):
    """
    Webhook para WhatsApp Cloud API (Meta).
    GET: Verificación del webhook requerida por Meta App Dashboard.
    POST: Recepción de mensajes en tiempo real y auto-respuesta.
    """
    def get(self, request):
        config = get_whatsapp_config()
        mode = request.GET.get('hub.mode')
        token = request.GET.get('hub.verify_token')
        challenge = request.GET.get('hub.challenge')

        if mode == 'subscribe' and token == config.webhook_verify_token:
            logger.info("WhatsApp Webhook verificado exitosamente por Meta.")
            return HttpResponse(challenge, content_type='text/plain', status=200)
        logger.warning(f"Fallo en verificación de WhatsApp Webhook. Token recibido: {token}")
        return HttpResponse('Verificación fallida', status=403)

    def post(self, request):
        try:
            body_unicode = request.body.decode('utf-8')
            data = json.loads(body_unicode)
        except Exception as e:
            return HttpResponse('Bad Request', status=400)

        # Verificar si es una notificación de WhatsApp
        entry = data.get('entry', [])
        if not entry:
            return HttpResponse('EVENT_RECEIVED', status=200)

        config = get_whatsapp_config()

        for change_item in entry:
            for change in change_item.get('changes', []):
                value = change.get('value', {})
                contacts = {c.get('wa_id'): c.get('profile', {}).get('name', '') for c in value.get('contacts', [])}
                messages = value.get('messages', [])

                for msg in messages:
                    msg_id = msg.get('id', '')
                    from_phone = msg.get('from', '')
                    msg_type = msg.get('type', '')
                    sender_name = contacts.get(from_phone, '')

                    # Extraer texto del mensaje
                    text_content = ''
                    if msg_type == 'text':
                        text_content = msg.get('text', {}).get('body', '')
                    elif msg_type == 'button':
                        text_content = msg.get('button', {}).get('text', '')
                    elif msg_type == 'interactive':
                        interactive = msg.get('interactive', {})
                        text_content = interactive.get('button_reply', {}).get('title') or interactive.get('list_reply', {}).get('title', '')
                    else:
                        text_content = f"[{msg_type.upper()}]"

                    # Evitar duplicados si Meta reintenta
                    if WhatsAppMessage.objects.filter(message_id=msg_id).exists():
                        continue

                    # Registrar mensaje entrante
                    inbound_msg = WhatsAppMessage.objects.create(
                        sender_phone=from_phone,
                        sender_name=sender_name,
                        message_text=text_content,
                        direction='inbound',
                        message_id=msg_id,
                        is_auto_reply=False
                    )

                    # Si auto-respuesta está activa, responder automáticamente
                    if config.auto_reply_enabled and text_content:
                        reply_text = generate_auto_reply(text_content, sender_name, config)
                        
                        # Enviar a través de Meta API si está configurada
                        send_ok, send_res = send_meta_whatsapp_message(
                            phone_number_id=config.phone_number_id,
                            access_token=config.access_token,
                            to_phone=from_phone,
                            message_text=reply_text
                        )

                        # Registrar mensaje de respuesta
                        WhatsAppMessage.objects.create(
                            sender_phone=from_phone,
                            sender_name='AeroAgencia Bot',
                            message_text=reply_text,
                            direction='outbound',
                            is_auto_reply=True
                        )

        return HttpResponse('EVENT_RECEIVED', status=200)


class WhatsAppConversationsView(APIView):
    """Lista las conversaciones agrupadas por número de teléfono."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        messages = WhatsAppMessage.objects.all().order_by('-created_at')
        conversations = {}
        for m in messages:
            phone = m.sender_phone
            if phone not in conversations:
                conversations[phone] = {
                    'phone': phone,
                    'name': m.sender_name or phone,
                    'last_message': m.message_text,
                    'last_time': m.created_at.strftime('%Y-%m-%d %H:%M'),
                    'direction': m.direction,
                    'unread': False
                }
        return Response(list(conversations.values()))


class WhatsAppMessagesDetailView(APIView):
    """Mensajes de una conversación específica y envío manual desde la app."""
    permission_classes = [IsAuthenticated]

    def get(self, request, phone):
        msgs = WhatsAppMessage.objects.filter(sender_phone=phone).order_by('created_at')
        data = [{
            'id': m.id,
            'text': m.message_text,
            'direction': m.direction,
            'sender_name': m.sender_name,
            'is_auto_reply': m.is_auto_reply,
            'created_at': m.created_at.strftime('%H:%M - %d/%m/%Y'),
        } for m in msgs]
        return Response(data)

    def post(self, request, phone):
        """Envío manual de mensaje a un cliente desde el panel."""
        text = request.data.get('message', '').strip()
        if not text:
            return Response({'detail': 'El mensaje no puede estar vacío'}, status=status.HTTP_400_BAD_REQUEST)

        config = get_whatsapp_config()
        contact_name = request.data.get('sender_name') or ''
        sent_ok, meta_res = send_meta_whatsapp_message(
            phone_number_id=config.phone_number_id,
            access_token=config.access_token,
            to_phone=phone,
            message_text=text
        )

        msg = WhatsAppMessage.objects.create(
            sender_phone=phone,
            sender_name=contact_name or request.user.first_name or request.user.username,
            message_text=text,
            direction='outbound',
            is_auto_reply=False
        )

        return Response({
            'id': msg.id,
            'text': msg.message_text,
            'direction': msg.direction,
            'sender_name': msg.sender_name,
            'is_auto_reply': False,
            'meta_sent': sent_ok,
            'meta_detail': meta_res if not sent_ok else 'Enviado correctamente a través de Meta',
            'created_at': msg.created_at.strftime('%H:%M - %d/%m/%Y'),
        }, status=status.HTTP_201_CREATED)


class WhatsAppConfigView(APIView):
    """Consulta y actualización de credenciales de la API de WhatsApp Cloud."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        config = get_whatsapp_config()
        return Response({
            'phone_number_id': config.phone_number_id,
            'whatsapp_business_account_id': config.whatsapp_business_account_id,
            'access_token': config.access_token,
            'webhook_verify_token': config.webhook_verify_token,
            'auto_reply_enabled': config.auto_reply_enabled,
            'welcome_message': config.welcome_message,
            'menu_message': config.menu_message,
        })

    def post(self, request):
        config = get_whatsapp_config()
        data = request.data
        if 'phone_number_id' in data:
            config.phone_number_id = data['phone_number_id'].strip()
        if 'whatsapp_business_account_id' in data:
            config.whatsapp_business_account_id = data['whatsapp_business_account_id'].strip()
        if 'access_token' in data:
            config.access_token = data['access_token'].strip()
        if 'webhook_verify_token' in data:
            config.webhook_verify_token = data['webhook_verify_token'].strip()
        if 'auto_reply_enabled' in data:
            config.auto_reply_enabled = bool(data['auto_reply_enabled'])
        if 'welcome_message' in data:
            config.welcome_message = data['welcome_message'].strip()
        if 'menu_message' in data:
            config.menu_message = data['menu_message'].strip()
        config.save()
        return Response({'detail': 'Configuración de WhatsApp guardada exitosamente'})


class WhatsAppSimulateWebhookView(APIView):
    """Simulador de prueba local para enviar mensajes de prueba desde la interfaz sin necesitar Meta activo aún."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        phone = request.data.get('phone', '573001234567').strip()
        name = request.data.get('name', 'Cliente Demo').strip()
        incoming_text = request.data.get('message', 'Hola').strip()

        if not incoming_text:
            return Response({'detail': 'Mensaje requerido'}, status=400)

        config = get_whatsapp_config()

        # Guardar mensaje entrante simulado
        inbound = WhatsAppMessage.objects.create(
            sender_phone=phone,
            sender_name=name,
            message_text=incoming_text,
            direction='inbound',
            is_auto_reply=False
        )

        reply_obj = None
        if config.auto_reply_enabled:
            reply_text = generate_auto_reply(incoming_text, name, config)
            reply_obj = WhatsAppMessage.objects.create(
                sender_phone=phone,
                sender_name='AeroAgencia Bot',
                message_text=reply_text,
                direction='outbound',
                is_auto_reply=True
            )

        return Response({
            'status': 'success',
            'inbound': {
                'id': inbound.id,
                'text': inbound.message_text,
                'sender_name': inbound.sender_name,
                'created_at': inbound.created_at.strftime('%H:%M - %d/%m/%Y'),
            },
            'reply': {
                'id': reply_obj.id,
                'text': reply_obj.message_text,
                'sender_name': reply_obj.sender_name,
                'created_at': reply_obj.created_at.strftime('%H:%M - %d/%m/%Y'),
            } if reply_obj else None
        })

