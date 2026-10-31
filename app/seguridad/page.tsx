import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cómo protege PsyDesk los datos clínicos",
  description: "Dónde se guardan los datos de PsyDesk, quién puede verlos, qué se comparte con servicios externos y cómo se borran.",
};

// Fecha de la última revisión del código contra este texto.
const REVISADO = "31 de octubre de 2026";

const serif = "var(--font-lora), Georgia, serif";
const sans = "var(--font-dm-sans), system-ui, sans-serif";

const s = {
  page: { minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)", fontFamily: sans, padding: "48px 20px 72px" },
  wrap: { maxWidth: 760, margin: "0 auto" },
  h1: { fontFamily: serif, fontSize: "clamp(28px, 5vw, 38px)", fontWeight: 600, letterSpacing: "-0.6px", lineHeight: 1.15, margin: "18px 0 14px" },
  lead: { fontSize: 16, lineHeight: 1.7, color: "var(--text-secondary)", margin: 0 },
  h2: { fontFamily: serif, fontSize: 21, fontWeight: 600, letterSpacing: "-0.3px", margin: "0 0 12px" },
  p: { fontSize: 14.5, lineHeight: 1.75, color: "var(--text-secondary)", margin: "0 0 10px" },
  card: { background: "var(--bg-card)", border: "1px solid var(--border-light)", borderRadius: 18, padding: "24px 26px", marginTop: 18, boxShadow: "0 2px 14px rgba(28,25,23,.05)" },
  li: { fontSize: 14.5, lineHeight: 1.7, color: "var(--text-secondary)", marginBottom: 8 },
  strong: { color: "var(--text-primary)", fontWeight: 600 },
  code: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12.5, background: "var(--surface)", borderRadius: 6, padding: "1px 6px" },
} satisfies Record<string, CSSProperties>;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section style={s.card}><h2 style={s.h2}>{title}</h2>{children}</section>;
}

function B({ children }: { children: ReactNode }) {
  return <strong style={s.strong}>{children}</strong>;
}

function List({ items }: { items: ReactNode[] }) {
  return <ul style={{ margin: "4px 0 0", paddingLeft: 20, listStyle: "disc" }}>{items.map((it, i) => <li key={i} style={s.li}>{it}</li>)}</ul>;
}

const terceros: { servicio: string; cuando: string; datos: string }[] = [
  {
    servicio: "Google Gemini (asistente de IA)",
    cuando: "Solo cuando el profesional escribe en el asistente.",
    datos: "Nombre, diagnóstico, estado y notas de cada paciente; citas de los próximos 7 días; los primeros 300 caracteres de las notas de sesión de las últimas 2 semanas; resultados de tests recientes.",
  },
  {
    servicio: "Resend (correo)",
    cuando: "Al enviar un cuestionario o al crear, cambiar o cancelar una cita.",
    datos: "Email y nombre del paciente, fecha, hora y modalidad de la cita, y el enlace del cuestionario.",
  },
  {
    servicio: "Google Calendar (opcional)",
    cuando: "Solo si el profesional conecta su calendario.",
    datos: "Un evento en el calendario del propio profesional con el nombre del paciente, la modalidad y la nota de la cita.",
  },
];

