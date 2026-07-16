# Mi Aventura 🛡️

**App en vivo: https://brancaycoca.github.io/mi-habitica/**
(en el iPhone: abrila en Safari → Compartir → *Agregar a inicio*)

Tu gestor personal de hábitos, tareas y metas gamificado, inspirado en Habitica.
Funciona **sin internet ni cuenta** (guarda todo en tu dispositivo), y opcionalmente
puede **sincronizarse entre iPhone y Mac** con Supabase (ver más abajo).

## Publicar cambios

El repo local (`/Users/sirch/Claudio`) es la fuente de verdad. Para publicar:
`git push` — GitHub Pages reconstruye solo en ~1 minuto.
Al cambiar `app.js` o `styles.css`, subir el `?v=N` en `index.html` y el `CACHE` de `sw.js`.

## Cómo funciona el juego

- **Hábitos**: recurrentes, programados por día de la semana. Completarlos da XP, monedas y suma racha. Si no completas un hábito en un día programado, **pierdes vida (HP)**.
- **Exigencia flexible**: un hábito puede marcarse como "flexible" (ej. gimnasio "3-5 veces por semana, el día que puedas"): faltar un día no quita vida; solo mandan sus metas semanales/mensuales. Si no llegas al mínimo semanal, multa y se rompe la racha.
- **Multiplicador de racha**: cada 7 días seguidos de racha el hábito paga +10% más monedas (tope +50%). Romper la racha vuelve a ×1.
- **Logros**: 18 insignias (rachas, horas, niveles, premios…) que pagan XP y monedas al desbloquearse. Se ven en el Perfil.
- **Modo descanso**: en el Perfil puedes comprar días de vacaciones (15 monedas/día o 4 HP/día): sin daño, sin multas y las rachas se congelan. Completar hábitos paga igual.
- **Hoy te falta**: banner arriba de Hábitos con lo pendiente del día; para hábitos por tiempo calcula si vas al ritmo de tu meta semanal.
- **Mapa de constancia**: heatmap tipo GitHub de las últimas 17 semanas en el Perfil.
- **Jefes**: convierte un examen o desafío en un monstruo con vida (pestaña Metas). El XP que ganas con los hábitos vinculados le hace daño; al derrotarlo cobras su botín. Editable: vida, botín y qué hábitos le pegan.
- **Materias / cursadas**: un hábito puede tener fecha de inicio y fin (ej. "Clase de Cálculo", L y X, del 13 jul al 27 nov). Fuera de esas fechas duerme: no aparece como pendiente, no castiga ni cobra multas.
- **Registrar días pasados**: cubre toda la semana en curso (del lunes a ayer). En hábitos por tiempo, el selector de día del modal ofrece cada día de la semana; en hábitos de completar (gimnasio, clases), el botón de historial abre "Registrar días pasados", donde **marcas varios días a la vez** (ej. fui al gimnasio lun/mar/mié/jue y lo cargo el viernes). Recuperas la vida que el cron te quitó y suma a tu meta semanal. No se tocan semanas ya cerradas.
- **Revisión semanal**: cada lunes, mini-reporte automático comparando la semana cerrada con la anterior (horas/días por hábito y XP). También disponible en Perfil → Revisión semanal.
- **Pago por hábito**: cada hábito tiene su propio pago en monedas, editable desde el lápiz del hábito. Hay dos tipos de pago:
  - **Al completar**: paga un monto fijo al marcarlo (ej. ir al gimnasio paga 12).
  - **Por tiempo**: registras los minutos que le dedicaste (botón de reloj, varias sesiones al día) y paga proporcional a una tarifa por hora (ej. estudiar a 10/h → 30 min pagan 5). Desde el mismo botón puedes deshacer el último registro.
- **Tareas**: pendientes de una sola vez, con fecha límite opcional.
- **Metas**: objetivos grandes divididos en hitos. Cada hito da XP; completar la meta entera da un bonus grande (+100 XP, +50 monedas).
- **Tienda**: crea tus propias recompensas reales ("1 hora de videojuegos", "pedir comida") y cómpralas con las monedas que ganes.
- **Nivel y vida**: al subir de nivel tu vida se restaura. Si tu vida llega a 0, pierdes un nivel y tus monedas.
- **Dificultad**: los hábitos y tareas difíciles dan más XP y monedas (Fácil ×1, Normal ×1.5, Difícil ×2).

## La economía (calibrada para el cuatrimestre 2026)

Una semana "normal" paga **~160-200 monedas**:

| Hábito | Objetivo | Pago | Semana normal |
|---|---|---|---|
| Estudiar (L-V) | 1-2 h/día · mín 30 min · meta semanal 7,5 h / mín 2,5 h | 10/h | ~75 |
| Meditar (diario) | 10 min/día · mín 5 · meta semanal 70 min / mín 35 | 18/h | ~21 |
| Gimnasio (flexible) | mín 3/semana (multa) · 5 = excelente (premio) | 12/visita | ~48 |
| Clases ×4 (L,M,X,V) | asistencia mensual: 4 = premio · mín 3 (75%) o multa fuerte | 10/clase | ~40 |

