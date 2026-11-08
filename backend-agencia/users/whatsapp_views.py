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
from .voucher_generator import generate_voucher_pdf_bytes

logger = logging.getLogger(__name__)


def get_whatsapp_config():
    config, _ = WhatsAppConfig.objects.get_or_create(id=1)
    return config


def send_meta_whatsapp_message(phone_number_id, access_token, to_phone, message_text):
    """Envía un mensaje de texto a través de WhatsApp Cloud API (Meta)."""
    if not phone_number_id or not access_token:
        logger.warning("WhatsApp API no configurada (falta phone_number_id o access_token).")
        return False, "WhatsApp API no configurada (falta Phone ID o Token)."

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
        with urllib.request.urlopen(req, timeout=12) as resp:
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


def send_meta_whatsapp_document(phone_number_id, access_token, to_phone, document_url, filename, caption=""):
    """Envía un documento PDF a través de WhatsApp Cloud API (Meta)."""
    if not phone_number_id or not access_token:
        return False, "WhatsApp API no configurada."

    clean_to = re.sub(r'\D', '', to_phone)
    url = f"https://graph.facebook.com/v21.0/{phone_number_id}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": clean_to,
        "type": "document",
        "document": {
            "link": document_url,
            "filename": filename,
            "caption": caption
        }
    }
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    try:
        req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
        with urllib.request.urlopen(req, timeout=18) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return True, data
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode('utf-8')
        logger.error(f"Error enviando documento WhatsApp a {clean_to}: {err_msg}")
        try:
            parsed = json.loads(err_msg)
            error_detail = parsed.get('error', {}).get('message', err_msg)
        except Exception:
            error_detail = err_msg
        return False, error_detail
    except Exception as e:
        logger.error(f"Excepción enviando documento WhatsApp: {e}")
        return False, str(e)


def find_booking_for_conversation(text_content, from_phone):
    """Busca una reserva asociada al texto o al historial de la conversación."""
    clean_text = text_content.strip().upper()

    # 1. Buscar en el texto actual si hay un código con letras y números (ej. AEROA1 o GRXEB3)
    codes_in_text = re.findall(r'[A-Z0-9]{4,8}', clean_text)
    for code_candidate in codes_in_text:
        b = Booking.objects.filter(code__iexact=code_candidate).first()
        if b:
            return b

    # 2. Buscar en el historial reciente de mensajes de este número
    clean_phone = re.sub(r'\D', '', from_phone)
    recent_msgs = WhatsAppMessage.objects.filter(sender_phone=clean_phone).order_by('-created_at')[:8]
    for msg in recent_msgs:
        codes = re.findall(r'[A-Z0-9]{4,8}', msg.message_text.upper())
        for code in codes:
            b = Booking.objects.filter(code__iexact=code).first()
            if b:
                return b

    # 3. Buscar si el teléfono coincide con los últimos 10 dígitos del teléfono en reservas
    if len(clean_phone) >= 7:
        phone_suffix = clean_phone[-10:]
        b = Booking.objects.filter(phone__icontains=phone_suffix).first()
        if b:
            return b

    return None


