import os
from io import BytesIO
from datetime import date
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
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
    header_table = Table(
        [
            [
                Paragraph("<b>AEROAGENCIA</b><br/><font size=7 color='#059669'>AGENCIA DE VIAJES & TURISMO OFICIAL</font>", h1),
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
        "<b>AeroAgencia Viajes & Turismo S.A.S.</b> • Atención 24/7 en WhatsApp: <b>+57 324 5362112</b><br/>"
        "Documento emitido electrónicamente como comprobante de reserva garantizada.",
        footer_text
    ))

    doc.build(story)
    return buffer.getvalue()

