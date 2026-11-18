import os
from io import BytesIO
from datetime import date
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether, Image
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle


def generate_voucher_pdf_bytes(booking) -> bytes:
    """
    Genera un voucher oficial en PDF elegante y profesional para una reserva de AeroAgencia.
    Retorna los bytes del documento PDF.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Colores corporativos AeroAgencia
    PRIMARY = colors.HexColor("#065f46")     # Emerald 800
    ACCENT = colors.HexColor("#059669")      # Emerald 600
    DARK = colors.HexColor("#0f172a")        # Slate 900
    MUTED = colors.HexColor("#64748b")       # Slate 500
    BG_LIGHT = colors.HexColor("#f8fafc")    # Slate 50
    BG_CARD = colors.HexColor("#ecfdf5")     # Emerald 50
    BORDER = colors.HexColor("#cbd5e1")      # Slate 300

    # Estilos de párrafos
    h1 = ParagraphStyle(
        "BrandTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=PRIMARY
    )
    brand_sub = ParagraphStyle(
        "BrandSub",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=ACCENT
    )
    doc_title = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=14,
        textColor=DARK,
        alignment=2 # Derecha
    )
    doc_sub = ParagraphStyle(
        "DocSub",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=MUTED,
        alignment=2 # Derecha
    )
    sec_title = ParagraphStyle(
        "SecTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=13,
        textColor=PRIMARY
    )
    label_style = ParagraphStyle(
        "Lbl",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10,
        textColor=MUTED
    )
    value_style = ParagraphStyle(
        "Val",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=DARK
    )
    value_accent = ParagraphStyle(
        "ValAcc",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=13,
        textColor=PRIMARY
    )
    badge_style = ParagraphStyle(
        "Badge",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.white,
        alignment=1 # Centro
    )
    footer_text = ParagraphStyle(
        "Footer",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=MUTED,
        alignment=1
    )

    story = []

    # 1. ENCABEZADO PRINCIPAL CON LOGO Y CÓDIGO
    today_str = date.today().strftime("%d/%m/%Y")
    company_title = (getattr(booking, 'hotel_name', '') or "CENTRAL DE RESERVAS").upper()
    brand_header_element = Paragraph(f"<b>{company_title[:28]}</b><br/><font size=7 color='#059669'>PLATAFORMA OFICIAL DE RESERVAS & HOSPEDAJE</font>", h1)
    try:
        if getattr(booking, 'logo_image', None) and booking.logo_image.name and os.path.exists(booking.logo_image.path):
            brand_header_element = Image(booking.logo_image.path, width=140, height=48, kind='proportional')
            brand_header_element.hAlign = 'LEFT'
    except Exception:
        pass

    header_table = Table(
        [
            [
                brand_header_element,
                Paragraph(f"<b>VOUCHER DE SERVICIO</b><br/>Código: <font color='#059669'><b>{booking.code}</b></font><br/>Emisión: {today_str}", doc_title)
            ]
        ],
        colWidths=[330, 210]
    )
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 10))

    # Barra separadora verde
    story.append(HRFlowable(width="100%", thickness=2, color=ACCENT, spaceAfter=10))

    # Badge de Confirmación
    badge_table = Table(
        [[
            Paragraph(f"✓ RESERVA OFICIAL CONFIRMADA — CÓDIGO VOUCHER: {booking.code}", badge_style)
        ]],
        colWidths=[540],
        rowHeights=[20]
    )
    badge_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PRIMARY),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(badge_table)
    story.append(Spacer(1, 14))

    # 2. DATOS DEL PASAJERO / TITULAR
    story.append(Paragraph("DATOS DEL TITULAR DE LA RESERVA", sec_title))
    story.append(Spacer(1, 4))

    client_data = [
        [
            Paragraph("Nombre Completo:", label_style),
            Paragraph(f"<b>{booking.first_name}</b>", value_style),
            Paragraph("Email:", label_style),
            Paragraph(booking.email or "No registrado", value_style),
        ],
        [
            Paragraph("Teléfono de Contacto:", label_style),
            Paragraph(booking.phone or "No registrado", value_style),
            Paragraph("Dirección / Residencia:", label_style),
            Paragraph(booking.address or "No registrada", value_style),
        ]
    ]
    t_client = Table(client_data, colWidths=[100, 170, 90, 180])
    t_client.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BG_LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(t_client)
    story.append(Spacer(1, 14))

    # 3. DETALLES DEL ALOJAMIENTO Y HOSPEDAJE
    story.append(Paragraph("DETALLES DEL ALOJAMIENTO", sec_title))
    story.append(Spacer(1, 4))

    hotel_data = [
        [
            Paragraph("Alojamiento / Hotel:", label_style),
            Paragraph(f"<b>{booking.hotel_name}</b>", value_accent),
            Paragraph("Destino / Ubicación:", label_style),
            Paragraph(booking.location or "Consultar con la agencia", value_style),
        ],
        [
            Paragraph("Tipo de Habitación:", label_style),
            Paragraph(booking.room_type or "Estándar", value_style),
            Paragraph("Capacidad / Ocupación:", label_style),
            Paragraph(f"{booking.guests_count or 1} Huésped(es) | {booking.rooms_count or 1} Hab.", value_style),
        ]
    ]
    t_hotel = Table(hotel_data, colWidths=[110, 160, 100, 170])
    t_hotel.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BG_LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(t_hotel)
    story.append(Spacer(1, 14))

    # 4. ITINERARIO Y FECHAS
    story.append(Paragraph("ITINERARIO DE ESTADÍA", sec_title))
    story.append(Spacer(1, 4))

    # Calcular noches
    nights = 1
    if booking.check_out_date and booking.check_in_date:
        nights = max((booking.check_out_date - booking.check_in_date).days, 1)

    dates_data = [
        [
            Paragraph("Fecha de Check-In:", label_style),
            Paragraph(f"<b>{booking.check_in_date.strftime('%d/%m/%Y') if booking.check_in_date else 'Por confirmar'}</b> (15:00)", value_style),
            Paragraph("Fecha de Check-Out:", label_style),
            Paragraph(f"<b>{booking.check_out_date.strftime('%d/%m/%Y') if booking.check_out_date else 'Por confirmar'}</b> (12:00)", value_style),
        ],
        [
            Paragraph("Duración Total:", label_style),
            Paragraph(f"<b>{nights} Noche(s) de Hospedaje</b>", value_accent),
            Paragraph("Estado de Confirmación:", label_style),
            Paragraph("<font color='#059669'><b>Confirmado y Garantizado</b></font>", value_style),
        ]
    ]
    t_dates = Table(dates_data, colWidths=[110, 160, 110, 160])
    t_dates.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BG_LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(t_dates)
    story.append(Spacer(1, 14))

    # 5. RESUMEN FINANCIERO Y PAGO
    story.append(Paragraph("RESUMEN DE PAGO", sec_title))
    story.append(Spacer(1, 4))

    curr = booking.currency_code or "COP"
    rate = float(booking.room_value or 0)
    rooms = max(booking.rooms_count or 1, 1)
    total_val = rate * nights * rooms

    finance_data = [
        [
            Paragraph("Tarifa por Noche:", label_style),
            Paragraph(f"{curr} {rate:,.2f}", value_style),
            Paragraph("Noches / Habitaciones:", label_style),
            Paragraph(f"{nights} Noche(s) x {rooms} Hab.", value_style),
        ],
        [
            Paragraph("<b>TOTAL PAGADO:</b>", value_style),
            Paragraph(f"<b>{curr} {total_val:,.2f}</b>", value_accent),
            Paragraph("Estado de la Factura:", label_style),
            Paragraph("<font color='#059669'><b>PAGADO EN TOTALIDAD</b></font>", value_style),
        ]
    ]
    t_finance = Table(finance_data, colWidths=[110, 160, 110, 160])
    t_finance.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BG_CARD),
        ("BOX", (0, 0), (-1, -1), 1, ACCENT),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#a7f3d0")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(t_finance)
    story.append(Spacer(1, 16))

    # 6. INSTRUCCIONES Y ASISTENCIA
    story.append(Paragraph("INSTRUCCIONES IMPORTANTES PARA EL VIAJERO", sec_title))
    story.append(Spacer(1, 4))

    notes = [
        "• Presentar este voucher en formato digital o impreso junto con los documentos de identidad originales al momento del Check-in.",
        "• El horario habitual de ingreso (Check-in) es a partir de las 15:00 hrs y la salida (Check-out) hasta las 12:00 hrs.",
        "• Para cambios, solicitudes especiales de alimentación o transporte, comunícate con nuestra línea de WhatsApp oficial.",
        "• Conserva siempre el código de reserva a la mano para cualquier consulta rápida con nuestro asistente virtual."
    ]
    notes_table = Table([[Paragraph("<br/>".join(notes), ParagraphStyle("Notes", parent=styles["Normal"], fontName="Helvetica", fontSize=8, leading=11, textColor=DARK))]], colWidths=[540])
    notes_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BG_LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(notes_table)
    story.append(Spacer(1, 14))

    # 7. PIE DE PÁGINA
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=8))
    story.append(Paragraph(
        f"<b>{booking.hotel_name or 'Central Oficial de Reservas & Viajes'}</b> • Atención 24/7 por WhatsApp Oficial<br/>"
        "Documento emitido electrónicamente como comprobante de reserva garantizada.",
        footer_text
    ))

    doc.build(story)
    return buffer.getvalue()


def generate_receipt_pdf_bytes(booking) -> bytes:
    """
    Genera un Recibo de Pago oficial en PDF para una reserva de AeroAgencia.
    Coincide con el formato oficial de Comprobante / Recibo de Pago.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Colores corporativos AeroAgencia Recibo
    DARK = colors.HexColor("#0f172a")        # Slate 900
    MUTED = colors.HexColor("#64748b")       # Slate 500
    PRIMARY = colors.HexColor("#0d9488")     # Teal 600
    ACCENT = colors.HexColor("#0284c7")      # Sky 600
    BG_LIGHT = colors.HexColor("#f8fafc")    # Slate 50
    BG_CARD = colors.HexColor("#f0fdfa")     # Teal 50
    BORDER = colors.HexColor("#cbd5e1")      # Slate 300

    h1 = ParagraphStyle(
        "RecTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=DARK
    )
    doc_code = ParagraphStyle(
        "RecCode",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        textColor=DARK,
        alignment=2
    )
    sec_title = ParagraphStyle(
        "RecSec",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=DARK
    )
    label_style = ParagraphStyle(
        "RecLbl",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=MUTED
    )
    value_style = ParagraphStyle(
        "RecVal",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=DARK,
        alignment=2
    )
    total_label = ParagraphStyle(
        "RecTotLbl",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=DARK
    )
    total_val = ParagraphStyle(
        "RecTotVal",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        textColor=PRIMARY,
        alignment=2
    )
    footer_text = ParagraphStyle(
        "RecFooter",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=MUTED,
        alignment=1
    )

    story = []

    # 1. ENCABEZADO
    today_str = date.today().strftime("%d/%m/%Y")
    company_title = (getattr(booking, 'hotel_name', '') or "CENTRAL DE RESERVAS").upper()
    brand_header_element = Paragraph(f"<b>{company_title[:28]}</b><br/><font size=8 color='#0d9488'>COMPROBANTE OFICIAL DE PAGO</font>", h1)
    try:
        if getattr(booking, 'logo_image', None) and booking.logo_image.name and os.path.exists(booking.logo_image.path):
            brand_header_element = Image(booking.logo_image.path, width=150, height=48, kind='proportional')
            brand_header_element.hAlign = 'LEFT'
    except Exception:
        pass

    header_table = Table(
        [
            [
                brand_header_element,
                Paragraph(f"Número de reserva<br/><font color='#0d9488' size=14><b>{booking.code}</b></font><br/><font size=8 color='#64748b'>Fecha: {today_str}</font>", doc_code)
            ]
        ],
        colWidths=[330, 210]
    )
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=4, color=DARK, spaceBefore=4, spaceAfter=14))

    # 2. TUS DATOS (CLIENTE)
    story.append(Paragraph("Tus datos", sec_title))
    story.append(Spacer(1, 4))

    client_data = [
        [Paragraph("Nombre", label_style), Paragraph(booking.first_name or "-", value_style)],
        [Paragraph("Correo", label_style), Paragraph(booking.email or "-", value_style)],
        [Paragraph("Teléfono", label_style), Paragraph(booking.phone or "-", value_style)],
        [Paragraph("Dirección", label_style), Paragraph(booking.address or "-", value_style)],
    ]
    t_client = Table(client_data, colWidths=[200, 340])
    t_client.setStyle(TableStyle([
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(t_client)
    story.append(Spacer(1, 14))

    # 3. DATOS DE LA RESERVA Y ALOJAMIENTO
    story.append(Paragraph("Datos de la Reserva", sec_title))
    story.append(Spacer(1, 4))

    nights = 1
    if booking.check_out_date and booking.check_in_date:
        nights = max((booking.check_out_date - booking.check_in_date).days, 1)

    curr = booking.currency_code or "EUR"
    rate = float(booking.room_value or 0)
    rooms = max(booking.rooms_count or 1, 1)
    total_stay = rate * nights * rooms

    check_in_str = booking.check_in_date.strftime("%d/%m/%Y") if booking.check_in_date else "-"
    check_out_str = booking.check_out_date.strftime("%d/%m/%Y") if booking.check_out_date else "-"

    booking_data = [
        [Paragraph("Nombre del alojamiento", label_style), Paragraph(booking.hotel_name or "-", value_style)],
        [Paragraph("Dirección del alojamiento", label_style), Paragraph(f"{booking.location or ''} {booking.address or ''}".strip() or "-", value_style)],
        [Paragraph("Número de reserva", label_style), Paragraph(booking.code or "-", value_style)],
        [Paragraph("Entrada", label_style), Paragraph(check_in_str, value_style)],
        [Paragraph("Salida", label_style), Paragraph(check_out_str, value_style)],
        [Paragraph("Habitaciones / Huéspedes", label_style), Paragraph(f"{rooms} Hab. • {booking.guests_count or 1} Huéspedes", value_style)],
        [Paragraph("Tipo de habitación", label_style), Paragraph(booking.room_type or "Estándar", value_style)],
        [Paragraph("Total", total_label), Paragraph(f"{curr} {total_stay:,.2f}", total_val)],
    ]
    t_booking = Table(booking_data, colWidths=[200, 340])
    t_booking.setStyle(TableStyle([
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, colors.HexColor("#e2e8f0")),
        ("BACKGROUND", (0, -1), (-1, -1), BG_CARD),
        ("BOX", (0, -1), (-1, -1), 1, PRIMARY),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, -1), (-1, -1), 6),
        ("RIGHTPADDING", (0, -1), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(t_booking)
    story.append(Spacer(1, 16))

    # 4. CONFIRMACIÓN DE PAGO
    pay_box = [
        [
            Paragraph(
                f"<b>Estado del pago:</b> <font color='#059669'><b>PAGADO Y CONFIRMADO</b></font><br/>"
                f"Pago realizado con tarjeta de crédito/débito ****{booking.code[-3:] if len(booking.code) >= 3 else '244'}<br/>"
                f"¡Gracias por tu compra con AeroAgencia!",
                ParagraphStyle("PayNotes", parent=styles["Normal"], fontName="Helvetica", fontSize=9, leading=13, textColor=DARK)
            )
        ]
    ]
    t_pay = Table(pay_box, colWidths=[540])
    t_pay.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BG_LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(t_pay)
    story.append(Spacer(1, 16))

    # 5. PIE DE PÁGINA
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=8))
    story.append(Paragraph(
        "<b>AeroAgencia Flight & Hotel Operations</b> • Comprobante oficial de reserva emitida por el sistema.<br/>"
        "Atención 24/7 en WhatsApp • Documento válido como comprobante de pago.",
        footer_text
    ))

    doc.build(story)
    return buffer.getvalue()


