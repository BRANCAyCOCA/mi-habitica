# Mi Aventura 🛡️

Tu gestor personal de hábitos, tareas y metas gamificado, inspirado en Habitica.
Todo se guarda **localmente en tu dispositivo** (no necesita internet ni cuenta).

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
- **Registrar días pasados**: hasta 2 días atrás. En hábitos por tiempo, el selector "Hoy/Ayer/Anteayer" del modal; en hábitos de completar, el botón de reloj-histórico que aparece cuando quedó un día sin marcar. Recuperas la vida que el cron te quitó ese día y la racha se recalcula.
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

- Se guardan en `localStorage` bajo la clave `mi-aventura-v1`, solo en el navegador donde uses la app.
- Desde **Perfil → Exportar mis datos** puedes descargar una copia JSON, e importarla en otro dispositivo.
- **Importante**: los datos no se sincronizan solos entre iPhone y Mac; usa exportar/importar para moverlos.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | Estructura de la app |
| `styles.css` | Tema visual (dark minimal sobrio) |
| `app.js` | Lógica del juego y de la interfaz |
| `sw.js` + `manifest.webmanifest` | Soporte PWA (instalable y offline) |
| `icons/` | Iconos de la app |