export default function SeguridadPage() {
  return (
    <main style={s.page}>
      <div style={s.wrap}>
        <Link href="/login" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>← PsyDesk</Link>

        <h1 style={s.h1}>Cómo protege PsyDesk los datos clínicos</h1>
        <p style={s.lead}>
          PsyDesk guarda información muy sensible: expedientes, notas de sesión y resultados de tests.
          Esta página explica, sin letra pequeña, dónde está esa información, quién puede verla,
          qué sale hacia otros servicios y cómo se borra. Todo lo que dice aquí está comprobado contra
          el código y la base de datos de la aplicación.
        </p>

        <Section title="Dónde están los datos">
          <p style={s.p}>
            La base de datos y los archivos están en <B>Supabase</B> (PostgreSQL), en la región
            {" "}<B><span style={{ whiteSpace: "nowrap" }}>us-east-1</span></B> (Virginia del Norte, Estados Unidos). La aplicación se sirve desde <B>Vercel</B>.
          </p>
          <List items={[
            <>Los datos se guardan <B>cifrados en disco con AES-256</B> y viajan siempre por <B>HTTPS (TLS)</B>.</>,
            <>Los archivos de los expedientes (PDF, imágenes, informes) están en un <B>almacenamiento privado</B>: no tienen dirección pública y solo se abren con enlaces temporales que caducan a los 60–120 segundos.</>,
            <>La foto de perfil del profesional es lo único público, porque se muestra en la interfaz.</>,
          ]} />
        </Section>

        <Section title="Quién puede verlos">
          <p style={s.p}>
            <B>Solo el profesional dueño de la cuenta.</B> No hay usuarios compartidos ni administradores con acceso a los expedientes desde la aplicación.
          </p>
          <List items={[
            <><B>Seguridad a nivel de fila (RLS)</B> activa en las 15 tablas: la propia base de datos rechaza cualquier consulta a una fila que no pertenezca al profesional que ha iniciado sesión (<code style={s.code}>psychologist_id = auth.uid()</code>), aunque alguien manipule la aplicación.</>,
            <>Los visitantes sin sesión <B>no tienen acceso a ninguna tabla clínica</B>.</>,
            <>Los archivos se guardan en una carpeta por profesional, y el almacenamiento solo permite leer, subir o borrar dentro de la propia carpeta.</>,
            <>Las operaciones del servidor (asistente, correos, citas) toman la identidad de la <B>sesión</B>, nunca de lo que envía el navegador. La clave con permisos totales de la base de datos solo existe en el servidor.</>,
          ]} />
        </Section>

        <Section title="Pacientes y cuestionarios">
          <p style={s.p}>
            Los pacientes no tienen cuenta. Cuando el profesional les envía un cuestionario, reciben un enlace con un
            {" "}<B>identificador aleatorio</B> e imposible de adivinar.
          </p>
          <List items={[
            <>Con ese enlace solo se ve <B>ese cuestionario</B>: ni el expediente, ni otros tests, ni datos del profesional.</>,
            <>Se puede responder <B>una sola vez</B>. Después el enlace deja de aceptar respuestas.</>,
            <>El puntaje se calcula en el servidor, así que el paciente no puede alterarlo.</>,
          ]} />
        </Section>

        <Section title="Qué se comparte con otros servicios">
          <p style={s.p}>PsyDesk no vende ni comparte datos con fines publicitarios. Solo tres servicios reciben información, y solo para hacer su función:</p>
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            {terceros.map(t => (
              <div key={t.servicio} style={{ background: "var(--bg-primary)", border: "1px solid var(--border-light)", borderRadius: 12, padding: "14px 16px" }}>
                <p style={{ ...s.p, margin: 0, color: "var(--text-primary)", fontWeight: 600 }}>{t.servicio}</p>
                <p style={{ ...s.p, margin: "2px 0 6px", fontSize: 13 }}>{t.cuando}</p>
                <p style={{ ...s.p, margin: 0, fontSize: 13.5 }}>{t.datos}</p>
              </div>
            ))}
          </div>
          <p style={{ ...s.p, marginTop: 12 }}>
            El asistente es una ayuda para organizar el trabajo, no un diagnóstico: sus respuestas siempre deben revisarse con criterio profesional.
          </p>
        </Section>

        <Section title="Cómo se borran">
          <List items={[
            <>Al <B>eliminar un paciente</B> se borran su expediente, historia clínica, notas de sesión, tests, citas y archivos adjuntos (incluidos los archivos del almacenamiento).</>,
            <>Al <B>dar de baja la cuenta</B> de un profesional, la base de datos elimina en cascada todo lo que le pertenece.</>,
            <>Los eventos que ya se crearon en Google Calendar viven en el calendario del profesional y se gestionan desde allí.</>,
          ]} />
        </Section>

        <Section title="Inicio de sesión">
          <List items={[
            <>La autenticación la gestiona <B>Supabase Auth</B>: las contraseñas nunca se guardan en texto, solo su hash. También se puede entrar con Google.</>,
            <>Recuperación de contraseña por email con enlace de un solo uso.</>,
            <>La sección de sesiones activas registra dispositivo, navegador y sistema operativo, sin guardar la dirección IP.</>,
          ]} />
        </Section>

        <Section title="Para quien opere PsyDesk con pacientes reales">
          <p style={s.p}>La aplicación está preparada, pero algunas garantías dependen de la configuración y los planes contratados. Antes de usarla con pacientes reales:</p>
          <List items={[
            <><B>Usar una clave de Gemini con facturación activa.</B> En el plan gratuito, Google puede usar lo que se envía para mejorar sus productos y personas pueden revisarlo; en el plan de pago no lo usa para eso.</>,
            <><B>Contratar un plan de pago de Supabase</B> para tener copias de seguridad diarias (el plan gratuito no las incluye). Si se necesita cumplir HIPAA, Supabase ofrece un acuerdo BAA en sus planes Team y Enterprise.</>,
            <><B>Configurar un dominio propio en Resend</B> para que los correos a pacientes salgan desde la dirección de la consulta.</>,
            <>Los permisos de Google Calendar se guardan en la base de datos protegidos por RLS. Si se quiere una capa extra, se pueden cifrar a nivel de columna.</>,
            <>La <B>política de privacidad y el consentimiento informado</B> los redacta quien ofrece el servicio, según la ley de su país, porque es quien trata los datos de los pacientes.</>,
          ]} />
        </Section>

        <Section title="La demo">
          <p style={{ ...s.p, margin: 0 }}>
            La cuenta de demostración usa <B>solo datos ficticios</B>, se regenera cada noche, no envía correos, no se conecta a servicios externos y tiene un límite de uso del asistente.
          </p>
        </Section>

        <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 28, textAlign: "center" }}>
          Última revisión: {REVISADO}
        </p>
      </div>
    </main>
  );
}