def process_ai_interaction(from_phone, sender_name, incoming_text, config):
    """
    Motor de Inteligencia Artificial para atención al cliente y generación de Vouchers en PDF.
    Retorna: (reply_text, voucher_booking_to_send)
    """
    clean_text = incoming_text.strip().lower()
    clean_phone = re.sub(r'\D', '', from_phone)
    client_name = sender_name or "Estimado(a) viajero(a)"

    # Intenciones principales:
    # A) Solicitar Voucher / Bauche / Recibo / PDF
    voucher_keywords = [
        'bauche', 'voucher', 'baucher', 'vaucher', 'recibo', 'comprobante',
        'pdf', 'tiquete', 'boleto', 'mi reserva en pdf', 'descargar voucher', 'enviame el voucher'
    ]
    wants_voucher = any(kw in clean_text for kw in voucher_keywords)

    booking = find_booking_for_conversation(incoming_text, from_phone)

    if wants_voucher:
        if booking:
            nights = max((booking.check_out_date - booking.check_in_date).days, 1) if (booking.check_out_date and booking.check_in_date) else 1
            reply_text = (
                f"✈️ *¡Con mucho gusto {client_name}!* Aquí tienes el *Voucher oficial en PDF* de tu reserva *{booking.code}*.\n\n"
                f"📋 *Resumen de tu Viaje:*\n"
                f"• *Pasajero:* {booking.first_name}\n"
                f"• *Alojamiento:* {booking.hotel_name}\n"
                f"• *Destino:* {booking.location or 'Colombia'}\n"
                f"• *Fechas:* {booking.check_in_date} al {booking.check_out_date} ({nights} noches)\n\n"
                f"Acabamos de adjuntar el documento PDF oficial aquí arriba para que lo descargues o lo lleves en tu teléfono al hacer el Check-in. ¡Feliz viaje con AeroAgencia!"
            )
            return reply_text, booking
        else:
            reply_text = (
                f"✈️ *¡Hola {client_name}!* Con mucho gusto te emitimos y enviamos tu Voucher oficial en formato PDF.\n\n"
                f"Por favor facilítanos el *código de tu reserva* (por ejemplo: *AEROA1*) para generarlo de inmediato."
            )
            return reply_text, None

    # B) Si escribió directamente el código de su reserva o pide detalles
    if booking:
        nights = max((booking.check_out_date - booking.check_in_date).days, 1) if (booking.check_out_date and booking.check_in_date) else 1
        total = float(booking.room_value or 0) * nights * max(booking.rooms_count or 1, 1)
        curr = booking.currency_code or "COP"
        reply_text = (
            f"✈️ *Detalles de tu Reserva en AeroAgencia*\n"
            f"━━━━━━━━━━━━━━━━━━━\n"
            f"🎫 *Código:* {booking.code}\n"
            f"👤 *Pasajero:* {booking.first_name}\n"
            f"🏨 *Alojamiento:* {booking.hotel_name}\n"
            f"📍 *Destino:* {booking.location or 'No especificado'}\n"
            f"🛏 *Tipo de Habitación:* {booking.room_type}\n"
            f"📅 *Check-in:* {booking.check_in_date} (15:00)\n"
            f"📅 *Check-out:* {booking.check_out_date} (12:00)\n"
            f"👥 *Huéspedes:* {booking.guests_count} | Habitaciones: {booking.rooms_count}\n"
            f"💰 *Total Pagado:* {curr} {total:,.2f}\n"
            f"━━━━━━━━━━━━━━━━━━━\n"
            f"📄 *¿Deseas descargar tu Voucher oficial en PDF?*\n"
            f"Solo responde escribiendo la palabra *VOUCHER* y te lo enviaremos al instante por este chat."
        )
        return reply_text, None

    # C) Saludos
    greetings = ['hola', 'hola!', 'buenos dias', 'buenas tardes', 'buenas noches', 'hello', 'hi', 'inicio']
    if any(g in clean_text for g in greetings):
        return (
            f"¡Hola {client_name}! Bienvenido(a) a *AeroAgencia* ✈️.\n\n"
            f"Soy tu asistente virtual con Inteligencia Artificial. ¿En qué puedo colaborarte hoy?\n\n"
            f"1️⃣ Escribe el *CÓDIGO* de tu reserva para consultar detalles.\n"
            f"2️⃣ Escribe *VOUCHER* si necesitas descargar tu comprobante oficial en PDF.\n"
            f"3️⃣ Escribe *ASESOR* para hablar con nuestro equipo humano."
        ), None

    # D) Menú u Opciones
    if clean_text in ['menu', 'menú', 'ayuda', 'opciones', 'help', '3']:
        return config.menu_message, None

    # E) Solicitar Asesor Humano
    if any(k in clean_text for k in ['asesor', 'agente', 'humano', 'persona', 'comercial']):
        return (
            f"👨‍✈️ *Atención Personalizada AeroAgencia*\n"
            f"Hemos notificado a nuestro equipo de asesores comerciales. Uno de nuestros agentes se comunicará contigo por este mismo chat en breve.\n\n"
            f"Por favor descríbenos tu inquietud o déjanos saber cómo podemos ayudarte."
        ), None

    # F) Agradecimientos
    if any(k in clean_text for k in ['gracias', 'muchas gracias', 'perfecto', 'excelente', 'vale', 'listo']):
        return f"¡Con muchísimo gusto {client_name}! En AeroAgencia estamos para servirte. ¡Que tengas un excelente viaje! ✈️🌟", None

    # G) Respuesta contextual inteligente por defecto
    return (
        f"Hola {client_name}, hemos recibido tu mensaje: \"{incoming_text}\".\n\n"
        f"• Para ver los datos de tu viaje, escribe tu *CÓDIGO DE RESERVA* (ej: *AEROA1*).\n"
        f"• Para recibir tu confirmación oficial en PDF, escribe *VOUCHER*.\n"
        f"• Para comunicarte con un asesor, escribe *ASESOR*."
    ), None