Los precios de la tienda están pensados contra ese ingreso: chocolate 25, 1 partida con team 25,
1 partida solo 50, series 50, salida con amigos 80, **fiesta 150**, capricho 200.
La fiesta cuesta casi una semana entera de esfuerzo: si hubo buena semana, hay fiesta.

Las 4 materias vienen precargadas con sus fechas reales de cursada (agosto-diciembre 2026)
y sus metas: **Regularizar** (2 parciales) y **Aprobar el final** de cada una.

## Cómo usarla

### En tu Mac

```bash
cd /Users/sirch/Claudio
python3 -m http.server 8642
```

Luego abre <http://localhost:8642> en tu navegador.

### En tu iPhone (misma red Wi-Fi)

1. En tu Mac, ejecuta el servidor con `--bind 0.0.0.0`:
   ```bash
   python3 -m http.server 8642 --bind 0.0.0.0
   ```
2. Averigua la IP de tu Mac: **Ajustes del Sistema → Wi-Fi → Detalles**.
3. En Safari del iPhone abre `http://<ip-de-tu-mac>:8642`.
4. Toca **Compartir → Añadir a pantalla de inicio** para instalarla como app.

> 💡 Para usarla en el iPhone sin depender de tu Mac, puedes subir esta carpeta
> a un hosting estático gratuito (GitHub Pages, Netlify, Vercel). Al estar en
> HTTPS, el modo sin conexión (service worker) también funcionará en el iPhone.

## Tus datos

- Se guardan en `localStorage` bajo la clave `mi-aventura-v1`, en el navegador donde uses la app.
- Desde **Perfil → Exportar mis datos** puedes descargar una copia JSON e importarla en otro dispositivo.
- Con la **sincronización** activada (ver abajo), los datos viven además en la nube y se comparten entre dispositivos automáticamente.

## Sincronización entre iPhone y Mac (Supabase, gratis)

Con esto, cargás algo en el iPhone y lo ves en la Mac (y viceversa). Configuración por única vez:

1. Entrá a [supabase.com](https://supabase.com) → **Start your project** → creá una cuenta y un proyecto (plan gratis). Elegí cualquier región cercana y una contraseña de base de datos.
2. En el proyecto, abrí **SQL Editor** → **New query**, pegá esto y dale **Run**:

   ```sql
   create table mi_aventura (
     code text primary key,
     state jsonb,
     rev bigint default 0,
     updated_at timestamptz default now()
   );
   alter table mi_aventura enable row level security;
   create policy "acceso por codigo" on mi_aventura
     for all to anon using (true) with check (true);
   ```

3. Andá a **Project Settings → API** y copiá dos cosas:
   - **Project URL** (algo como `https://xxxx.supabase.co`).
   - **Project API keys → anon public** (una clave larga que empieza con `eyJ...`).
4. En la app: **Perfil → Sincronización**, pegá la URL y la clave, e inventá un **código de sincronización** difícil de adivinar (ej. `toto-2026-9f3k`). Guardá.
5. En tu **otro dispositivo**, abrí la app y en Sincronización pegá **la misma URL, la misma clave y el mismo código**. Listo: comparten datos.

Notas:
- Ante un conflicto gana la última edición (por marca de tiempo). Como sos un solo usuario en dos dispositivos, en la práctica no hay conflictos.
- La `anon key` es pública por diseño; tu privacidad depende de que el **código de sincronización** sea secreto. Son datos de hábitos, de bajo riesgo, pero no lo compartas.
- Si no configurás nada, la app sigue funcionando 100% local.

## Publicar en la web e instalar en el iPhone (GitHub Pages)

1. Creá una cuenta en [github.com](https://github.com) si no tenés, y creá un repositorio nuevo (ej. `mi-aventura`), público.
2. Subí el contenido de esta carpeta al repo. Desde la terminal, en `/Users/sirch/Claudio`:

   ```sh
   git remote add origin https://github.com/TU_USUARIO/mi-aventura.git
   git branch -M main
   git push -u origin main
   ```

3. En GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, rama `main`, carpeta `/ (root)`. Guardá.
4. En 1–2 minutos queda publicada en `https://TU_USUARIO.github.io/mi-aventura/`.
5. En el iPhone, abrí esa URL en **Safari** → botón Compartir → **Agregar a inicio**. Queda como una app con su ícono. (Repetí el paso de Sincronización ahí.)

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | Estructura de la app |
| `styles.css` | Tema visual (dark minimal sobrio) |
| `app.js` | Lógica del juego y de la interfaz |
| `sw.js` + `manifest.webmanifest` | Soporte PWA (instalable y offline) |
| `icons/` | Iconos de la app |
