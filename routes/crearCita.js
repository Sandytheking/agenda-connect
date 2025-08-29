// 📁 routes/crearCita.js
import express from 'express';
import { getConfigBySlug, supabase } from '../supabaseClient.js';
import { getAccessToken, getEventsForDay } from '../utils/google.js';
import { google } from 'googleapis';
import { getDateTimeFromStrings } from '../utils/fechas.js';
import { sendReconnectEmail } from '../utils/sendReconnectEmail.js';
import { verificarSuscripcionActiva } from '../utils/verificarSuscripcionActiva.js';
import { sendConfirmationEmail } from '../utils/sendConfirmationEmail.js';
import { generateCancelToken } from '../utils/generateCancelToken.js';
import { canCreateAppointmentBySlug } from '../utils/checkPlanLimit.js';
import { sendNearLimitEmail } from "../utils/sendNearLimitEmail.js";
import { checkAndSendNearLimitEmail } from "../helpers/checkAndSendNearLimitEmail.js";

// import fetch if needed in older Node: import fetch from 'node-fetch';

const router = express.Router();
const BASE_API = process.env.BASE_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.agenda-connect.com';

/**
 * Guarda la cita en Supabase. startDT y endDT se esperan como Luxon DateTime o objetos Date.
 */
const guardarCitaEnSupabase = async ({ slug, name, email, phone, startDT, endDT, evento_id = null, cancelToken = null }) => {
  try {
    const payload = {
      slug,
      nombre: name,
      email,
      telefono: phone,
      fecha: typeof startDT?.toISODate === 'function' ? startDT.toISODate() : (new Date(startDT)).toISOString().split('T')[0],
      hora: typeof startDT?.toFormat === 'function' ? startDT.toFormat('HH:mm') : (new Date(startDT)).toTimeString().slice(0,5),
      inicio: typeof startDT?.toISO === 'function' ? startDT.toISO() : (new Date(startDT)).toISOString(),
      fin: typeof endDT?.toISO === 'function' ? endDT.toISO() : (new Date(endDT)).toISOString(),
      evento_id,
      creado_en_google: !!evento_id,
      cancel_token: cancelToken || null,
      cancelada: false
    };

    const { error } = await supabase.from('appointments').insert([payload]);

    if (error) {
      console.error('❌ Error al guardar cita en Supabase:', error);
      return { ok: false, error };
    }

    console.log('✅ Cita guardada en Supabase', { slug, inicio: payload.inicio });
    return { ok: true, payload };
  } catch (err) {
    console.error('❌ Exception guardando cita en Supabase:', err);
    return { ok: false, error: err };
  }
};