@method_decorator(csrf_exempt, name='dispatch')
class WhatsAppWebhookView(View):
    """
    Webhook oficial para WhatsApp Cloud API (Meta).
    GET: Validación inicial requerida por Meta App Dashboard.
    POST: Recepción en vivo de mensajes, procesamiento con IA y despacho de Vouchers en PDF.
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
        except Exception:
            return HttpResponse('Bad Request', status=400)

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

                    # Registrar mensaje recibido
                    WhatsAppMessage.objects.create(
                        sender_phone=from_phone,
                        sender_name=sender_name or from_phone,
                        message_text=text_content,
                        direction='inbound',
                        message_id=msg_id,
                        is_auto_reply=False
                    )

                    # Si las respuestas automáticas con IA están habilitadas
                    if config.auto_reply_enabled and text_content:
                        reply_text, voucher_booking = process_ai_interaction(
                            from_phone=from_phone,
                            sender_name=sender_name,
                            incoming_text=text_content,
                            config=config
                        )

                        # Si se requiere enviar el PDF del Voucher
                        if voucher_booking:
                            voucher_url = f"https://globetrek.cloud/users/api/whatsapp/voucher/{voucher_booking.code}/"
                            filename = f"Voucher_{voucher_booking.code}.pdf"
                            caption = f"✈️ Voucher oficial de tu reserva {voucher_booking.code} - {voucher_booking.hotel_name}"

                            # 1. Enviar el Documento PDF por WhatsApp
                            send_meta_whatsapp_document(
                                phone_number_id=config.phone_number_id,
                                access_token=config.access_token,
                                to_phone=from_phone,
                                document_url=voucher_url,
                                filename=filename,
                                caption=caption
                            )

                            # Registrar mensaje del archivo enviado
                            WhatsAppMessage.objects.create(
                                sender_phone=from_phone,
                                sender_name='AeroAgencia IA',
                                message_text=f"📄 [DOCUMENTO ADJUNTO: {filename}]\n{caption}",
                                direction='outbound',
                                is_auto_reply=True
                            )

                        # 2. Enviar mensaje de texto aclaratorio
                        send_meta_whatsapp_message(
                            phone_number_id=config.phone_number_id,
                            access_token=config.access_token,
                            to_phone=from_phone,
                            message_text=reply_text
                        )

                        # Registrar mensaje de texto enviado
                        WhatsAppMessage.objects.create(
                            sender_phone=from_phone,
                            sender_name='AeroAgencia IA',
                            message_text=reply_text,
                            direction='outbound',
                            is_auto_reply=True
                        )

        return HttpResponse('EVENT_RECEIVED', status=200)


class WhatsAppBookingVoucherPDFView(APIView):
    """Genera y descarga en vivo el PDF oficial del voucher de una reserva para WhatsApp y web."""
    permission_classes = [AllowAny]

    def get(self, request, code):
        booking = Booking.objects.filter(code__iexact=code.strip()).first()
        if not booking:
            return HttpResponse("Reserva no encontrada", status=404)

        try:
            pdf_bytes = generate_voucher_pdf_bytes(booking)
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            response['Content-Disposition'] = f'inline; filename="Voucher_{booking.code}.pdf"'
            response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            return response
        except Exception as e:
            logger.error(f"Error generando voucher PDF para {code}: {e}")
            return HttpResponse(f"Error generando PDF: {e}", status=500)


class WhatsAppSendVoucherManualView(APIView):
    """Permite al asesor en el dashboard enviar el PDF de voucher a un cliente con un solo clic."""
    permission_classes = [AllowAny]

    def post(self, request, phone):
        booking_code = request.data.get('booking_code', '').strip()
        booking = None

        if booking_code:
            booking = Booking.objects.filter(code__iexact=booking_code).first()

        if not booking:
            booking = find_booking_for_conversation(booking_code, phone)

        if not booking:
            return Response({'detail': 'No se encontró una reserva asociada con ese código.'}, status=status.HTTP_404_NOT_FOUND)

        config = get_whatsapp_config()
        voucher_url = f"https://globetrek.cloud/users/api/whatsapp/voucher/{booking.code}/"
        filename = f"Voucher_{booking.code}.pdf"
        caption = f"✈️ Voucher oficial de tu reserva {booking.code} en {booking.hotel_name}"

        # 1. Enviar el documento
        sent_ok, doc_res = send_meta_whatsapp_document(
            phone_number_id=config.phone_number_id,
            access_token=config.access_token,
            to_phone=phone,
            document_url=voucher_url,
            filename=filename,
            caption=caption
        )

        # 2. Registrar en base de datos
        doc_msg = WhatsAppMessage.objects.create(
            sender_phone=phone,
            sender_name=request.user.first_name or request.user.username if request.user.is_authenticated else 'Asesor AeroAgencia',
            message_text=f"📄 [VOUCHER PDF ENVIADO]: {filename}\n{caption}",
            direction='outbound',
            is_auto_reply=False
        )

        return Response({
            'success': sent_ok,
            'message_id': doc_msg.id,
            'booking_code': booking.code,
            'filename': filename,
            'voucher_url': voucher_url,
            'detail': 'Voucher enviado exitosamente por WhatsApp' if sent_ok else str(doc_res)
        }, status=status.HTTP_200_OK if sent_ok else status.HTTP_207_MULTI_STATUS)


class WhatsAppConversationsView(APIView):
    """Lista las conversaciones agrupadas por número de teléfono."""
    permission_classes = [AllowAny]

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
    permission_classes = [AllowAny]

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

        agent_name = contact_name
        if not agent_name and request.user.is_authenticated:
            agent_name = request.user.first_name or request.user.username
        if not agent_name:
            agent_name = 'Asesor AeroAgencia'

        msg = WhatsAppMessage.objects.create(
            sender_phone=phone,
            sender_name=agent_name,
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
    permission_classes = [AllowAny]

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

        return Response({
            'phone_number_id': config.phone_number_id,
            'whatsapp_business_account_id': config.whatsapp_business_account_id,
            'access_token': config.access_token,
            'webhook_verify_token': config.webhook_verify_token,
            'auto_reply_enabled': config.auto_reply_enabled,
            'welcome_message': config.welcome_message,
            'menu_message': config.menu_message,
        })


class WhatsAppSimulateWebhookView(APIView):
    """Simulador de webhook para pruebas desde el panel."""
    permission_classes = [AllowAny]

    def post(self, request):
        phone = request.data.get('phone', '573143291149')
        name = request.data.get('name', 'Pasajero Demo')
        incoming_text = request.data.get('message', 'AEROA1')

        config = get_whatsapp_config()

        # Registrar el mensaje entrante simulado
        WhatsAppMessage.objects.create(
            sender_phone=phone,
            sender_name=name,
            message_text=incoming_text,
            direction='inbound',
            is_auto_reply=False
        )

        # Generar respuesta con IA
        reply_text, voucher_booking = process_ai_interaction(
            from_phone=phone,
            sender_name=name,
            incoming_text=incoming_text,
            config=config
        )

        if voucher_booking:
            filename = f"Voucher_{voucher_booking.code}.pdf"
            WhatsAppMessage.objects.create(
                sender_phone=phone,
                sender_name='AeroAgencia IA',
                message_text=f"📄 [DOCUMENTO ADJUNTO: {filename}]\n✈️ Voucher oficial de tu reserva {voucher_booking.code} en {voucher_booking.hotel_name}",
                direction='outbound',
                is_auto_reply=True
            )

        WhatsAppMessage.objects.create(
            sender_phone=phone,
            sender_name='AeroAgencia IA',
            message_text=reply_text,
            direction='outbound',
            is_auto_reply=True
        )

        return Response({
            'status': 'success',
            'reply': reply_text,
            'voucher_sent': bool(voucher_booking),
            'voucher_code': voucher_booking.code if voucher_booking else None
        })