router.post('/:slug/crear-cita', async (req, res) => {
  const slug = req.params.slug;
  const { name, email, phone, date, time } = req.body;

  if (!name || !email || !date || !time) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: name, email, date, time' });
  }


  try {
    // 0) Suscripción activa (si aplica)
    try {
      const { valido, mensaje } = await verificarSuscripcionActiva(slug);
      if (!valido) return res.status(403).json({ error: mensaje });
    } catch (e) {
      console.warn('verificarSuscripcionActiva falló (continuamos):', e?.message || e);
    }

    // 1) Obtener configuración del cliente
    const config = await getConfigBySlug(slug);
    if (!config) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    // 2) Obtener plan del cliente (asegurar plan)
    const { data: cliente, error: clienteError } = await supabase
      .from('clients')
      .select('slug, plan')
      .eq('slug', slug)
      .single();

    if (clienteError || !cliente) {
      console.error('Cliente no encontrado o error:', clienteError);
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // 3) Verificar límite por plan
    try {
      const { allowed, totalThisMonth, limit } = await canCreateAppointmentBySlug({
        supabase,
        slug: cliente.slug,
        plan: cliente.plan,
        freeLimit: 10,
      });

await checkAndSendNearLimitEmail({
  slug: cliente.slug,
  total: totalThisMonth + 1,
  limit,
});

        // Enviar alerta si está por alcanzar el límite
  await sendNearLimitEmail({ slug: cliente.slug, total: totalThisMonth + 1, limit });

      if (!allowed) {
        return res.status(403).json({
          error: 'Límite de citas por mes alcanzado',
          message: `Has alcanzado el límite de ${limit} citas para el plan Free este mes (${totalThisMonth}/${limit}).`,
          totalThisMonth,
          limit,
        });
      }
    } catch (err) {
      console.warn('checkPlanLimit falló (permitiendo por defecto):', err);
      // fallback permisivo
    }

    // 4) Verificar disponibilidad contra endpoint
    const availabilityUrl = `${BASE_API.replace(/\/$/, '')}/api/availability/${encodeURIComponent(slug)}?date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`;
    console.log('Comprobando disponibilidad en:', availabilityUrl);
    const availabilityRes = await fetch(availabilityUrl);
    if (!availabilityRes.ok) {
      const txt = await availabilityRes.text().catch(() => null);
      console.warn('Availability endpoint no-ok:', availabilityRes.status, txt);
      return res.status(500).json({ error: 'Error verificando disponibilidad' });
    }
    const availabilityJson = await availabilityRes.json();
    if (!availabilityJson.available) {
      return res.status(409).json({ error: availabilityJson.message || 'Horario no disponible' });
    }

    // 5) Construir fechas (DateTime de Luxon preferido)
    const timezone = (config.timezone || 'America/Santo_Domingo').replace(/^['"]|['"]$/g, '');
    const startDT = getDateTimeFromStrings(date, time, timezone); // debe devolver Luxon DateTime u equivalente
    const endDT = startDT.plus ? startDT.plus({ minutes: config.duration_minutes || 30 }) : new Date(new Date(startDT).getTime() + (config.duration_minutes || 30) * 60000);

    // Generar cancelToken antes de guardar / enviar email
    const cancelToken = generateCancelToken();

    // 6) Si no hay refresh_token => guardar local y enviar reconexión + confirmación
    if (!config.refresh_token || config.refresh_token.trim() === '') {
      console.warn(`⚠️ No hay refresh_token para ${slug}. Guardando local y notificando.`);

      const saved = await guardarCitaEnSupabase({
        slug,
        name,
        email,
        phone,
        startDT,
        endDT,
        evento_id: null,
        cancelToken
      });

      if (!saved.ok) {
        return res.status(500).json({ error: 'Error guardando cita' });
      }

      // Formatear fecha/hora para el correo (zona negocio)
      const fechaFormateada = typeof startDT?.toFormat === 'function'
        ? startDT.setZone(timezone).toFormat('yyyy-MM-dd')
        : (new Date(startDT)).toISOString().split('T')[0];

      const horaFormateada = typeof startDT?.toFormat === 'function'
        ? startDT.setZone(timezone).toFormat('hh:mm a')
        : (new Date(startDT)).toLocaleTimeString();

      // Enviar confirmación
      try {
        await sendConfirmationEmail({
          to: email,
          nombre: name,
          fecha: fechaFormateada,
          hora: horaFormateada,
          nombreEmpresa: config.nombre || null,
          slug,
          cancelToken
        });
        console.log('📧 Confirmación enviada (fallback local) a', email);
      } catch (e) {
        console.warn('sendConfirmationEmail falló (fallback):', e?.message || e);
      }

      // Enviar reconexión al admin si aplica
      if (config.calendar_email) {
        try {
          await sendReconnectEmail({ to: config.calendar_email, nombre: config.nombre || slug, slug });
          console.log('📧 Correo reconexión enviado a', config.calendar_email);
        } catch (e) {
          console.warn('sendReconnectEmail falló:', e?.message || e);
        }
      }

      return res.status(200).json({ success: true, local: true });
    }

    // 7) Intentar obtener access token
    let accessToken;
    try {
      accessToken = await getAccessToken(config.refresh_token, slug);
    } catch (err) {
      console.error('❌ Token vencido o inválido:', err?.message || err);

      // Enviar reconexión al admin si es posible
      if (config.calendar_email) {
        try {
          await sendReconnectEmail({ to: config.calendar_email, nombre: config.nombre || slug, slug });
          console.log(`📧 Correo de reconexión enviado a ${config.calendar_email}`);
        } catch (mailErr) {
          console.error('❌ Error al enviar correo de reconexión:', mailErr);
        }
      }

      // Guardar la cita localmente como fallback y enviar confirmación
      const fallbackSaved = await guardarCitaEnSupabase({
        slug,
        name,
        email,
        phone,
        startDT,
        endDT,
        evento_id: null,
        cancelToken
      });

      if (!fallbackSaved.ok) {
        return res.status(500).json({ error: 'Error guardando cita (fallback)' });
      }

      // Formato para email
      const fechaFormateada = typeof startDT?.toFormat === 'function'
        ? startDT.setZone(timezone).toFormat('yyyy-MM-dd')
        : (new Date(startDT)).toISOString().split('T')[0];

      const horaFormateada = typeof startDT?.toFormat === 'function'
        ? startDT.setZone(timezone).toFormat('hh:mm a')
        : (new Date(startDT)).toLocaleTimeString();

      try {
        await sendConfirmationEmail({
          to: email,
          nombre: name,
          fecha: fechaFormateada,
          hora: horaFormateada,
          negocio: config.nombre || slug,
          slug,
          cancelToken
        });
      } catch (e) {
        console.warn('sendConfirmationEmail fallback failed:', e?.message || e);
      }

      return res.status(200).json({ success: true, local: true });
    }

    // 8) Comprobar solapamientos en Google Calendar
    try {
      const eventos = await getEventsForDay(accessToken, date);
      const startJs = typeof startDT?.toJSDate === 'function' ? startDT.toJSDate() : new Date(startDT);
      const endJs = typeof endDT?.toJSDate === 'function' ? endDT.toJSDate() : new Date(endDT);

      const solapados = eventos.filter(ev => {
        const eStart = new Date(ev.start?.dateTime || ev.start?.date);
        const eEnd = new Date(ev.end?.dateTime || ev.end?.date);
        return eStart < endJs && startJs < eEnd;
      });

      if (solapados.length > 0) {
        return res.status(409).json({ error: 'Ya hay una cita en ese horario' });
      }
    } catch (err) {
      console.warn('No se pudieron comprobar eventos en Google (continuando):', err);
    }

    // 9) Crear evento en Google Calendar
    let eventoId = null;
    try {
      const oAuth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
      oAuth2Client.setCredentials({ access_token: accessToken });

const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
const evento = await calendar.events.insert({
  calendarId: 'primary',
  requestBody: {
    summary: `Cita con ${name}`,
    description: `Cliente: ${name}\nEmail: ${email}\nTeléfono: ${phone}`,
    start: {
      dateTime: startDT.toISO(),
      timeZone: timezone || 'America/Santo_Domingo'
    },
    end: {
      dateTime: startDT.plus({ minutes: config.duration_minutes }).toISO(),
      timeZone: timezone || 'America/Santo_Domingo'
    },
    // 👇 Eliminamos esto para que Google no invite al cliente
    // attendees: [{ email }],
    reminders: { useDefault: true }
  },
  // 👇 aseguramos que Google no mande correos automáticos
  sendUpdates: 'none'
});


      eventoId = evento?.data?.id || null;
      console.log('Evento creado en Google Calendar:', eventoId);
    } catch (err) {
      console.error('Error creando evento en Google Calendar:', err);
      // fallback: guardar local y notificar
      const fallbackSaved2 = await guardarCitaEnSupabase({
        slug,
        name,
        email,
        phone,
        startDT,
        endDT,
        evento_id: null,
        cancelToken
      });

      if (!fallbackSaved2.ok) {
        return res.status(500).json({ error: 'Error guardando cita tras fallo Google' });
      }

      // Formato para email
      const fechaFormateada = typeof startDT?.toFormat === 'function'
        ? startDT.setZone(timezone).toFormat('yyyy-MM-dd')
        : (new Date(startDT)).toISOString().split('T')[0];

      const horaFormateada = typeof startDT?.toFormat === 'function'
        ? startDT.setZone(timezone).toFormat('hh:mm a')
        : (new Date(startDT)).toLocaleTimeString();

      try {
        await sendConfirmationEmail({
          to: email,
          nombre: name,
          fecha: fechaFormateada,
          hora: horaFormateada,
          negocio: config.nombre || slug,
          slug,
          cancelToken
        });
      } catch (e) {
        console.warn('sendConfirmationEmail after google-fail failed:', e?.message || e);
      }

      if (config.calendar_email) {
        try { await sendReconnectEmail({ to: config.calendar_email, nombre: config.nombre || slug, slug }); } catch (e) { console.warn('sendReconnectEmail after google-fail failed:', e?.message || e); }
      }

      return res.status(200).json({ success: true, local: true, warning: 'Evento en Google falló, cita guardada localmente' });
    }

    // 10) Guardar cita con evento_id y cancelToken
    const savedFinal = await guardarCitaEnSupabase({
      slug,
      name,
      email,
      phone,
      startDT,
      endDT,
      evento_id: eventoId,
      cancelToken
    });

    if (!savedFinal.ok) {
      console.error('Error guardando cita con evento_id en Supabase:', savedFinal.error);
      return res.status(500).json({ error: 'Error guardando cita' });
    }


    // 11) Preparar valores legibles para el correo
    const fechaFormateada = typeof startDT?.toFormat === 'function'
      ? startDT.setZone(timezone).toFormat('yyyy-MM-dd')
      : (new Date(startDT)).toISOString().split('T')[0];

    const horaFormateada = typeof startDT?.toFormat === 'function'
      ? startDT.setZone(timezone).toFormat('hh:mm a')
      : (new Date(startDT)).toLocaleTimeString();

    // 12) Enviar correo de confirmación
    try {
      await sendConfirmationEmail({
        to: email,
        nombre: name,
        fecha: fechaFormateada,
        hora: horaFormateada,
        negocio: config.nombre || slug,
        slug,
        cancelToken
      });
      console.log(`📧 Correo de confirmación enviado a ${email}`);
    } catch (e) {
      console.warn('sendConfirmationEmail falló post-save (no crítico):', e?.message || e);
    }

    return res.status(200).json({ success: true, eventId: eventoId });
  } catch (err) {
    console.error('❌ Error al crear cita:', err);
    return res.status(500).json({ error: 'No se pudo crear la cita' });
  }
});

export default router;
